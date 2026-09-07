#!/usr/bin/env python3
"""各ハーネスのセッションログから所要時間・トークン数・tps を集めて env.yml の stats: に書く。

使い方:
    python3 collect_stats.py            # 全 run
    python3 collect_stats.py DIR ...    # 指定した run だけ
    python3 collect_stats.py -n         # 書き込まずに表示だけ

対応ログ:
    pi-agent    ~/.pi/agent/sessions/*/*.jsonl      (先頭行の cwd で run を特定)
    claude-code ~/.claude/projects/*/*.jsonl         (各行の cwd で run を特定)
    codex       ~/.codex/sessions/**/*.jsonl         (session_meta の cwd で run を特定)

run の特定は cwd の basename が run ディレクトリ名 (例 qwen38-202609022255) か、
そのタイムスタンプを除いた名前 (qwen38) に一致するもの。同じ run に複数セッションが
あるのは途中で止めてやり直した場合なので、最後 (開始が最も遅い) のセッションだけを
採用し、sessions に試行回数を記録する。

stats の意味:
    time           所要時間 (秒)。最初の依頼から最後の応答まで
    gen_time       生成時間の合計 (秒)。下の tps の分母
    turns          モデルの応答回数
    output_tokens  生成トークン数の合計 (思考トークンを含む)
    tps            output_tokens / 生成時間。生成時間は応答ごとの「直前のイベントから応答完了まで」の合計。
                   codex は応答単位の時刻が無いので token_count イベント間隔で代用 (ツール実行時間を含む)
    sessions       試行回数 (このディレクトリで見つかったセッション数)
"""
import glob
import json
import os
import re
import sys
from datetime import datetime

HOME = os.path.expanduser("~")


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def run_key(d):
    return d.split("-2026")[0]


def match_run(cwd, runs):
    b = os.path.basename(cwd.rstrip("/"))
    for d in runs:
        if b == d or b == run_key(d):
            return d
    return None


# --- 各ハーネスのパーサ。(start_ts, time, turns, output_tokens, gen_seconds) を返す -------------------------

def parse_pi(path):
    first = last = None
    prev = None
    turns = out = 0
    gen = 0.0
    for line in open(path, encoding="utf-8"):
        d = json.loads(line)
        if d.get("type") != "message":
            continue
        t = ts(d["timestamp"])
        m = d["message"]
        if m.get("role") == "user" and first is None:
            first = t
        if m.get("role") == "assistant":
            u = m.get("usage") or {}
            o = (u.get("output") or 0)
            if o:
                turns += 1
                out += o
                if prev is not None:
                    gen += t - prev
            last = t
        prev = t
    time = (last - first) if first is not None and last is not None else 0
    return first, time, turns, out, gen


def parse_claude(path):
    first = last = None
    prev = None
    msgs = {}  # id -> [output, start_prev_ts, end_ts]
    order = []
    for line in open(path, encoding="utf-8"):
        d = json.loads(line)
        if d.get("type") not in ("user", "assistant") or "timestamp" not in d:
            continue
        t = ts(d["timestamp"])
        if d["type"] == "user" and first is None:
            first = t
        if d["type"] == "assistant":
            m = d.get("message") or {}
            u = m.get("usage") or {}
            o = u.get("output_tokens") or 0
            mid = m.get("id")
            if mid not in msgs:
                msgs[mid] = [o, prev, t]
                order.append(mid)
            else:
                msgs[mid][0] = max(msgs[mid][0], o)
                msgs[mid][2] = t
            last = t
            if mid in msgs:
                prev = t
                continue
        prev = t
    turns = out = 0
    gen = 0.0
    for mid in order:
        o, p, e = msgs[mid]
        if not o:
            continue
        turns += 1
        out += o
        if p is not None:
            gen += e - p
    time = (last - first) if first is not None and last is not None else 0
    return first, time, turns, out, gen


def parse_codex(path):
    time = gen = 0.0
    turns = out = 0
    started = first = None
    prev = None
    for line in open(path, encoding="utf-8"):
        d = json.loads(line)
        if d.get("type") != "event_msg":
            continue
        p = d.get("payload") or {}
        t = ts(d["timestamp"])
        k = p.get("type")
        if k == "task_started":
            started = t
            prev = t
            first = first if first is not None else t
        elif k == "task_complete" and started is not None:
            time += t - started
            started = None
        elif k == "token_count":
            lu = (p.get("info") or {}).get("last_token_usage") or {}
            o = lu.get("output_tokens") or 0
            if o:
                turns += 1
                out += o
                if prev is not None:
                    gen += t - prev
            prev = t
    return first, time, turns, out, gen


# --- ログの列挙 -----------------------------------------------------------------------------------

def find_sessions(runs):
    found = {d: [] for d in runs}
    for f in glob.glob(f"{HOME}/.pi/agent/sessions/*/*.jsonl"):
        with open(f, encoding="utf-8") as fh:
            head = json.loads(fh.readline() or "{}")
        d = match_run(head.get("cwd", ""), runs)
        if d:
            found[d].append(("pi", f))
    for f in glob.glob(f"{HOME}/.claude/projects/*/*.jsonl"):
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                m = re.search(r'"cwd":"([^"]*)"', line)
                if m:
                    d = match_run(m.group(1), runs)
                    if d:
                        found[d].append(("claude", f))
                    break
    for f in glob.glob(f"{HOME}/.codex/sessions/**/*.jsonl", recursive=True):
        with open(f, encoding="utf-8") as fh:
            head = json.loads(fh.readline() or "{}")
        d = match_run((head.get("payload") or {}).get("cwd", ""), runs)
        if d:
            found[d].append(("codex", f))
    return found


PARSERS = {"pi": parse_pi, "claude": parse_claude, "codex": parse_codex}


def collect(run, sessions):
    """最後に開始したセッションの値を返す。開始が同じ (claude-code の再開で複製されたログ) なら長い方。"""
    time = gen = 0.0
    turns = out = 0
    latest = None
    for kind, f in sessions:
        start, t, n, o, g = PARSERS[kind](f)
        if start is None:
            continue
        if latest is None or (start, t) > latest:
            latest, time, turns, out, gen = (start, t), t, n, o, g
    tps = round(out / gen) if gen > 0 else None
    return {"time": round(time), "gen_time": round(gen), "turns": turns, "output_tokens": out, "tps": tps, "sessions": len(sessions)}


def fmt_time(sec):
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h}h{m:02d}m" if h else f"{m}m{s:02d}s"


def write_stats(env_path, st):
    text = open(env_path, encoding="utf-8").read()
    block = (
        "stats:               # collect_stats.py が書く (セッションログから集計)\n"
        f"  time: {st['time']}          # 所要時間 (秒) = {fmt_time(st['time'])}\n"
        f"  gen_time: {st['gen_time']}      # 生成時間 (秒) = {fmt_time(st['gen_time'])}\n"
        f"  turns: {st['turns']}\n"
        f"  output_tokens: {st['output_tokens']}\n"
        f"  tps: {st['tps'] if st['tps'] is not None else ''}\n"
        f"  sessions: {st['sessions']}\n"
    )
    # 既存の stats: ブロック (インデント付き行が続く範囲) を置き換え、無ければ末尾に足す
    m = re.search(r"^stats:.*\n(?:[ \t]+.*\n?)*", text, re.M)
    if m:
        text = text[: m.start()] + block + text[m.end():]
    else:
        text = text.rstrip("\n") + "\n" + block
    open(env_path, "w", encoding="utf-8").write(text)


def main(argv):
    dry = "-n" in argv
    args = [a for a in argv if a != "-n"]
    root = os.path.dirname(os.path.abspath(__file__))
    runs = [d for d in sorted(os.listdir(root)) if re.search(r"-\d{12}$", d) and os.path.isdir(os.path.join(root, d))]
    targets = [a.rstrip("/") for a in args] or runs
    found = find_sessions(runs)
    print(f"{'run':32} {'time':>8} {'gen':>8} {'turns':>5} {'out_tok':>8} {'tps':>5} sess")
    for d in targets:
        st = collect(d, found.get(d, []))
        print(f"{d:32} {fmt_time(st['time']):>8} {fmt_time(st['gen_time']):>8} {st['turns']:>5} {st['output_tokens']:>8} {st['tps'] if st['tps'] is not None else '-':>5} {st['sessions']}")
        env_path = os.path.join(root, d, "env.yml")
        if not dry and os.path.isfile(env_path) and st["sessions"]:
            write_stats(env_path, st)


if __name__ == "__main__":
    main(sys.argv[1:])

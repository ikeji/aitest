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
    opencode    ~/.local/share/opencode/opencode.db  (session_v2.directory で run を特定)
    hermes      ~/.hermes/state.db                   (sessions.cwd で run を特定)

run の特定は cwd の basename が run ディレクトリ名 (例 qwen38-202609022255) か、
そのタイムスタンプを除いた名前 (qwen38)、または同じタイムスタンプ (-202609022255) で
終わる名前 (実行後にリネームした場合) に一致するもの。同じ run に複数セッションが
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
TIME_WINDOW = 15 * 60  # 秒。時刻ベースの照合で許す前後の幅


def ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def run_key(d):
    return d.split("-2026")[0]


def match_run(cwd, runs):
    b = os.path.basename(cwd.rstrip("/"))
    for d in runs:
        if b == d or b == run_key(d):
            return d
    m = re.search(r"-(\d{12})$", b)
    if m:
        for d in runs:
            if d.endswith("-" + m.group(1)):
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


def parse_opencode(path):
    """path は "opencode.db::<session_id>"。"""
    import sqlite3
    db, sid = path.split("::", 1)
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    row = c.execute("select tokens_output, tokens_reasoning from session_v2 where id=?", (sid,)).fetchone()
    out = (row[0] or 0) + (row[1] or 0) if row else 0
    first = last = prev = None
    turns = 0
    gen = 0.0
    for (typ, data) in c.execute("select type, data from session_message where session_id=? order by seq", (sid,)):
        d = json.loads(data or "{}")
        t = d.get("time") or {}
        created = t.get("created")
        if created is None:
            continue
        created /= 1000
        if typ == "user":
            first = first if first is not None else created
            prev = created
        elif typ == "assistant":
            done = (t.get("completed") or t.get("streamed") or created) / 1000
            turns += 1
            if prev is not None:
                gen += done - prev
            last = done
            prev = done
    time = (last - first) if first is not None and last is not None else 0
    return first, time, turns, out, gen


def parse_hermes(path):
    """path は "state.db::<session_id>" (Hermes Agent)。"""
    import sqlite3
    db, sid = path.split("::", 1)
    c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    row = c.execute("select output_tokens from sessions where id=?", (sid,)).fetchone()
    out = (row[0] or 0) if row else 0
    first = last = prev = None
    turns = 0
    gen = 0.0
    for role, t in c.execute("select role, timestamp from messages where session_id=? order by id", (sid,)):
        if role == "user" and first is None:
            first = t
        if role == "assistant":
            turns += 1
            if prev is not None:
                gen += t - prev
            last = t
        prev = t
    time = (last - first) if first is not None and last is not None else 0
    return first, time, turns, out, gen


# --- 最初の依頼文 (時刻ベース照合の確認用) ----------------------------------------------------

def _text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(x.get("text", "") for x in content if isinstance(x, dict))
    return ""


def first_prompt(kind, path):
    try:
        if kind == "pi":
            for line in open(path, encoding="utf-8"):
                d = json.loads(line)
                if d.get("type") == "message" and d["message"].get("role") == "user":
                    return _text(d["message"].get("content"))
        elif kind == "claude":
            for line in open(path, encoding="utf-8"):
                d = json.loads(line)
                if d.get("type") == "user" and not d.get("isSidechain"):
                    t = _text((d.get("message") or {}).get("content"))
                    if t and not t.startswith("<"):
                        return t
        elif kind == "codex":
            for line in open(path, encoding="utf-8"):
                d = json.loads(line)
                p = d.get("payload") or {}
                if d.get("type") == "event_msg" and p.get("type") == "user_message":
                    return p.get("message", "")
        elif kind == "opencode":
            import sqlite3
            db, sid = path.split("::", 1)
            c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
            for (data,) in c.execute("select data from session_message where session_id=? and type='user' order by seq limit 1", (sid,)):
                return json.loads(data or "{}").get("text", "")
        elif kind == "hermes":
            import sqlite3
            db, sid = path.split("::", 1)
            c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
            for (content,) in c.execute("select content from messages where session_id=? and role='user' order by id limit 1", (sid,)):
                return content or ""
    except Exception:
        pass
    return ""


def session_model(kind, path):
    """セッションで使ったモデル ID (分からなければ "")。"""
    try:
        if kind == "pi":
            model = ""
            for line in open(path, encoding="utf-8"):
                d = json.loads(line)
                if d.get("type") == "model_change":
                    model = d.get("modelId") or model
                elif d.get("type") == "message" and d["message"].get("role") == "assistant":
                    model = d["message"].get("model") or model
                    break
            return model
        if kind == "claude":
            for line in open(path, encoding="utf-8"):
                d = json.loads(line)
                if d.get("type") == "assistant":
                    m = (d.get("message") or {}).get("model")
                    if m:
                        return m
        elif kind == "codex":
            for line in open(path, encoding="utf-8"):
                m = re.search(r'"model":"([^"]+)"', line)
                if m:
                    return m.group(1)
        elif kind == "opencode":
            import sqlite3
            db, sid = path.split("::", 1)
            c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
            row = c.execute("select model from session_v2 where id=?", (sid,)).fetchone()
            if row and row[0]:
                return json.loads(row[0]).get("id", "")
        elif kind == "hermes":
            import sqlite3
            db, sid = path.split("::", 1)
            c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
            row = c.execute("select model from sessions where id=?", (sid,)).fetchone()
            return (row[0] or "") if row else ""
    except Exception:
        pass
    return ""


def closed_at(kind, f):
    """セッションを閉じた時刻 (記録があるハーネスのみ)。run ディレクトリ名の時刻は終了時に付けるので照合窓に使う。"""
    if kind == "hermes":
        import sqlite3
        db, sid = f.split("::", 1)
        c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        row = c.execute("select ended_at from sessions where id=?", (sid,)).fetchone()
        return row[0] if row else None
    return None


def _norm(x):
    return re.sub(r"[^a-z0-9]", "", x.lower())


def model_matches(run, model):
    """run ディレクトリ名の先頭 (qwen38flashnext) がモデル ID (Qwen3.8-Flash-Next) に含まれるか。"""
    k, m = _norm(run_key(run)), _norm(model)
    return bool(k and m) and (k in m or m in k)


def dir_time(run):
    m = re.search(r"-(\d{12})$", run)
    return datetime.strptime(m.group(1), "%Y%m%d%H%M").timestamp() if m else None


# --- ログの列挙 -----------------------------------------------------------------------------------

def find_sessions(runs):
    found = {d: [] for d in runs}
    unmatched = []  # 名前で run に紐付かなかったセッション (時刻ベース照合の候補)

    def note(kind, f, d):
        if d:
            found[d].append((kind, f))
        else:
            unmatched.append((kind, f))
    for f in glob.glob(f"{HOME}/.pi/agent/sessions/*/*.jsonl"):
        with open(f, encoding="utf-8") as fh:
            head = json.loads(fh.readline() or "{}")
        note("pi", f, match_run(head.get("cwd", ""), runs))
    for f in glob.glob(f"{HOME}/.claude/projects/*/*.jsonl"):
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                m = re.search(r'"cwd":"([^"]*)"', line)
                if m:
                    note("claude", f, match_run(m.group(1), runs))
                    break
    for f in glob.glob(f"{HOME}/.codex/sessions/**/*.jsonl", recursive=True):
        with open(f, encoding="utf-8") as fh:
            head = json.loads(fh.readline() or "{}")
        note("codex", f, match_run((head.get("payload") or {}).get("cwd", ""), runs))
    db = f"{HOME}/.local/share/opencode/opencode.db"
    if os.path.isfile(db):
        import sqlite3
        c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        for sid, directory in c.execute("select id, directory from session_v2 where parent_id is null"):
            note("opencode", f"{db}::{sid}", match_run(directory or "", runs))
    db = f"{HOME}/.hermes/state.db"
    if os.path.isfile(db):
        import sqlite3
        c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        for sid, cwd in c.execute("select id, cwd from sessions where parent_session_id is null"):
            note("hermes", f"{db}::{sid}", match_run(cwd or "", runs))
    # 時刻ベースの照合 (名前で見つからなかった run だけ)
    cands = []
    for kind, f in unmatched:
        try:
            start, t, n, o, g = PARSERS[kind](f)
        except Exception:
            continue
        if start is None or not o:
            continue
        cands.append((start, max(start + t, closed_at(kind, f) or 0), kind, f))
    # run ごとの候補を集め、(距離, run, セッション) を全体で距離の小さい順に割り当てる
    # (同じモデルを続けて回した場合に、隣の run のセッションを取り合わないように)
    pairs = []
    for d in runs:
        if found[d]:
            continue
        ts = dir_time(d)
        if ts is None:
            continue
        hits = [(st, en, kind, f) for st, en, kind, f in cands
                if st - TIME_WINDOW <= ts <= en + TIME_WINDOW and "IDEA" in first_prompt(kind, f)]
        by_model = [h for h in hits if model_matches(d, session_model(h[2], h[3]))]
        if by_model:
            hits = by_model
        elif len(hits) > 1:
            print(f"!! {d}: 時刻の合うセッションが複数あり、モデル名でも絞れないので未照合: "
                  + ", ".join(f"{session_model(k, f) or k}@{datetime.fromtimestamp(st):%H:%M}" for st, _, k, f in hits), file=sys.stderr)
            continue
        for st, en, kind, f in hits:
            pairs.append((min(abs(st - ts), abs(en - ts)), d, st, en, kind, f))
    used = set()
    for _, d, st, en, kind, f in sorted(pairs):
        if found[d] or f in used:
            continue
        found[d].append((kind, f))
        used.add(f)
        print(f"   {d}: 時刻で照合 -> {kind} {session_model(kind, f)} {datetime.fromtimestamp(st):%m-%d %H:%M}〜{datetime.fromtimestamp(en):%H:%M}", file=sys.stderr)
    return found


PARSERS = {"pi": parse_pi, "claude": parse_claude, "codex": parse_codex, "opencode": parse_opencode, "hermes": parse_hermes}


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

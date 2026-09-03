#!/usr/bin/env python3
"""各サブディレクトリの env.yml を集計して index.html を生成する。

使い方:
    python3 build_index.py            # ./index.html を生成
    python3 build_index.py -o out.html

env.yml の例:
    model: claude-opus-5
    model_file:            # ローカルモデルのファイル/タグ
    provider: anthropic
    harness: claude-code
    date: "2026-09-02 22:18"
    notes: ""

PyYAML があればそれを使い、無ければ内蔵の簡易パーサ (key: value と - リスト) で読む。
"""
import argparse
import html
import os
import re
import sys
from datetime import datetime

COLUMNS = [
    ("model", "model"),
    ("provider", "provider"),
    ("harness", "harness"),
    ("date", "date"),
    ("size", "index.html"),
    ("notes", "notes"),
]


# ---------- YAML 読み込み ----------
def _strip_comment(line):
    out, quote = [], None
    for ch in line:
        if quote:
            out.append(ch)
            if ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
            out.append(ch)
        elif ch == "#" and (not out or out[-1].isspace()):
            break
        else:
            out.append(ch)
    return "".join(out).rstrip()


def _scalar(s):
    s = s.strip()
    if not s or s in ("~", "null", "Null", "NULL"):
        return None
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return s[1:-1]
    if s in ("true", "True"):
        return True
    if s in ("false", "False"):
        return False
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d+\.\d+", s):
        return float(s)
    return s


def _simple_yaml(text):
    data, cur_key = {}, None
    for raw in text.splitlines():
        line = _strip_comment(raw)
        if not line.strip():
            continue
        if line.lstrip().startswith("- ") and cur_key is not None:
            data.setdefault(cur_key, [])
            if not isinstance(data[cur_key], list):
                data[cur_key] = []
            data[cur_key].append(_scalar(line.lstrip()[2:]))
            continue
        m = re.match(r"^([A-Za-z0-9_\-./]+)\s*:\s*(.*)$", line)
        if not m:
            continue
        cur_key = m.group(1)
        data[cur_key] = _scalar(m.group(2))
    return data


def load_yaml(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    try:
        import yaml  # type: ignore
        return yaml.safe_load(text) or {}
    except ImportError:
        return _simple_yaml(text)


# ---------- 収集 ----------
def collect(root):
    rows = []
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if not os.path.isdir(d) or name.startswith("."):
            continue
        env_path = os.path.join(d, "env.yml")
        has_env = os.path.isfile(env_path)
        env = load_yaml(env_path) if has_env else {}
        if not isinstance(env, dict):
            env = {}
        idx = os.path.join(d, "index.html")
        row = {k: env.get(k) for k, _ in COLUMNS}
        row["model_file"] = env.get("model_file")
        row["dir"] = name
        row["has_env"] = has_env
        row["has_index"] = os.path.isfile(idx)
        row["size"] = os.path.getsize(idx) if row["has_index"] else None
        row["has_idea"] = os.path.isfile(os.path.join(d, "IDEA.md"))
        row["extra"] = {k: v for k, v in env.items() if k not in row}
        if not has_env and not row["has_index"] and not row["has_idea"]:
            continue  # 無関係なディレクトリ
        rows.append(row)
    rows.sort(key=lambda r: str(r.get("date") or ""))
    return rows


# ---------- HTML ----------
CSS = """
:root{--bg:#0f1117;--fg:#e6e8ef;--dim:#9aa3b5;--line:#2a2f3d;--card:#171a23;--ok:#3fb950;--ng:#f85149;--warn:#d29922;--todo:#e3b341}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Sans","Noto Sans JP",sans-serif}
h1{font-size:20px;margin:0 0 4px}
.meta{color:var(--dim);margin-bottom:16px}
.summary{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:140px}
.card .k{color:var(--dim);font-size:12px}.card .v{font-size:18px;font-weight:600}
.card ul{margin:4px 0 0;padding-left:16px;font-size:12px;color:var(--dim)}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:8px}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap;vertical-align:top}
th{cursor:pointer;user-select:none;color:var(--dim);font-weight:600;position:sticky;top:0;background:var(--card)}
th.sorted-asc::after{content:" ▲"}th.sorted-desc::after{content:" ▼"}
tr:hover td{background:#1d2130}
td.notes{white-space:normal;min-width:200px;color:var(--dim)}
small.sub{color:var(--dim);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
a{color:#79b8ff;text-decoration:none}a:hover{text-decoration:underline}
.todo{color:var(--todo)}.missing{color:var(--ng)}.empty{color:var(--dim)}
input#filter{margin:0 0 12px;padding:6px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg);width:320px}
"""

JS = """
(function(){
  const table=document.querySelector('table');
  const ths=[...table.querySelectorAll('th')];
  const tbody=table.querySelector('tbody');
  ths.forEach((th,i)=>th.addEventListener('click',()=>{
    const asc=!th.classList.contains('sorted-asc');
    ths.forEach(t=>t.classList.remove('sorted-asc','sorted-desc'));
    th.classList.add(asc?'sorted-asc':'sorted-desc');
    const rows=[...tbody.querySelectorAll('tr')];
    rows.sort((a,b)=>{
      const x=a.children[i].dataset.sort??a.children[i].textContent.trim();
      const y=b.children[i].dataset.sort??b.children[i].textContent.trim();
      const nx=parseFloat(x),ny=parseFloat(y);
      const c=(!isNaN(nx)&&!isNaN(ny))?nx-ny:x.localeCompare(y,'ja');
      return asc?c:-c;
    });
    rows.forEach(r=>tbody.appendChild(r));
  }));
  const f=document.getElementById('filter');
  f.addEventListener('input',()=>{
    const q=f.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';});
  });
})();
"""


def esc(v):
    return html.escape("" if v is None else str(v))


def cell(key, row):
    v = row.get(key)
    if key == "model":
        label = esc(v) or "-"
        if row["has_index"]:
            label = f'<a href="{esc(row["dir"])}/index.html"><b>{label}</b></a>'
        else:
            label = f'<b>{label}</b> <span class="missing">(index.html なし)</span>'
        mf = row.get("model_file")
        sub = f'<br><small class="sub">{esc(mf)}</small>' if mf else ""
        return f"<td>{label}{sub}</td>"
    if key == "size":
        if v is None:
            return '<td data-sort="-1" class="missing">なし</td>'
        return f'<td data-sort="{v}">{v/1024:.1f} KB</td>'
    if key == "notes":
        extra = "".join(f"<br><small>{esc(k)}: {esc(x)}</small>" for k, x in row["extra"].items())
        return f'<td class="notes">{esc(v)}{extra}</td>'
    if v is None or v == "":
        return '<td class="empty">-</td>'
    if str(v).upper() == "TODO":
        return f'<td class="todo">{esc(v)}</td>'
    return f"<td>{esc(v)}</td>"


def count_by(rows, key):
    c = {}
    for r in rows:
        k = r.get(key) or "-"
        c[k] = c.get(k, 0) + 1
    return sorted(c.items(), key=lambda kv: -kv[1])


def render(rows, root):
    head = "".join(f"<th>{esc(label)}</th>" for _, label in COLUMNS)
    body = "".join("<tr>" + "".join(cell(k, r) for k, _ in COLUMNS) + "</tr>" for r in rows)

    def card(title, items):
        lis = "".join(f"<li>{esc(k)}: {n}</li>" for k, n in items)
        return f'<div class="card"><div class="k">{esc(title)}</div><ul>{lis}</ul></div>'

    summary = (
        f'<div class="card"><div class="k">実行数</div><div class="v">{len(rows)}</div></div>'
        + card("provider", count_by(rows, "provider"))
        + card("harness", count_by(rows, "harness"))
    )
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>aitest index</title>
<style>{CSS}</style>
</head>
<body>
<h1>aitest index</h1>
<div class="meta">生成 {now} · <a href="IDEA.md">IDEA.md</a></div>
<div class="summary">{summary}</div>
<input id="filter" type="search" placeholder="絞り込み (model, provider, harness ...)">
<div class="wrap"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>
<script>{JS}</script>
</body>
</html>
"""


README_START, README_END = "<!-- index:start -->", "<!-- index:end -->"


def update_readme(rows, root):
    """README.md のマーカー間にリンク一覧を書き込む。マーカーが無ければ何もしない。"""
    path = os.path.join(root, "README.md")
    if not os.path.isfile(path):
        return False
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if README_START not in text or README_END not in text:
        return False
    lines = ["| model | provider | harness | date |", "|---|---|---|---|"]
    for r in rows:
        name = r.get("model") or r["dir"]
        link = f"[{name}]({r['dir']}/index.html)" if r["has_index"] else f"{name} (index.html なし)"
        lines.append(f"| {link} | {r.get('provider') or '-'} | {r.get('harness') or '-'} | {r.get('date') or '-'} |")
    before = text[: text.index(README_START) + len(README_START)]
    after = text[text.index(README_END):]
    with open(path, "w", encoding="utf-8") as f:
        f.write(before + "\n" + "\n".join(lines) + "\n" + after)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", nargs="?", default=os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument("-o", "--output", help="出力先 (デフォルト: <root>/index.html)")
    args = ap.parse_args()
    rows = collect(args.root)
    out = args.output or os.path.join(args.root, "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(render(rows, args.root))
    for r in rows:
        flag = "" if r["has_env"] else "  (env.yml なし)"
        print(f"{str(r.get('model') or '-'):20s} {str(r.get('provider') or '-'):10s} {str(r.get('harness') or '-'):12s}{flag}")
    print(f"-> {os.path.relpath(out)} ({len(rows)} 件)", file=sys.stderr)
    if update_readme(rows, args.root):
        print("-> README.md を更新", file=sys.stderr)


if __name__ == "__main__":
    main()

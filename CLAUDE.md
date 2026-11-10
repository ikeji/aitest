# aitest 作業メモ

同じ `IDEA.md` (派手エフェクト・テトリス、HTML 1 枚) を各 LLM に渡し、生成物を比べるベンチ。
run ごとに `<name>-YYYYMMDDHHMM/` があり、`index.html` (生成物) と `env.yml` (環境と採点) を置く。
`build_index.py` が全 `env.yml` を集計してトップの `index.html` と README の表を作る。

## 新しい run を追加する手順 (「欠けてる env.yml を追加して」)

1. `env.yml` が無い run ディレクトリを探す (`ls -d */ | while read d; do [ -f "$d/env.yml" ] || echo $d; done`)。
2. 各 run について `model` / `model_file` / `params` / `provider` / `harness` / `date` を決めて `env.yml` を書く。
   - `date` はディレクトリ名のタイムスタンプ (実行終了時刻)。
   - どのハーネスで実行したかは、その時刻のセッションログで判断する
     (pi-agent `~/.pi/agent/sessions`, claude-code `~/.claude/projects`, codex `~/.codex/sessions`,
     opencode `~/.local/share/opencode/opencode.db`, hermes-agent `~/.hermes/state.db`)。
   - `params` は「総数-Active」(例 `118B-A8B`)。ローカルモデルは `gguf_params.py` で計測、
     API モデルは公開情報を調べる。不明なら空。
   - `score:` は tier/rules/effects/sound を空のまま置き、ユーザーの採点を待つ。
3. `python3 collect_stats.py <dir> ...` で `stats:` を埋める (`-n` で確認だけ)。
   - cwd で照合できないときは時刻で照合する。同時刻に候補が複数あって未照合なら、
     セッションを特定して指示する (ユーザーに確認)。
4. `python3 build_index.py` を実行し、`__pycache__` を消す。
5. ユーザーが `<run> rule<N> effects<N|NA> sound<N|NA> tier <S/A/B/C/F>` とバグの内容を言うので
   `score:` に書く。tier の基準は `SCORING.md` (A は rules 4 が必要)。
6. ユーザーが `a > b` / `a < b` の比較を言うので `RANKING.md` の末尾のコードフェンス **の内側** に追記する。
   - tier F の run は全部 gemma4 より下: `gemma4 > <run>` を F の並びに追加する。
   - 順位は rule 優先。
7. 「コミットして」「push して」で実行する。

## 評価の手順 (採点と順位付け)

採点と比較はユーザーが `index.html` を実際に遊んで決める。こちらは点数や順位を推測して書かない。

1. 採点
   - 基準は `SCORING.md`。ユーザーが `<run> rule<N> effects<N|NA> sound<N|NA> tier <S/A/B/C/F>` と
     バグの内容を言うので、そのまま `score:` に書く (`bugs` は英語)。
   - 採点後は `build_index.py` を回し直し、`__pycache__` を消す。
2. 順位の置き場所を決める
   - 順位は「tier → rules → effects → sound → date」が既定。同じ tier・同じ点数で並んだ run
     (例: A で r4 e4 s3) は、直接比べないと順位が決まらない。
   - 新しい run を置くときは、同点の run を並べて、比較すべき 2 つ (上下の境目になりそうなもの) を
     挙げて「どちらが上か」をユーザーに聞く。1 回で決まらなければ、二分探索のように次の組を聞く。
3. `RANKING.md` に書く
   - ユーザーが実際に答えた比較だけを `a > b` で書く (末尾のコードフェンスの内側)。
     推移律で導ける行 (`a > b`, `b > c` から `a > c`) や、比較していない相手との行は書き足さない。
   - 理由をユーザーが言ったら `#` コメントに書く。run 名は曖昧なときだけタイムスタンプ付きのフルネームにする。
   - tier F の run は全部 gemma4 より下なので `gemma4 > <run>` を F の並びに追加する。
4. 反映
   - `build_index.py` を実行して並びを確認する。循環の警告が出たらユーザーに伝える。
   - コミットと push は頼まれたときだけ。

## ベンチマークの実行手順

ローカルモデルは別 PC の llama-server (router モード、`--models-preset` の INI でモデルを切り替え) を
この PC の pi-agent から叩く。ホスト名・IP・ポート・パス・プリセット名などの環境固有の値は
`CLAUDE.local.md` (git 管理外) にある。

1. サーバー側
   - 本番用と試験用の起動スクリプト/プリセットが分かれている。`--models-max 1` なので同時に載る
     モデルは 1 つで、本番と試験を同時に動かすとメモリが足りない。片方を止めてから起動し、
     終わったら必ず本番に戻す。
   - 新モデルはプリセット INI に `[name]` セクションを追加する (キーは llama-server の long option から
     ダッシュを取ったもの、インライン `#` は値を切る)。100GB 超のモデルは `ctx-size = 131072` を
     明示しないと KV キャッシュで OOM になる。
   - 動作確認は `/models` と `/v1/chat/completions` に短いプロンプト。ロード失敗はコンテナのログで見る
     (未対応アーキならイメージの `libllama*.so` を `grep -ac <arch>` して確認)。
   - 追加ダウンロードはサーバー側の `download.sh` に hf コマンドを追記して実行する
     (`HF_HUB_DISABLE_XET=1` 必須、HF_TOKEN はファイルに書かない、複数ファイルは `--include` を並べず
     位置引数で渡す)。
2. クライアント側 (この PC)
   - `~/.pi/agent/models.json` の該当 provider にモデル ID を足す
     (`reasoning: true`, `contextWindow: 126976`, `maxTokens: 32768`)。思考が長いモデルは 32k を
     使い切って `stopReason: length` になるので、その場合は `maxTokens: 65536` にして最初からやり直す。
3. 実行
   - 作業ディレクトリはハーネスごとに分ける (`pi-agent` は `~/tmp/pi/ai`、`claude-code` は `~/tmp/claude/ai`、`opencode` は `~/tmp/opencode`)。既存のファイル (前回の `IDEA.md` や生成物、`/tmp` に残したテスト用ディレクトリなど) を消した上で、毎回 `aitest/IDEA.md` を新しくコピーして用意する。
   - バックグラウンドで走らせ、開始・終了時刻 (JST) を記録する:
     - `pi-agent`: `cd ~/tmp/pi/ai && pi --provider <provider> --model <id> -p 'IDEA.md を実装して'` (`-p` は先頭 `@` をファイル添付と解釈するので `@IDEA.md` と書かない)
     - `claude-code`: (新モデルで未対応なら先に `claude update`) `cd ~/tmp/claude/ai && claude --model <id> --dangerously-skip-permissions -p 'IDEA.md を実装して'`
     - `opencode`: `cd ~/tmp/opencode && opencode run -m <provider>/<id> 'IDEA.md を実装して'`
   - 待っている間にセッションログ (`~/.pi/agent/sessions/<cwd-slug>/*.jsonl`, `~/.claude/projects/<cwd-slug>/*.jsonl`, `~/.local/share/opencode/opencode.db`) のツール呼び出しを監視し、作業ディレクトリと `/tmp` 以外のパス (`aitest`, `work/ai`, `~`, `..`, `find`/`locate`/`grep -r`) に触っていないか (他モデルの答えを見ていないか) を確認して、結果を env.yml の notes に書く。
   - エージェントのテストコマンド (node など) がハングすることがある。タイムアウトしないハーネスでは、長時間止まっていたら該当プロセスだけ kill して続行させ、notes に記録する。
4. 登録
   - `aitest/<name>-<終了時刻 YYYYMMDDHHMM>/` を作り、`IDEA.md` と生成された `index.html` をコピーし、
     上の手順どおり `env.yml` を書く。同じ時刻帯にセッションが複数あるときは `session: <ID の一部>` を書く。
   - `collect_stats.py` → `build_index.py` → 作業ディレクトリを `IDEA.md` だけに戻す → 試験サーバーなら本番に戻す。

## env.yml の書き方

```yaml
# ベンチ実行環境の記録 (build_index.py が集計する)
model: Laguna-S-2.1
model_file:                      # ローカルモデルのファイル名/タグ。/models/ や /models/manual-downloads/ の接頭辞は省く
params: 118B-A8B
provider: nous                   # anthropic / openai / openrouter / nous / local など
harness: hermes-agent            # claude-code / codex / pi-agent / opencode / hermes-agent / antigravity など
date: "2026-10-24 17:06"
notes: "Nous Portal free tier (poolside/laguna-s-2.1:free)"
links: [fixed.html]              # index.html 以外にリンクしたいファイルがあるときだけ (自動検出はしない)
score:
  tier: B
  rules: 4
  effects: 2
  sound: 1
  bugs: "Board breaks when a line is cleared"
  notes: ""
stats:               # collect_stats.py が書く
  ...
```

- 一時ディレクトリで実行するのが標準なので、そのことは notes に書かない。
- harness は専用の欄があるので notes に書かない。
- `/tmp/...` や `~/.gemini/...` のようなローカルパスを env.yml に書かない。
- `bugs` は英語で書く。

## 言語

- トップの `index.html` の UI と `README.md` は英語。
- 各 run の `index.html` / `IDEA.md` / `SCORING.md` / `RANKING.md` / `env.yml` のコメントは日本語のまま。

## git

- 「コミットして」「push して」で実行する。push の手順 (認証方法など) は `CLAUDE.local.md`。
- force push はしない。

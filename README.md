# aitest

同じ IDEA.md を複数の LLM に渡して生成させた成果物 (index.html) を集めたベンチ。

- 各ディレクトリ: 1 回の実行。`env.yml` にモデル・provider・harness を記録し、`index.html` が成果物。
- `build_index.py`: 各 `env.yml` を集計してトップの `index.html` を生成する。
- `SCORING.md`: 採点基準。
- `collect_stats.py`: pi-agent / claude-code / codex のセッションログから所要時間・生成トークン数・tps を集めて各 `env.yml` の `stats:` に書く。
- `gguf_params.py`: GGUF ファイルからパラメータ数 (総数と MoE の Active 推定) を読む。`env.yml` の `params` の確認用。

```
python3 collect_stats.py   # env.yml の stats: を更新
python3 build_index.py     # index.html と README の表を再生成
```

## 成果物

<!-- index:start -->
| model | params | provider | harness | date | time | out tokens | tps | tier | rules | effects | sound |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [claude-fable-5-1](fable51-202609022125/index.html) | - | anthropic | claude-code | 2026-09-02 21:25 | 27m53s | 122.4k | 82 | S | 4 | 4 | 4 |
| [Qwen3.8-Flash-Next](qwen38flashnext-202609051658/index.html) | 177B-A7B | llama.cpp | pi-agent | 2026-09-05 16:58 | 6h54m | 259.8k | 11 | A | 4 | 4 | 3 |
| [claude-opus-5](opus5-202609022218/index.html) | - | anthropic | claude-code | 2026-09-02 22:18 | 15m56s | 77.1k | 84 | A | 4 | 3 | 4 |
| [gpt-6-astra](gpt6astra-202609071051/index.html) | - | openai | codex | 2026-09-07 10:51 | 10m19s | - | - | A | 4 | 3 | 4 |
| [claude-sonnet-5](sonnet5-202609022244/index.html) | - | anthropic | claude-code | 2026-09-02 22:44 | 17m20s | 87.8k | 100 | A | 4 | 2 | 3 |
| [gpt-5.6-sol](gpt56sol-202609071213/index.html) | - | openai | codex | 2026-09-07 12:13 | 9m22s | - | - | B | 4 | 4 | 1 |
| [gpt-5.5](gpt55-202609032230/index.html) | - | openai | codex | 2026-09-03 22:30 | 4m40s | 13.7k | 49 | B | 4 | 3 | 0 |
| [gemma-4-26B-A4B-it](gemma4-202609022143/index.html) | 26B-A4B | llama.cpp | pi-agent | 2026-09-02 21:43 | 4m52s | 18.4k | 63 | B | 4 | 1 | 1 |
| [deepseek-v4-flash](deepseekv4flash-202609050207/index.html) | 284B-A13B | llama.cpp | pi-agent | 2026-09-05 02:07 | 58m34s | 48.0k | 14 | B | 4 | 1 | 0 |
| [gpt-5.6-terra](gpt56terra-202609032330/index.html) | - | openai | codex | 2026-09-03 23:30 | 2m19s | 6.3k | 45 | B | 3 | 2 | 1 |
| [Qwen3.8-27B](qwen38-202609022255/index.html) | 27B | llama.cpp | pi-agent | 2026-09-02 22:55 | 2h54m | 116.7k | 12 | B | 1 | 4 | 4 |
| [gpt-oss-120b](gptoss120b-202609051948/index.html) | 117B-A5B | llama.cpp | pi-agent | 2026-09-05 19:48 | 0m58s | 2.5k | 43 | C | 2 | 1 | 0 |
| [Qwen3-Next-80B-A3B-Thinking](qwen3next-202609052353/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:53 | 3m31s | 10.3k | 49 | C | 2 | 0 | 0 |
| [GLM-4.7-Flash](glm47flash-202609052329/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-05 23:29 | 2m28s | 6.5k | 44 | C | 1 | 1 | 1 |
| [gpt-5.6-luna](gpt56luna-202609032300/index.html) | - | openai | codex | 2026-09-03 23:00 | 1m47s | 5.0k | 46 | F | 1 | 1 | 1 |
| [Qwen3-Coder-Next](qwen3codernext-202609052344/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:44 | 4m19s | 11.3k | 44 | F | 1 | NA | 1 |
| [Devstral-2-123B-Instruct](devstral2-202609051948/index.html) | 123B | llama.cpp | pi-agent | 2026-09-05 19:48 | 25m33s | 4.3k | 3 | F | 1 | NA | 0 |
| [gpt-5.4-mini](gpt54mini-202609032210/index.html) | - | openai | codex | 2026-09-03 22:10 | 7m06s | 28.4k | 67 | F | 1 | NA | NA |
| [GLM-4.5-Air](glm45air-202609052311/index.html) | 106B-A12B | llama.cpp | pi-agent | 2026-09-05 23:11 | 5m16s | 5.2k | 17 | F | 0 | NA | 0 |
| [Qwen3.6-35B-A3B](qwen36-202609022233/index.html) | 35B-A3B | llama.cpp | pi-agent | 2026-09-02 22:33 | 4m32s | 15.0k | 55 | F | 0 | NA | NA |
| [claude-haiku-4-5](haiku45-202609022307/index.html) | - | anthropic | claude-code | 2026-09-02 23:07 | 4m32s | 22.9k | 92 | F | 0 | NA | NA |
| [minimax/minimax-m3:free](minimaxm3-202609032151/index.html) | - | openrouter | pi-agent | 2026-09-03 21:51 | 7m05s | 13.0k | 104 | F | 0 | NA | NA |
| [Qwen3-Coder-30B-A3B-Instruct](qwen3coder-202609061228/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-06 12:28 | 1m10s | 4.8k | 69 | F | 0 | NA | NA |
| [MiniMax-M2.7](minimaxm27-202609061312/index.html) | 230B-A10B | llama.cpp | pi-agent | 2026-09-06 13:12 | 8m49s | 9.1k | 17 | F | 0 | NA | NA |
<!-- index:end -->

`build_index.py` を実行してから commit / push する。
GitHub Pages は Settings → Pages → Source を **Deploy from a branch**、Branch を `master` / `/ (root)` にすると `https://<user>.github.io/aitest/` で公開される。

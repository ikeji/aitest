# aitest

同じ IDEA.md を複数の LLM に渡して生成させた成果物 (index.html) を集めたベンチ。

- 各ディレクトリ: 1 回の実行。`env.yml` にモデル・provider・harness を記録し、`index.html` が成果物。
- `build_index.py`: 各 `env.yml` を集計してトップの `index.html` を生成する。
- `SCORING.md`: 採点基準。

```
python3 build_index.py
```

## 成果物

<!-- index:start -->
| model | provider | harness | date | tier | rules | effects | sound |
|---|---|---|---|---|---|---|---|
| [claude-fable-5-1](fable51-202609022125/index.html) | anthropic | claude-code | 2026-09-02 21:25 | S | 4 | 4 | 4 |
| [Qwen3.8-Flash-Next](qwen38flashnext-202609051658/index.html) | llama.cpp | pi-agent | 2026-09-05 16:58 | A | 4 | 4 | 3 |
| [claude-opus-5](opus5-202609022218/index.html) | anthropic | claude-code | 2026-09-02 22:18 | A | 4 | 3 | 4 |
| [claude-sonnet-5](sonnet5-202609022244/index.html) | anthropic | claude-code | 2026-09-02 22:44 | A | 4 | 3 | 3 |
| [gpt-5.5](gpt55-202609032230/index.html) | openai | codex | 2026-09-03 22:30 | B | 4 | 3 | 0 |
| [gemma-4-26B-A4B-it](gemma4-202609022143/index.html) | llama.cpp | pi-agent | 2026-09-02 21:43 | B | 4 | 1 | 1 |
| [deepseek-v4-flash](deepseekv4flash-202609050207/index.html) | llama.cpp | pi-agent | 2026-09-05 02:07 | B | 4 | 1 | 0 |
| [gpt-5.6-terra](gpt56terra-202609032330/index.html) | openai | codex | 2026-09-03 23:30 | B | 3 | 2 | 1 |
| [Qwen3.8-27B](qwen38-202609022255/index.html) | llama.cpp | pi-agent | 2026-09-02 22:55 | B | 1 | 4 | 4 |
| [gpt-oss-120b](gptoss120b-202609051948/index.html) | llama.cpp | pi-agent | 2026-09-05 19:48 | C | 2 | 1 | 0 |
| [Qwen3-Next-80B-A3B-Thinking](qwen3next-202609052353/index.html) | llama.cpp | pi-agent | 2026-09-05 23:53 | C | 2 | 0 | 0 |
| [GLM-4.7-Flash](glm47flash-202609052329/index.html) | llama.cpp | pi-agent | 2026-09-05 23:29 | C | 1 | 1 | 1 |
| [gpt-5.6-luna](gpt56luna-202609032300/index.html) | openai | codex | 2026-09-03 23:00 | F | 1 | 1 | 1 |
| [Qwen3-Coder-Next](qwen3codernext-202609052344/index.html) | llama.cpp | pi-agent | 2026-09-05 23:44 | F | 1 | NA | 1 |
| [Devstral-2-123B-Instruct](devstral2-202609051948/index.html) | llama.cpp | pi-agent | 2026-09-05 19:48 | F | 1 | NA | 0 |
| [gpt-5.4-mini](gpt54mini-202609032210/index.html) | openai | codex | 2026-09-03 22:10 | F | 1 | NA | NA |
| [GLM-4.5-Air](glm45air-202609052311/index.html) | llama.cpp | pi-agent | 2026-09-05 23:11 | F | 0 | NA | 0 |
| [Qwen3.6-35B-A3B](qwen36-202609022233/index.html) | llama.cpp | pi-agent | 2026-09-02 22:33 | F | 0 | NA | NA |
| [claude-haiku-4-5](haiku45-202609022307/index.html) | anthropic | claude-code | 2026-09-02 23:07 | F | 0 | NA | NA |
| [minimax/minimax-m3:free](minimaxm3-202609032151/index.html) | openrouter | pi-agent | 2026-09-03 21:51 | F | 0 | NA | NA |
<!-- index:end -->

`build_index.py` を実行してから commit / push する。
GitHub Pages は Settings → Pages → Source を **Deploy from a branch**、Branch を `master` / `/ (root)` にすると `https://<user>.github.io/aitest/` で公開される。

# aitest

A benchmark that gives the same IDEA.md to many LLMs and collects what they produce (index.html).

- Each directory is one run. `env.yml` records the model, provider, harness, score and stats; `index.html` is the output.
- `build_index.py`: aggregates every `env.yml` into the top-level `index.html` and the table below.
- `SCORING.md`: scoring criteria.
- `RANKING.md`: head-to-head ordering (`a > b` lines), independent of tier.
- `collect_stats.py`: reads pi-agent / claude-code / codex session logs and writes elapsed time, output tokens and tps into each `env.yml` under `stats:`.
- `gguf_params.py`: reads parameter counts (total, and an active-parameter estimate for MoE) from GGUF files. Used to fill in `params` in `env.yml`.

```
python3 collect_stats.py   # update stats: in env.yml
python3 build_index.py     # regenerate index.html and the table in README
```

## Results

<!-- index:start -->
| # | model | params | provider | harness | date | time | out tokens | tps | tier | rules | effects | sound |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [claude-fable-5-1](fable51-202609022125/index.html) | - | anthropic | claude-code | 2026-09-02 21:25 | 27m53s | 122.4k | 82 | S | 4 | 4 | 4 |
| 2 | [Qwen3.8-Flash-Next](qwen38flashnext-202609051658/index.html) | 177B-A7B | llama.cpp | pi-agent | 2026-09-05 16:58 | 6h54m | 259.8k | 11 | A | 4 | 4 | 3 |
| 3 | [claude-opus-5](opus5-202609022218/index.html) | - | anthropic | claude-code | 2026-09-02 22:18 | 15m56s | 77.1k | 84 | A | 4 | 3 | 4 |
| 4 | [gpt-6-astra](gpt6astra-202609071051/index.html) | - | openai | codex | 2026-09-07 10:51 | 10m19s | - | - | A | 4 | 3 | 4 |
| 5 | [GLM-5.3-Flash (max thinking)](glm53flash-202609090231/index.html) | 321B-A17B | - | opencode | 2026-09-09 02:31 | 55m38s | - | - | A | 4 | 3 | 3 |
| 6 | [claude-sonnet-5](sonnet5-202609022244/index.html) | - | anthropic | claude-code | 2026-09-02 22:44 | 17m20s | 87.8k | 100 | A | 4 | 2 | 3 |
| 7 | [gpt-5.6-sol](gpt56sol-202609071213/index.html) | - | openai | codex | 2026-09-07 12:13 | 9m22s | - | - | B | 4 | 4 | 1 |
| 8 | [gpt-5.5](gpt55-202609032230/index.html) | - | openai | codex | 2026-09-03 22:30 | 4m40s | 13.7k | 49 | B | 4 | 3 | 0 |
| 9 | [gemma-4-26B-A4B-it](gemma4-202609022143/index.html) | 26B-A4B | llama.cpp | pi-agent | 2026-09-02 21:43 | 4m52s | 18.4k | 63 | B | 4 | 1 | 1 |
| 10 | [deepseek-v4-flash](deepseekv4flash-202609050207/index.html) | 284B-A13B | llama.cpp | pi-agent | 2026-09-05 02:07 | 58m34s | 48.0k | 14 | B | 4 | 1 | 0 |
| 11 | [gpt-5.6-terra](gpt56terra-202609032330/index.html) | - | openai | codex | 2026-09-03 23:30 | 2m19s | 6.3k | 45 | B | 3 | 2 | 1 |
| 12 | [Qwen3.8-27B](qwen38-202609022255/index.html) | 27B | llama.cpp | pi-agent | 2026-09-02 22:55 | 2h54m | 116.7k | 12 | B | 1 | 4 | 4 |
| 13 | [gemini-3.8-flash-high](gemini38flash-202609082157/index.html) | - | google | antigravity-cli | 2026-09-08 21:57 | 22m45s | - | - | B | 1 | 4 | 2 |
| 14 | [gemini-3.7-flash-high](gemini37flash-202609082346/index.html) | - | google | antigravity-cli | 2026-09-08 23:46 | 7m16s | - | - | B | 1 | 3 | 3 |
| 15 | [gpt-oss-120b](gptoss120b-202609051948/index.html) | 117B-A5B | llama.cpp | pi-agent | 2026-09-05 19:48 | 0m58s | 2.5k | 43 | C | 2 | 1 | 0 |
| 16 | [Qwen3-Next-80B-A3B-Thinking](qwen3next-202609052353/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:53 | 3m31s | 10.3k | 49 | C | 2 | 0 | 0 |
| 17 | [gemini-3.6-flash-high](gemini36flash-202609082352/index.html) | - | google | antigravity-cli | 2026-09-08 23:52 | 2m57s | - | - | C | 1 | 3 | 2 |
| 18 | [gpt-5.6-luna](gpt56luna-202609032300/index.html) | - | openai | codex | 2026-09-03 23:00 | 1m47s | 5.0k | 46 | F | 1 | 1 | 1 |
| 19 | [GLM-4.7-Flash](glm47flash-202609052329/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-05 23:29 | 2m28s | 6.5k | 44 | F | 1 | 1 | 1 |
| 20 | [Qwen3-Coder-Next](qwen3codernext-202609052344/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:44 | 4m19s | 11.3k | 44 | F | 1 | NA | 1 |
| 21 | [Devstral-2-123B-Instruct](devstral2-202609051948/index.html) | 123B | llama.cpp | pi-agent | 2026-09-05 19:48 | 25m33s | 4.3k | 3 | F | 1 | NA | 0 |
| 22 | [gpt-5.4-mini](gpt54mini-202609032210/index.html) | - | openai | codex | 2026-09-03 22:10 | 7m06s | 28.4k | 67 | F | 1 | NA | NA |
| 23 | [GLM-4.5-Air](glm45air-202609052311/index.html) | 106B-A12B | llama.cpp | pi-agent | 2026-09-05 23:11 | 5m16s | 5.2k | 17 | F | 0 | NA | 0 |
| 24 | [Qwen3.6-35B-A3B](qwen36-202609022233/index.html) | 35B-A3B | llama.cpp | pi-agent | 2026-09-02 22:33 | 4m32s | 15.0k | 55 | F | 0 | NA | NA |
| 25 | [claude-haiku-4-5](haiku45-202609022307/index.html) | - | anthropic | claude-code | 2026-09-02 23:07 | 4m32s | 22.9k | 92 | F | 0 | NA | NA |
| 26 | [minimax/minimax-m3:free](minimaxm3-202609032151/index.html) | - | openrouter | pi-agent | 2026-09-03 21:51 | 7m05s | 13.0k | 104 | F | 0 | NA | NA |
| 27 | [Qwen3-Coder-30B-A3B-Instruct](qwen3coder-202609061228/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-06 12:28 | 1m10s | 4.8k | 69 | F | 0 | NA | NA |
| 28 | [MiniMax-M2.7](minimaxm27-202609061312/index.html) | 230B-A10B | llama.cpp | pi-agent | 2026-09-06 13:12 | 8m49s | 9.1k | 17 | F | 0 | NA | NA |
<!-- index:end -->

Run `build_index.py` before committing / pushing.
For GitHub Pages, set Settings → Pages → Source to **Deploy from a branch** with branch `master` / `/ (root)`; the site is then served at `https://<user>.github.io/aitest/`.

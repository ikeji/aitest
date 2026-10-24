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
| 2 | [claude-opus-5-5](opus55-202609231032/index.html) | - | anthropic | claude-code | 2026-09-23 10:32 | 14m30s | 88.6k | 116 | A | 4 | 4 | 3 |
| 3 | [claude-opus-5-5](opus55-202610141029/index.html) | - | anthropic | claude-code | 2026-10-14 10:29 | 8m45s | 58.4k | 114 | A | 4 | 4 | 3 |
| 4 | [claude-sonnet-5-5](sonnet55-202609292328/index.html) | - | anthropic | claude-code | 2026-09-29 23:28 | 4m25s | 38.7k | 152 | A | 4 | 4 | 3 |
| 5 | [MiMo-v2.6pro](mimo26pro-202609231046/index.html) | 1020B-A42B | - | opencode | 2026-09-23 10:46 | 36m14s | - | - | A | 4 | 4 | 3 |
| 6 | [Qwen3.8-Flash-Next](qwen38flashnext-202609051658/index.html) | 177B-A7B | llama.cpp | pi-agent | 2026-09-05 16:58 | 6h54m | 259.8k | 11 | A | 4 | 4 | 3 |
| 7 | [claude-opus-5](opus5-202609022218/index.html) | - | anthropic | claude-code | 2026-09-02 22:18 | 15m56s | 77.1k | 84 | A | 4 | 3 | 4 |
| 8 | [gpt-6-astra](gpt6astra-202609071051/index.html) | - | openai | codex | 2026-09-07 10:51 | 10m19s | - | - | A | 4 | 3 | 4 |
| 9 | [GLM-5.3-Flash (max thinking)](glm53flash-202609090231/index.html) | 321B-A17B | - | opencode | 2026-09-09 02:31 | 55m38s | - | - | A | 4 | 3 | 3 |
| 10 | [Grok 4.6 (Extra High)](grok46-202609130137/index.html) | - | - | opencode | 2026-09-13 01:37 | 29m41s | - | - | A | 4 | 3 | 3 |
| 11 | [MiniMax-M3.1-Flash (Space Bunny, Max think)](spacebunny-202609240250/index.html) | 428B-A23B | - | - | 2026-09-24 02:50 | 43m21s | - | - | A | 4 | 3 | 3 |
| 12 | [Qwen3.8-27B (EXL3 3.5bpw)](qwen38-202609160535/index.html) | 27B | exllamav3 | Deepseek Harness | 2026-09-16 05:35 | 1h02m | - | - | A | 4 | 3 | 3 |
| 13 | [claude-sonnet-5](sonnet5-202609022244/index.html) | - | anthropic | claude-code | 2026-09-02 22:44 | 17m20s | 87.8k | 100 | A | 4 | 2 | 3 |
| 14 | [DeepSeek-V4.1-Flash (1017)](deepseekv411017-202610201458/index.html) | 552B-A16B | opencode | opencode | 2026-10-20 14:58 | 1h14m | 190.3k | 43 | A | 4 | 2 | 2 |
| 15 | [claude-haiku-5-5](haiku55-202610081052/index.html) | - | anthropic | claude-code | 2026-10-08 10:52 | 6m27s | 60.5k | 240 | B | 4 | 1 | 3 |
| 16 | [Ornith-1.5-122B](ornith-202610241242/index.html) | 122B-A9B | llama.cpp | pi-agent | 2026-10-24 12:42 | 10m53s | 13.3k | 20 | B | 4 | 2 | 1 |
| 17 | [Beam-1.0-501B-A23B (Beam stealth)](beam-202610201822/index.html) | 501B-A23B | opencode | opencode | 2026-10-20 18:22 | 5m34s | 45.4k | 136 | B | 4 | 1 | 3 |
| 18 | [DeepSeek-V4-Flash](deepseekv4flash-202609050207/index.html) | 284B-A13B | llama.cpp | pi-agent | 2026-09-05 02:07 | 58m34s | 48.0k | 14 | B | 4 | 1 | 0 |
| 19 | [gpt-5.5](gpt55-202609032230/index.html) | - | openai | codex | 2026-09-03 22:30 | 4m40s | 13.7k | 49 | B | 4 | 3 | 0 |
| 20 | [Laguna-S-2.1](lagunas21-202610241706/index.html) | 118B-A8B | nous | hermes-agent | 2026-10-24 17:06 | 17m17s | 49.2k | 50 | B | 4 | 2 | 1 |
| 21 | [Grok 4.7 (High Fast)](grok47-202609220234/index.html) | - | - | opencode | 2026-09-22 02:34 | 35m45s | - | - | B | 3 | 4 | 3 |
| 22 | [MiMo-V2.6-Flash](mimo26flash-202610070119/index.html) | 309B-A15B | opencode | opencode | 2026-10-07 01:19 | 53m56s | 142.8k | 44 | B | 3 | 3 | 2 |
| 23 | [gemma-4-26B-A4B-it](gemma4-202609022143/index.html) | 26B-A4B | llama.cpp | pi-agent | 2026-09-02 21:43 | 4m52s | 18.4k | 63 | B | 4 | 1 | 1 |
| 24 | [Hy4 preview](hy4preview-202609100110/index.html) | 770B-A49B | - | opencode | 2026-09-10 01:10 | 21m14s | - | - | B | 2 | 3 | 3 |
| 25 | [DeepSeek-V4.1-Flash](deepseekv41flash-202609111136/index.html) | 552B-A16B | - | opencode | 2026-09-11 11:36 | - | - | - | B | 3 | 4 | 2 |
| 26 | [gpt-oss-120b](gptoss120b-202609051948/index.html) | 117B-A5B | llama.cpp | pi-agent | 2026-09-05 19:48 | 0m58s | 2.5k | 43 | C | 2 | 1 | 0 |
| 27 | [Qwen3-Next-80B-A3B-Thinking](qwen3next-202609052353/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:53 | 3m31s | 10.3k | 49 | C | 2 | 0 | 0 |
| 28 | [Qwen3.8-27B](qwen38-202609022255/index.html) | 27B | llama.cpp | pi-agent | 2026-09-02 22:55 | 2h54m | 116.7k | 12 | C | 1 | 4 | 4 |
| 29 | [Muse Spark 1.3](musespark13-202609100052/index.html) | - | - | - | 2026-09-10 00:52 | 2m53s | - | - | C | 1 | 4 | 3 |
| 30 | [gemini-3.8-flash-high](gemini38flash-202609082157/index.html) | - | google | antigravity-cli | 2026-09-08 21:57 | 22m45s | - | - | C | 1 | 4 | 2 |
| 31 | [gpt-5.6-sol](gpt56sol-202609071213/index.html) | - | openai | codex | 2026-09-07 12:13 | 9m22s | - | - | C | 1 | 4 | 1 |
| 32 | [gemini-3.7-flash-high](gemini37flash-202609082346/index.html) | - | google | antigravity-cli | 2026-09-08 23:46 | 7m16s | - | - | C | 1 | 3 | 3 |
| 33 | [gemini-3.6-flash-high](gemini36flash-202609082352/index.html) | - | google | antigravity-cli | 2026-09-08 23:52 | 2m57s | - | - | C | 1 | 3 | 2 |
| 34 | [gpt-5.6-terra](gpt56terra-202609032330/index.html) | - | openai | codex | 2026-09-03 23:30 | 2m19s | 6.3k | 45 | C | 1 | 2 | 1 |
| 35 | [LongCat-2.5-preview](longcat25preview-202610070104/index.html) | 1600B-A48B | opencode | opencode | 2026-10-07 01:04 | 11m18s | 29.6k | 44 | C | 1 | 1 | 1 |
| 36 | [Flint v1.0 (40B)](flint-202610220857/index.html) | 40B-A2.5B | opencode | opencode | 2026-10-22 08:57 | 13m48s | 76.1k | 92 | C | 1 | 1 | 1 |
| 37 | [Flint v1.0 (40B)](flint-202610220911/index.html) | 40B-A2.5B | openrouter | pi-agent | 2026-10-22 09:11 | 11m30s | 86.7k | 126 | C | 1 | 1 | 1 |
| 38 | [Beam-1.0-501B-A23B](beam10-202610241810/index.html) | 501B-A23B | nous | hermes-agent | 2026-10-24 18:10 | 0m20s | 4.5k | 240 | C | 1 | 1 | 1 |
| 39 | [Ornith-1.5-122B](ornith15-202610241824/index.html) | 122B-A9B | nous | hermes-agent | 2026-10-24 18:24 | 7m31s | 16.3k | 36 | C | 1 | 1 | 1 |
| 40 | [gpt-5.6-luna](gpt56luna-202609032300/index.html) | - | openai | codex | 2026-09-03 23:00 | 1m47s | 5.0k | 46 | F | 1 | 1 | 1 |
| 41 | [GLM-4.7-Flash](glm47flash-202609052329/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-05 23:29 | 2m28s | 6.5k | 44 | F | 1 | 1 | 1 |
| 42 | [Step-3.7-Flash](step37flash-202610241710/index.html) | 198B-A11B | nous | hermes-agent | 2026-10-24 17:10 | 2m14s | 15.7k | 118 | F | 1 | 1 | 1 |
| 43 | [Qwen3-Coder-Next](qwen3codernext-202609052344/index.html) | 80B-A3B | llama.cpp | pi-agent | 2026-09-05 23:44 | 4m19s | 11.3k | 44 | F | 1 | NA | 1 |
| 44 | [Devstral-2-123B-Instruct](devstral2-202609051948/index.html) | 123B | llama.cpp | pi-agent | 2026-09-05 19:48 | 25m33s | 4.3k | 3 | F | 1 | NA | 0 |
| 45 | [gpt-5.4-mini](gpt54mini-202609032210/index.html) | - | openai | codex | 2026-09-03 22:10 | 7m06s | 28.4k | 67 | F | 1 | NA | NA |
| 46 | [fledge-alpha (max)](fledgealpha-202610062258/index.html) | - | opencode | opencode | 2026-10-06 22:58 | 4m43s | 15.7k | 55 | F | 0 | NA | 1 |
| 47 | [GLM-4.5-Air](glm45air-202609052311/index.html) | 106B-A12B | llama.cpp | pi-agent | 2026-09-05 23:11 | 5m16s | 5.2k | 17 | F | 0 | NA | 0 |
| 48 | [Qwen3.6-35B-A3B](qwen36-202609022233/index.html) | 35B-A3B | llama.cpp | pi-agent | 2026-09-02 22:33 | 4m32s | 15.0k | 55 | F | 0 | NA | NA |
| 49 | [claude-haiku-4-5](haiku45-202609022307/index.html) | - | anthropic | claude-code | 2026-09-02 23:07 | 4m32s | 22.9k | 92 | F | 0 | NA | NA |
| 50 | [minimax/minimax-m3:free](minimaxm3-202609032151/index.html) | 428B-A23B | openrouter | pi-agent | 2026-09-03 21:51 | 7m05s | 13.0k | 104 | F | 0 | NA | NA |
| 51 | [Qwen3-Coder-30B-A3B-Instruct](qwen3coder-202609061228/index.html) | 30B-A3B | llama.cpp | pi-agent | 2026-09-06 12:28 | 1m10s | 4.8k | 69 | F | 0 | NA | NA |
| 52 | [MiniMax-M2.7](minimaxm27-202609061312/index.html) | 230B-A10B | llama.cpp | pi-agent | 2026-09-06 13:12 | 8m49s | 9.1k | 17 | F | 0 | NA | NA |
| 53 | [Nemotron-3-Super-120B-A12B](nemotron3super-202609092217/index.html) | 120B-A12B | llama.cpp | pi-agent | 2026-09-09 22:17 | 9m53s | 9.0k | 15 | F | 0 | NA | NA |
| 54 | [DeepSeek-V4.1-Flash](deepseekv41flash-202609161830/index.html) ([fixed.html](deepseekv41flash-202609161830/fixed.html)) | 552B-A16B | deepseek | Deepseek Harness | 2026-09-16 18:30 | 56m11s | 293.2k | 282 | F | 0 | NA | NA |
| 55 | [MiniMax-M3.1-Flash (Space Bunny)](spacebunny-202609240045/index.html) | 428B-A23B | - | - | 2026-09-24 00:45 | - | - | - | F | 0 | NA | NA |
| 56 | [big-pickle](bigpickle-202610062305/index.html) | - | opencode | opencode | 2026-10-06 23:05 | 15m36s | 18.9k | 20 | F | 0 | NA | NA |
| 57 | [Sarashina3 mini](sarashina3mini-202610141030/index.html) | - | sarashina | pi-agent | 2026-10-14 10:30 | 0m12s | 0.9k | 73 | F | 0 | NA | NA |
| 58 | [Sarashina3 nano](sarashina3nano-202610141031/index.html) | - | sarashina | pi-agent | 2026-10-14 10:31 | 0m01s | 0.3k | 243 | F | 0 | NA | NA |
| 59 | [Nemotron-3.5-Super-VL](nemotron35supervl-202610182358/index.html) | 120B-A12B | openrouter | pi-agent | 2026-10-18 23:58 | 11m18s | 8.8k | 67 | F | 0 | NA | NA |
| 60 | [North Mini Code](northminicode-202610190006/index.html) | 30B-A3B | openrouter | pi-agent | 2026-10-19 00:06 | 1m02s | 9.2k | 149 | F | 0 | NA | NA |
| 61 | [MiniMax-M3.1-Flash](minimaxm31flash-202610201027/index.html) | 428B-A23B | openrouter | pi-agent | 2026-10-20 10:27 | 16m48s | 66.3k | 157 | F | 0 | NA | NA |
| 62 | [Solar Mini 4](solarmini4-202610241645/index.html) | 35B-A3B | nous | hermes-agent | 2026-10-24 16:45 | 51m07s | 280.5k | 108 | F | 0 | NA | NA |
| 63 | [Laguna-XS-2.1](lagunaxs21-202610241729/index.html) | 33B-A3B | nous | hermes-agent | 2026-10-24 17:29 | 1m44s | 6.7k | 65 | F | 0 | NA | NA |
<!-- index:end -->

Run `build_index.py` before committing / pushing.
For GitHub Pages, set Settings → Pages → Source to **Deploy from a branch** with branch `master` / `/ (root)`; the site is then served at `https://<user>.github.io/aitest/`.

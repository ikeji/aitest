# aitest

同じ IDEA.md を複数の LLM に渡して生成させた成果物 (index.html) を集めたベンチ。

- 各ディレクトリ: 1 回の実行。`env.yml` にモデル・provider・harness を記録し、`index.html` が成果物。
- `build_index.py`: 各 `env.yml` を集計してトップの `index.html` を生成する。

```
python3 build_index.py
```

## 成果物

<!-- index:start -->
| model | provider | harness | date |
|---|---|---|---|
| [claude-fable-5-1](fable51-202609022125/index.html) | anthropic | claude-code | 2026-09-02 21:25 |
| [gemma-4-26B-A4B-it](gemma4-202609022143/index.html) | llama.cpp | pi-agent | 2026-09-02 21:43 |
| [claude-opus-5](opus5-202609022218/index.html) | anthropic | claude-code | 2026-09-02 22:18 |
| [Qwen3.6-35B-A3B](qwen36-202609022233/index.html) | llama.cpp | pi-agent | 2026-09-02 22:33 |
| [claude-sonnet-5](sonnet5-202609022244/index.html) | anthropic | claude-code | 2026-09-02 22:44 |
| [Qwen3.8-27B](qwen38-202609022255/index.html) | llama.cpp | pi-agent | 2026-09-02 22:55 |
| [claude-haiku-4-5](haiku45-202609022307/index.html) | anthropic | claude-code | 2026-09-02 23:07 |
<!-- index:end -->

`build_index.py` を実行してから commit / push する。
GitHub Pages は Settings → Pages → Source を **Deploy from a branch**、Branch を `master` / `/ (root)` にすると `https://<user>.github.io/aitest/` で公開される。

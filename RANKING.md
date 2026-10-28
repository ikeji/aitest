# 順位

tier や点数とは別に、直接比べた結果で順位を決める。
`build_index.py` がこのファイルの `a > b` 行を読んで、左を上に並べる。
制約で決まらないところは tier → rules → effects → sound → date の順。

- 名前は run ディレクトリ名。タイムスタンプは省略できる (`opus5` = `opus5-202609022218`)。
- `a > b > c` のように続けて書ける。`#` 以降はコメント。
- tier をまたいでもよい (tier を後で変えても順位はそのまま)。
- 矛盾 (循環) があれば build 時に警告して、その部分の制約は無視する。

```
opus5 > sonnet5
opus5 > gpt6astra   # effect が派手
fable51 > qwen38flashnext   # effect が派手
qwen38flashnext > opus5   # effect が全画面に広がり、種類も多い
gpt6astra > glm53flash-202609090231   # glm は派手で特に花火の effect は素晴らしいが、ハードドロップの effect がバグっているのと種類が少ない
glm53flash-202609090231 > sonnet5   # sonnet も派手だが、派手さが単調なのと BGM がメロディになっていない
glm53flash-202609090231 > grok46
grok46 > sonnet5
grok46 > qwen38-202609160535   # EXL3 版。qwen38 だけだと 9/2 の GGUF 版と曖昧なのでフルネーム
opus55-202609231032 > qwen38flashnext   # effect は opus55 が上。BGM はどちらも同じシーケンスの繰り返しだが opus55 はテンポが速くなっていく
mimo26pro > qwen38flashnext
opus55-202609231032 > mimo26pro
spacebunny-202609240250 > qwen38-202609160535   # Max think 版。00:45 の run と曖昧なのでフルネーム
grok46 > spacebunny-202609240250
sonnet55 > qwen38flashnext
sonnet55 > mimo26pro
opus55-202609231032 > sonnet55
opus55-202610141029 > qwen38flashnext   # 10/14 の 2 回目の run
opus55-202610141029 > mimo26pro
opus55-202610141029 > sonnet55
opus55-202609231032 > opus55-202610141029   # 同じモデルの 2 回。9/23 の方が上
sonnet5 > deepseekv411017

# tier B
deepseekv4flash > deepseekv41flash-202609111136   # rules 優先。9/11 の opencode 版 (9/16 の Deepseek Harness 版と曖昧なのでフルネーム)
hy4preview > gpt56terra
deepseekv4flash > gemma4
deepseekv4flash > gpt55
hy4preview > deepseekv41flash-202609111136
gpt55 > gemma4
grok47 > gemma4
gpt55 > grok47
mimo26flash > gemma4
grok47 > mimo26flash
haiku55 > deepseekv4flash
haiku55 > beam
beam > deepseekv4flash
haiku55 > ornith
ornith > beam
ornith > lagunas21
beam > lagunas21
deepseekv4flash > lagunas21
gpt55 > lagunas21
lagunas21 > grok47
qwen38flashnext > glm53flash-202610280446   # ローカル llama.cpp 版。9/9 の opencode 版と曖昧なのでフルネーム
qwen38-202609160535 > glm53flash-202610280446 > sonnet5

# gemma4 を基準にする。F は全部 gemma4 より下
gemma4 > devstral2
gemma4 > glm45air
gemma4 > glm47flash
gemma4 > gpt54mini
gemma4 > gpt56luna
gemma4 > haiku45
gemma4 > minimaxm27
gemma4 > minimaxm3
gemma4 > nemotron3super
gemma4 > qwen36
gemma4 > qwen3coder
gemma4 > qwen3codernext
gemma4 > spacebunny-202609240045   # 00:45 の run。02:50 の Max think 版と曖昧なのでフルネーム
gemma4 > bigpickle
gemma4 > fledgealpha
gemma4 > sarashina3mini
gemma4 > sarashina3nano
gemma4 > nemotron35supervl
gemma4 > northminicode
gemma4 > minimaxm31flash
gemma4 > solarmini4
gemma4 > step37flash
gemma4 > lagunaxs21
gemma4 > gemma431b
gemma4 > museglimmer
```

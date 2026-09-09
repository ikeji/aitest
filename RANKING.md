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
gpt6astra > glm53flash   # glm は派手で特に花火の effect は素晴らしいが、ハードドロップの effect がバグっているのと種類が少ない
glm53flash > sonnet5   # sonnet も派手だが、派手さが単調なのと BGM がメロディになっていない

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
```

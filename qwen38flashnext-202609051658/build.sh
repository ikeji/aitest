#!/bin/sh
# assemble index.html (the game) and test.html (game + inert test harness), then test
set -e
cd "$(dirname "$0")"
PARTS="parts/01_head.html parts/02_logic.js.html parts/03_sound.js.html parts/04_fx.js.html parts/05_render.js.html parts/06_game.js.html"

cat $PARTS parts/07_tail.html > index.html
cat $PARTS parts/06b_autotest.js.html parts/07_tail.html > test.html

# syntax check the JavaScript of both documents
for f in index.html test.html; do
  sed -n '/^<script>/,/^<\/script>/p' "$f" | sed '1d;$d' > "/tmp/${f%.html}.check.js"
  node --check "/tmp/${f%.html}.check.js"
done

node test/logic_test.mjs
echo "index.html: $(wc -c < index.html) bytes   test.html: $(wc -c < test.html) bytes"

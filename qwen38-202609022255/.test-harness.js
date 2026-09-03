"use strict";
/* Headless smoke-test harness for index.html */
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1] + "\n;globalThis.__Game = Game;";

/* ---------- DOM / canvas stubs ---------- */
const noop = () => {};
function makeCtx(canvasEl){
  const target = { canvas: canvasEl };
  return new Proxy(target, {
    get(t, prop){
      if (prop in t) return t[prop];
      if (prop === "createLinearGradient" || prop === "createRadialGradient")
        return () => ({ addColorStop: noop });
      if (prop === "measureText") return () => ({ width: 10 });
      return noop; // generic method
    },
    set(t, prop, v){ t[prop] = v; return true; },
  });
}
const els = {};
function makeEl(id){
  const el = {
    id,
    style: {},
    children: [],
    textContent: "",
    width: 300, height: 150,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    listeners: {},
    addEventListener(ev, fn){ (el.listeners[ev] ||= []).push(fn); },
    click(){ (el.listeners.click || []).forEach(f => f({ preventDefault: noop })); },
    appendChild(c){ el.children.push(c); },
    getContext(){ if (!el._ctx) el._ctx = makeCtx(el); return el._ctx; },
  };
  return el;
}
const docListeners = {};
const documentStub = {
  getElementById(id){ return els[id] || (els[id] = makeEl(id)); },
  addEventListener(ev, fn){ (docListeners[ev] ||= []).push(fn); },
  createElement(tag){ return makeEl("dyn:" + tag); },
  body: makeEl("body"),
};

let rafCb = null;
let simTime = 0; // eslint-disable-line
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => simTime },
  addEventListener: noop,
  requestAnimationFrame: cb => { rafCb = cb; return 1; },
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1,
  innerWidth: 1440,
  innerHeight: 900,
  document: documentStub,
  window: null, // set below
  CanvasRenderingContext2D: function(){}, // polyfill guard target
};
sandbox.window = sandbox; // self reference like a browser
sandbox.globalThis = sandbox;

const ctx2dProto = sandbox.CanvasRenderingContext2D.prototype = {};
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: "game.js" });

const Game = sandbox.__Game;

/* ---------- helpers ---------- */
function key(code, down = true){
  const ev = { code, repeat: false, preventDefault: noop };
  (docListeners[down ? "keydown" : "keyup"] || []).forEach(f => f(ev));
}
function frames(n, dtMs = 16.7){
  for (let i = 0; i < n; i++){
    simTime += dtMs;
    const cb = rafCb; rafCb = null;
    if (!cb) throw new Error("rAF chain broken");
    cb(simTime);
  }
}

let failures = 0;
function assert(cond, msg){
  if (cond) console.log("  ok  -", msg);
  else { console.error("  FAIL-", msg); failures++; }
}

/* ---------- run ---------- */
console.log("== boot ==");
frames(5);
assert(Game.state === "menu", "initial state is menu");

console.log("== start game (Enter) ==");
key("Enter");
frames(2);
assert(Game.state === "play", "state is play after Enter");

console.log("== movement & DAS ==");
const b0 = Game.debug.board.map(r => r.slice());
key("ArrowLeft"); frames(1);
key("ArrowLeft", false);
key("ArrowRight"); frames(1);
key("ArrowRight", false);
key("ArrowUp"); frames(1);      // rotate CW
key("KeyZ"); frames(1);         // rotate CCW
frames(30);
assert(Game.state === "play", "still playing after inputs");

console.log("== gravity eventually locks a piece ==");
frames(30 * 60); // 30s
const b1 = Game.debug.board;
let filled1 = 0; for (const r of b1) for (const v of r) if (v) filled1++;
assert(filled1 > 0, "pieces lock into board over time (cells=" + filled1 + ")");

console.log("== soft drop ==");
key("ArrowDown"); frames(10); key("ArrowDown", false);
frames(30);
assert(Game.state === "play", "still playing after soft drop");

console.log("== hold ==");
key("KeyC"); frames(2);
assert(Game.state === "play", "hold works");

console.log("== TETRIS clear (fill 4 bottom rows, hard drop) ==");
const d = Game.debug;
d.fillRow(21); d.fillRow(20); d.fillRow(19); d.fillRow(18);
const scoreBefore = d.score, linesBefore = d.lines;
key("Space"); frames(2);
assert(Game.state === "clear", "state=clear while animating");
frames(40); // wait out clear anim (0.55s)
assert(d.lines === linesBefore + 4, "lines +4 (now " + d.lines + ")");
assert(d.score > scoreBefore, "score increased (+" + (d.score - scoreBefore) + ")");
assert(Game.state === "play", "back to play after clear");

console.log("== combo / 2nd clear ==");
d.fillRow(21); d.fillRow(20);
key("Space"); frames(2); frames(40);
assert(d.lines === linesBefore + 6, "double clear adds 2 more lines (now " + d.lines + ")");
assert(d.score > scoreBefore, "score keeps increasing");

console.log("== level up at 10 lines (effect mode switch) ==");
d.fillRow(21); d.fillRow(20); d.fillRow(19); d.fillRow(18);
key("Space"); frames(2); frames(40);
assert(d.lines >= 10, "reached 10+ lines (" + d.lines + ")");
assert(d.level >= 2, "level went up (" + d.level + ")");

console.log("== T-Spin detection (T-SPIN 0: 400 / T-Spin Double 1200) ==");
// まず非B2Bクリア(シングル)で b2b=false にリセット
[21].forEach(r => d.fillRow(r));
key("Space"); frames(2); frames(40);
assert(Game.state === "play", "pre: single clear done, b2b reset");
const lvlNow = d.level;
const r0 = d.tspin0();
assert(r0.state === "play", "T-Settle: no clear, play continues (state=" + r0.state + ")");
assert(r0.gained === 400 * lvlNow, "T-Settle scored " + r0.gained + " (expect " + 400*lvlNow + ")");
const r1 = d.tspinDouble();
assert(r1.state === "clear", "T-Spin Double triggers clear anim (state=" + r1.state + ")");
assert(r1.gained === 1200 * lvlNow, "T-Spin Double scored " + r1.gained + " (expect " + 1200*lvlNow + ")");
frames(40); // anim完了
assert(d.lines >= r1.linesBefore + 2, "T-Spin Double cleared 2 lines (lines=" + d.lines + ")");

console.log("== B2B ×1.5 (difficult clears back-to-back) ==");
// b2b=true・combo=0・level=2 のままTスピンダブルを再度 → 1200×2×1.5 + 50×1×2 = 3700
const r3 = d.tspinDouble();
assert(r3.state === "clear", "B2B T-spin double clears");
assert(r3.gained === 3700, "B2B ×1.5: got " + r3.gained + " (expect 3700)");
frames(60);

console.log("== lock out (piece locks fully in hidden rows) ==");
d.forcePiece("O"); // 隠し行(0,1)にOが収まり、下は cols 2-9 で塞がる(満行なし)
frames(60); // ロックディレイ 500ms を超える
assert(Game.state === "over", "lock out triggers game over (state=" + Game.state + ")");

console.log("== game over (block out at spawn) ==");
// R でリスタートしてから spawn zone を塞ぐ
key("KeyR"); frames(2);
assert(Game.state === "play", "restart works (R)");
[3,4,5].forEach(c => { d.setCell(0,c); d.setCell(1,c); });
d.setCell(1,6);
frames(1600); // 現在ピースが自然落下(レベル1で約20秒)→ロック→次スピース生成で衝突
assert(Game.state === "over", "block out triggers game over (state=" + Game.state + ")");

console.log("== 7-bag (fresh queue, first 7 = permutation) ==");
const q7 = d.freshBag();
const isPerm = new Set(q7).size === 7 && q7.every(t => "IOSZJLT".includes(t));
assert(isPerm, "first 7 pieces are a 7-bag permutation (" + q7.join("") + ")");

console.log(failures === 0 ? "\nALL TESTS PASSED" : "\n" + failures + " FAILURES");
process.exit(failures === 0 ? 0 : 1);

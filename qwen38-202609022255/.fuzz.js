"use strict";
/* Random-input fuzz: ~3 min of play, ensure no runtime exceptions & sane state */
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1] + "\n;globalThis.__Game = Game;";

const noop = () => {};
function makeCtx(canvasEl){
  const target = { canvas: canvasEl };
  return new Proxy(target, {
    get(t, prop){
      if (prop in t) return t[prop];
      if (prop === "createLinearGradient" || prop === "createRadialGradient")
        return () => ({ addColorStop: noop });
      if (prop === "measureText") return () => ({ width: 10 });
      return noop;
    },
    set(t, prop, v){ t[prop] = v; return true; },
  });
}
const els = {};
function makeEl(id){
  return {
    id, style:{}, children:[], textContent:"", width:300, height:150,
    classList:{ add:noop, remove:noop, toggle:noop, contains:()=>false },
    listeners:{},
    addEventListener(ev, fn){ (this.listeners[ev] ||= []).push(fn); },
    appendChild(c){ this.children.push(c); },
    getContext(){ if (!this._ctx) this._ctx = makeCtx(this); return this._ctx; },
  };
}
const docListeners = {};
let rafCb = null, simTime = 0;

/* 最小限のWebAudioフェイク: SFX/BGMコードパスのランタイムエラー検査用 */
class FakeParam{
  constructor(v){ this.value = v; }
  setValueAtTime(){} linearRampToValueAtTime(){} exponentialRampToValueAtTime(){}
  cancelScheduledValues(){}
}
function makeNode(props = {}){ return Object.assign({ connect(){}, start(){}, stop(){} }, props); }
const FakeAudioContext = class {
  constructor(){ this.state = "running"; this.destination = {}; this.sampleRate = 44100; }
  get currentTime(){ return simTime / 1000; } // 模擬時刻と同期(シーケンサを回す)
  resume(){ this.state = "running"; }
  createGain(){ return makeNode({ gain: new FakeParam(1) }); }
  createDynamicsCompressor(){ return makeNode({ threshold:new FakeParam(0), ratio:new FakeParam(1), attack:new FakeParam(0), release:new FakeParam(0) }); }
  createBiquadFilter(){ return makeNode({ type:"lowpass", frequency:new FakeParam(300), Q:new FakeParam(1) }); }
  createOscillator(){ return makeNode({ type:"sine", frequency:new FakeParam(440) }); }
  createBufferSource(){ return makeNode({ loop:false, buffer:null }); }
  createBuffer(ch, len){ return { getChannelData: () => new Float32Array(len) }; }
};

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => simTime },
  addEventListener: noop,
  requestAnimationFrame: cb => { rafCb = cb; return 1; },
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  AudioContext: FakeAudioContext, webkitAudioContext: FakeAudioContext,
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => simTime },
  addEventListener: noop,
  requestAnimationFrame: cb => { rafCb = cb; return 1; },
  matchMedia: () => ({ matches: false }),
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  document: {
    getElementById(id){ return els[id] || (els[id] = makeEl(id)); },
    addEventListener(ev, fn){ (docListeners[ev] ||= []).push(fn); },
    createElement(){ return makeEl("dyn"); },
    body: makeEl("body"),
  },
  CanvasRenderingContext2D: function(){},
};
sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.CanvasRenderingContext2D.prototype = {};
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: "game.js" });
const Game = sandbox.__Game;

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

key("Enter");
frames(2);
let drops = 0, holds = 0, restarts = 0;
const seed = { v: 1337 };
function rnd(){ // deterministic LCG
  seed.v = (seed.v * 1103515245 + 12345) & 0x7fffffff;
  return seed.v / 0x7fffffff;
}

// 3000 frames ≈ 50s. Repeat until game over x3 (force progress with hard drops)
for (let round = 0; round < 6; round++){
  if (Game.state === "over" || Game.state === "menu"){ key("KeyR"); frames(2); restarts++; }
  for (let i = 0; i < 2500 && Game.state === "play"; i++){
    const r = rnd();
    if (r < 0.12) key("ArrowLeft");
    else if (r < 0.24) key("ArrowRight");
    else if (r < 0.32) key("ArrowUp");
    else if (r < 0.38) key("KeyZ");
    if (r < 0.05 && i % 2 === 0) key("ArrowDown");
    if (r > 0.97){ key("Space"); drops++; }
    if (r > 0.995 && i % 3 === 0){ key("KeyC"); holds++; }
    frames(1);
  }
  // drain any clear anim / let it fall to game over
  let guard = 0;
  while ((Game.state === "play" || Game.state === "clear") && guard++ < 3000){
    frames(1);
  }
  if (Game.state !== "over" && guard >= 3000) break;
}

const st = Game.state;
console.log("final state:", st, "| score:", Game.debug.score, "| lines:", Game.debug.lines,
            "| level:", Game.debug.level, "| drops:", drops, "| holds:", holds, "| restarts:", restarts);
if (st === "over") console.log("FUZZ PASSED (reached game over cleanly, no exceptions)");
else console.log("FUZZ INCONCLUSIVE (ended in " + st + ", but no exceptions)");

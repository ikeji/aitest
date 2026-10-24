---
name: single-file-html-game
description: Build, verify, and test standalone HTML5 games (canvas + Web Audio + particles)
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [html, canvas, web-audio, game-dev, javascript, particles, verification]
    related_skills: [claude-design, dogfood]
---

# Single-File HTML Game Development

## Overview

Create, verify, and test single-file HTML5 games with canvas rendering, Web Audio API sound effects, and particle effects — all in one self-contained `index.html` with no external dependencies.

## When To Use

- User wants a browser game playable by opening one HTML file
- Game uses HTML5 Canvas for rendering
- Sound is generated via Web Audio API (not external audio files)
- Visual effects use DOM particles or canvas particles
- Verification is needed without a hosted server

## Prerequisites

- `node` (for syntax checking and headless testing)
- Browser tools (for interactive verification)

Do not require a web server — these games must work as `file://` URLs.

## Workflow

### 1. Architecture (Plan Before Code)

Structure the single HTML file in this order:

1. **HTML shell** — `<!DOCTYPE html>`, meta tags, `<title>`
2. **CSS** — all styles inline in `<style>`, covering:
   - Full-viewport canvas or grid-based board
   - Effects overlay (fixed position, pointer-events: none, z-index: 10)
   - UI panel (score, next queue, hold, controls)
   - Start screen overlay
3. **HTML body** — DOM elements: board container, info panel, effects overlay
4. **JavaScript** — single `<script>` block with all game code:
   - State management (board array, current piece, score, etc.)
   - Game logic (spawn, move, rotate, lock, clear lines)
   - Rendering (canvas draw or DOM manipulation)
   - Effects system (particles)
   - Sound system (Web Audio)
   - Input handling (keyboard)
   - Game loop (requestAnimationFrame)

### 2. Implementation Patterns

#### Canvas Board Rendering

```javascript
// Create canvas INSIDE the board div, do NOT use getElementById('board') as canvas
const canvas = document.createElement('canvas');
canvas.width = 300;
canvas.height = 660;
canvas.style.imageRendering = 'pixelated';
document.getElementById('board').appendChild(canvas);
const ctx = canvas.getContext('2d');
ctx.scale(2, 2); // Pixel art scaling
```

**Pitfall:** `document.getElementById('board')` returns the board `<div>`, not a canvas. Using `|| document.createElement('canvas')` is a bug — the `||` will never trigger since `getElementById` always returns the div. This causes `getContext('2d')` to fail silently.

#### Scale Factor Management

When using `ctx.scale(2, 2)`, all coordinates in draw calls must use the UNSCALED coordinate system. If canvas is 300x660 and scale is 2x, the logical coordinate space is 150x330. Use a constant:

```javascript
const PX = 14; // Block size in logical pixels (becomes 28px actual)
ctx.fillRect(x * PX, y * PX, PX, PX);
```

#### Game Loop

```javascript
let lastFrameTime = 0;
function gameLoop(time) {
  if (!lastFrameTime) lastFrameTime = time;
  const delta = time - lastFrameTime;
  lastFrameTime = time;
  
  update(time);   // Game logic
  render();       // Draw to canvas
  EFFECTS.update(); // Update particle DOM
  updateStats();  // Update UI text
  
  requestAnimationFrame(gameLoop);
}
```

Keep `update()` and `render()` separate — `requestAnimationFrame` calls both every frame.

#### State Object

Use a single state object rather than scattered globals:

```javascript
const State = {
  board: [],        // 2D array [row][col]
  current: null,    // { type, x, y, rotation }
  nextQueue: [],    // Array of upcoming piece types
  hold: null,
  score: 0,
  lines: 0,
  level: 1,
  effectLevel: 0,   // Drives explosion intensity
  gameOver: false,
  dropCounter: 0,
  dropInterval: 1000,
  lastTime: 0,
};
```

#### Board Array Layout

Use a board with hidden rows at the top to handle piece spawn above the visible area:

```javascript
const COLS = 10, ROWS = 22; // 20 visible + 2 spawn buffer rows
State.board = [];
for (let r = 0; r < ROWS; r++) {
  State.board.push(new Array(COLS).fill(null));
}
```

Render only rows 2..21 (the visible 20 rows), offsetting by `-2`:

```javascript
ctx.fillRect(x * PX, (y - 2) * PX, PX, PX);
```

### 3. JavaScript Structure (Single Script Block)

All JS in one `<script>` block, executed top-to-bottom:

1. **Constants** (COLS, ROWS, PIECES, SRS data)
2. **State declaration** (const State = {...})
3. **Board initialization** function
4. **Game logic functions** (spawn, isValid, lock, clearLines, etc.)
5. **Rendering** (canvas context creation, render function)
6. **UI rendering** (next queue, hold, stats)
7. **Effects system** (particles, configs, trigger, update)
8. **Sound system** (Web Audio wrapper, BGM, SE)
9. **Input handling** (key map, event listeners)
10. **Game loop** (requestAnimationFrame)
11. **Start function** and initialization calls

**Do not split** the script across multiple `<script>` tags — single file means single script.

### 4. Sound System (Web Audio API)

```javascript
const SOUND = {
  ctx: null,
  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  tone(freq, dur, type = 'sine', vol = 0.3) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = vol;
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  },
};
```

- Generate all sounds programmatically — no external audio files
- BGM: loop via `setTimeout` with array of [frequency, duration] notes
- SE: short tones (0.05-0.3s) with appropriate waveforms (sine, square, sawtooth)
- Call `SOUND.init()` before first audio playback (user gesture required on some browsers)

### 5. Effects System (DOM Particles)

```javascript
const EFFECTS = {
  particles: [],
  overlay: document.getElementById('effects-overlay'),
  configs: [
    // One config per effect level (10 lines = 1 level)
    { name: 'Basic', color: '#ff4400', count: 30, speed: 2, gravity: 0.3 },
    // ...20 configs for levels 0-20
  ],
  trigger(x, y, level, lineCount) {
    const config = this.configs[Math.min(level, this.configs.length - 1)];
    // Create count + lineCount*10 particles
  },
  update() {
    // Move, decay, and remove particles each frame
  },
};
```

- Use DOM elements (`<div class="particle">`) for effects, not canvas — easier to style with CSS filters
- Map `effectLevel = Math.floor(lines / 10)` to config index
- Position particles relative to viewport center, not document scroll
- Each particle gets: position, velocity, gravity, size, color, life, decay rate
- Remove DOM elements when particle dies to prevent memory leaks

### 6. Verification

Before declaring done, run the full verification:

```bash
# Syntax check
node --check /tmp/game_code.js

# Run verification harness
python3 verify_game.py index.html
```

#### Headlight Logic Testing (before browser)

Extract the JS and test game logic in Node.js by mocking browser APIs:

```python
import subprocess, tempfile

with open('index.html') as f:
    content = f.read()

# Extract JS between <script> tags
js_start = content.find('<script>') + 8
js_end = content.find('</script>')
js_code = content[js_start:js_end]

# Write test harness that mocks browser APIs
test_harness = '''
const document = {
  getElementById: () => ({ getContext: () => ({}), appendChild: () => {}, style: {} }),
  createElement: () => ({ getContext: () => ({}), style: {} }),
  addEventListener: () => {},
};
const AudioContext = function() { return { createOscillator: () => ({}), createGain: () => ({}) }; };
global.AudioContext = AudioContext;

// Game code here...

// Test game logic
State.board = [];
for (let r = 0; r < ROWS; r++) State.board.push(new Array(COLS).fill(null));
spawn();
console.log('Piece:', State.current.type);
'''

with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
    f.write(test_harness.replace('// Game code here...', js_code))
    tmp = f.name

result = subprocess.run(['node', tmp], capture_output=True, text=True)
```

**Pitfall:** When using `eval()` or `vm.runInContext` in Node to test browser JS, `const`/`function` declarations at the top level are scoped to the eval context, not the global object. Use `vm.createContext` and run code in that context, then access variables from the sandbox.

#### Browser Verification

After headlight testing passes:

1. Open with `new_tab('file:///path/to/game.html')`
2. Check start screen renders, click start button
3. Verify canvas exists in board div and has correct dimensions
4. Test keyboard input via `js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "w" }))')`
5. Verify state changes (`js('State.current.rotation')`)
6. Test line clears and effects via manual board manipulation:
   ```javascript
   for (let x = 0; x < 10; x++) State.board[21][x] = 'I';
   handleLineClear(4);
   ```
7. Check particles are created (`EFFECTS.particles.length`) and decay over time
8. Capture screenshot for visual confirmation

**Pitfall:** After 50+ line clears with thousands of particles, the browser may timeout due to DOM overload. Keep particle lifetime short (decay > 0.01/frame) or cap total particles.

## Pitfalls

- **Canvas creation**: `getElementById('board')` returns a `<div>`, not a `<canvas>`. The `|| document.createElement('canvas')` pattern is a bug — the div is truthy so the canvas is never created. Always use `document.createElement('canvas')` directly.

- **Duplicate object keys**: JavaScript object literals silently keep only the last value for duplicate keys. `{ 'Enter': 'hardDrop', 'Enter': null }` means Enter does nothing. Run `grep "'Enter'" file.js` to spot these.

- **Scale mismatch**: When using `ctx.scale(2, 2)`, all coordinates in draw calls use the UNSCALED space. If canvas is 300x660, logical space is 150x330. Mixing scaled and unscaled coordinates causes rendering offsets.

- **Hidden rows**: Piece spawn position is above the visible board. Use 2-4 hidden rows at the top of the board array. Offset by the hidden row count when rendering: `(boardY - 2) * PX`.

- **Soft drop timing**: Use a separate timer with `lastSoftDropTime` rather than the main drop counter, or the piece falls at normal speed during soft-drop. Use a 30-50ms interval for smooth soft-drop.

- **Back-to-back state**: Set `b2bActive = true` on a tetris clear, then check it on the NEXT clear. If the next clear is also a tetris or 3-line clear, apply the back-to-back bonus. Reset `b2bActive = false` on non-tetris clears.

- **`this` binding in methods**: When calling `SOUND.bgm.play()`, the `this` inside `play()` refers to the `bgm` object, not `SOUND`. Access sibling methods via the parent: use `SOUND.playTone()` inside `bgm.play()`, not `this.playTone()`.

- **Particle coordinate system**: Position particles relative to viewport center, not document coordinates. Use `window.innerWidth / 2` and `window.innerHeight / 2` as the explosion origin, then subtract the board center offset.

- **`requestAnimationFrame` in tests**: When testing via `js()` calls, the RAF loop runs between your test calls. Account for this by checking state after a `setTimeout` delay, not immediately.

## References

- `references/tetris-guideline.md` — Guideline rules: scoring table, B2B, SRS summary
- `references/effect-configs.md` — Particle effect config table (20 levels)
- `scripts/verify_game.py` — Verification harness script
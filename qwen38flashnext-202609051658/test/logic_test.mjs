/* Headless rules test — extracts the pure logic block out of index.html and
 * exercises SRS rotation, kicks, scoring, spins, clears and gravity collapse.
 * run: node test/logic_test.mjs     (no dependencies)                     */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/const COLS = 10[\s\S]*?\/\/__LOGIC_END__/);
if (!m) { console.error('FATAL: logic block not found in index.html'); process.exit(2); }
const L = new Function(m[0] + `
  return { COLS, ROWS, HIDE, HEIGHT, SHAPES, TYPES, KICKS, SPAWN_X, idx, createState, spawn, refill,
           fits, move, softDrop, rotate, ghostY, hardDrop, grounded, spinInfo, lockPiece, commitClear,
           stackTop, levelFromLines, levelGravity, resetLock, cellsOf };`)();

let pass = 0, fail = 0;
const ok = (cond, name, extra) => {
  if (cond) pass++;
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '   -> ' + JSON.stringify(extra) : '')); }
};
const group = n => console.log('\n== ' + n + ' ==');
const setCell = (s, x, y, t) => { s.grid[L.idx(x, y)] = t || null; };
const fillRow = (s, y, cols) => { for (const x of cols) setCell(s, x, y, 'Z'); };
const cellList = s => { const o = []; for (let y = 0; y < L.HEIGHT; y++) for (let x = 0; x < L.COLS; x++) if (s.grid[L.idx(x, y)]) o.push([x, y]); return o; };
const put = (t, r, x, y) => { const s = L.createState(); s.phase = 'playing'; s.piece = { t, r, x, y, minY: y }; return s; };
const at = (s, x, y) => !!s.grid[L.idx(x, y)];
const worldCells = p => L.cellsOf(p).map(([a, b]) => [p.x + a, p.y + b]);
const BOTTOM = L.HEIGHT - 1;

/* ---- 1. piece geometry / SRS states ---------------------------------- */
group('shapes & SRS rotation');
for (const t of L.TYPES) {
  const box = t === 'I' ? 4 : (t === 'O' ? 4 : 3);
  const rotCW = cs => cs.map(([x, y]) => [box - 1 - y, x]);
  const norm = cs => cs.map(c => c.slice()).sort((p, q) => (p.join() < q.join() ? -1 : 1)).map(c => c.join(',')).join(' ');
  for (let r = 0; r < 4; r++) {
    const cs = L.SHAPES[t][r];
    ok(cs.length === 4 && new Set(cs.map(c => c.join(','))).size === 4, `${t}${r}: 4 distinct cells`);
    ok(cs.every(([x, y]) => x >= 0 && x < box && y >= 0 && y < box), `${t}${r}: inside the ${box}x${box} box`, cs);
    ok(norm(rotCW(L.SHAPES[t][(r + 3) % 4])) === norm(cs), `${t}${r}: is the CW rotation of state ${r - 1}`);
  }
  ok(norm(L.SHAPES.T[0]) === '0,1 1,0 1,1 2,1', 'T state 0 = flat bottom, nub up', norm(L.SHAPES.T[0]));
  ok(L.SHAPES.I[0].every(c => c[1] === 1), 'I state 0 = middle row of the box');
  ok(norm(L.SHAPES.O[0]) === norm(L.SHAPES.O[1]) && norm(L.SHAPES.O[2]) === norm(L.SHAPES.O[3]),
    'O is symmetric: rotation never changes it');
}

/* ---- 2. kick tables vs. tetris.wiki (published y-up) ------------------ */
group('wall kick tables');
const WIKI_J = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
const WIKI_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};
const flipY = t => t.map(([x, y]) => [x, -y]);
for (const k in WIKI_J) {
  ok(JSON.stringify(L.KICKS['j' + k]) === JSON.stringify(flipY(WIKI_J[k])), 'JLSTZ kicks ' + k, L.KICKS['j' + k]);
  ok(JSON.stringify(L.KICKS['i' + k]) === JSON.stringify(flipY(WIKI_I[k])), 'I kicks ' + k, L.KICKS['i' + k]);
}
ok(L.KICKS['o0>1'].length === 1 && !L.KICKS['o0>1'][0][0], 'O does not kick');
ok(!!L.KICKS['j0>2'] && !!L.KICKS['i1>3'], '180 flips have kick lists');

/* ---- 3. collision & rotation ----------------------------------------- */
group('collision & rotation');
{
  const s = put('I', 1, -1, 10);                        /* vertical I hugging the left wall */
  ok(L.fits(s.grid, 'I', 1, -1, 10), 'vertical I with box x=-1 is legal');
  ok(!L.fits(s.grid, 'I', 1, -3, 10), 'box too far left is illegal');
  const r = L.rotate(s, -1);                            /* R -> 0 has to kick away from the wall */
  ok(r === 1, 'I R>0 uses wall kick test #2', r);
  ok(s.piece.x === 1 && s.piece.r === 0, 'I ended flat at x=1', [s.piece.x, s.piece.r]);
  const sf = put('I', 1, 4, 10);
  ok(L.rotate(sf, -1) === 0 && sf.piece.x === 4, 'no kick when there is room', [sf.piece.x]);
  const sfl = put('T', 0, 4, 10);
  ok(L.rotate(sfl, 2) === 0 && sfl.piece.r === 2, 'flip 0 -> 2', sfl.piece.r);
  ok(L.rotate(sfl, 2) === 0 && sfl.piece.r === 0, 'flip back to 0', sfl.piece.r);
  ok(L.rotate(put('O', 0, 4, 10), 1) === false, 'O never rotates');
  const s2 = put('T', 0, 0, 10);
  for (let y = 7; y < 17; y++) for (let x = 0; x < 5; x++) setCell(s2, x, y, 'Z');
  for (const [cx, cy] of worldCells(s2.piece)) setCell(s2, cx, cy, null);
  const snap = JSON.stringify([s2.piece.x, s2.piece.y, s2.piece.r]);
  ok(L.rotate(s2, 1) === false, 'rotation fails when every kick test is blocked');
  ok(JSON.stringify([s2.piece.x, s2.piece.y, s2.piece.r]) === snap, 'piece untouched on failure');
  ok(L.rotate(s2, 2) === false, 'flip blocked as well');
}
{
  /* randomised: successful rotations are legal, use the first passing test and
     never touch the board */
  let bad = 0, tested = 0;
  for (let trial = 0; trial < 60000 && tested < 2500; trial++) {
    const s = L.createState(); s.phase = 'playing';
    for (let y = 0; y < L.HEIGHT; y++) for (let x = 0; x < L.COLS; x++) if (Math.random() < .3) s.grid[L.idx(x, y)] = 'Z';
    const t = L.TYPES[(Math.random() * 7) | 0];
    const r0 = (Math.random() * 4) | 0, x0 = ((Math.random() * 12) | 0) - 1, y0 = 2 + ((Math.random() * 18) | 0);
    s.piece = { t, r: r0, x: x0, y: y0, minY: y0 };
    if (!L.fits(s.grid, t, r0, x0, y0)) continue;
    const before = cellList(s).length;
    const dir = [1, -1, 2][(Math.random() * 3) | 0];
    const r = L.rotate(s, dir);
    tested++;
    if (r === false) {
      if (s.piece.x !== x0 || s.piece.y !== y0 || s.piece.r !== r0 || s.spinFlag) bad++;
      continue;
    }
    const to = s.piece.r;
    for (const [cx, cy] of worldCells(s.piece)) {
      if (cx < 0 || cx >= L.COLS || cy >= L.HEIGHT) bad++;
      else if (cy >= 0 && s.grid[L.idx(cx, cy)]) bad++;
    }
    if (cellList(s).length !== before) bad++;               /* board untouched */
    const tests = L.KICKS[(t === 'I' ? 'i' : 'j') + r0 + '>' + to];
    if (!tests) { bad++; continue; }
    const ax = s.piece.x - tests[r][0], ay = s.piece.y - tests[r][1];
    if (ax !== x0 || ay !== y0) bad++;                        /* anchor math */
    for (let i = 0; i < r; i++) if (L.fits(s.grid, t, to, ax + tests[i][0], ay + tests[i][1])) bad++;
  }
  ok(tested > 1000, 'enough random rotations exercised', tested);
  ok(bad === 0, 'random rotations are table-consistent', bad);
}

/* ---- 4. 7-bag -------------------------------------------------------- */
group('7-bag randomiser');
{
  const s = L.createState(); L.refill(s, 5);
  const seq = [];
  for (let i = 0; i < 7 * 60; i++) { seq.push(s.next.shift()); L.refill(s, 5); }
  let bad = 0;
  for (let b = 0; b < 60; b++) if (new Set(seq.slice(b * 7, b * 7 + 7)).size !== 7) bad++;
  ok(bad === 0, 'every 7-piece window holds all 7 tetrominoes', bad);
  ok(seq.every(t => L.TYPES.includes(t)), 'only valid tetrominoes');
}

/* ---- 5. clearing, gravity, scoring ----------------------------------- */
group('line clear & gravity');
{
  const s = L.createState(); s.phase = 'playing';
  fillRow(s, BOTTOM, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  setCell(s, 0, BOTTOM - 3, 'J');                        /* a block floating above */
  s.piece = { t: 'I', r: 1, x: 7, y: 6, minY: 6 };       /* vertical I over column 9 */
  L.hardDrop(s);
  ok(Math.max(...worldCells(s.piece).map(c => c[1])) === BOTTOM, 'vertical I reached the floor', worldCells(s.piece));
  const res = L.lockPiece(s, { spin: false, mini: false });
  ok(res.rows.length === 1 && res.pts === 100 && res.name === 'SINGLE', 'single: 1 row, 100 pts', [res.rows, res.pts, res.name]);
  ok(s.lines === 1 && s.combo === 0, 'line + combo counters', [s.lines, s.combo]);
  L.commitClear(s, res.rows);
  ok(cellList(s).filter(([x]) => x === 9).length === 3, 'the I lost its cleared cell', cellList(s));
  ok(at(s, 0, BOTTOM - 2), 'the floating block fell exactly one row', cellList(s));
  ok(!cellList(s).some(([, y]) => y > BOTTOM), 'nothing below the floor');
}
{
  /* several rows at once: everything above drops by the number of cleared rows */
  const s = L.createState(); s.phase = 'playing';
  fillRow(s, BOTTOM, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  fillRow(s, BOTTOM - 1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  setCell(s, 3, BOTTOM - 2, 'J');
  setCell(s, 4, BOTTOM - 5, 'J');
  L.commitClear(s, [BOTTOM, BOTTOM - 1]);
  ok(at(s, 3, BOTTOM - 0) && !at(s, 3, BOTTOM - 2), 'block fell exactly two rows', cellList(s));
  ok(at(s, 4, BOTTOM - 3), 'higher block fell exactly two rows too', cellList(s));
  ok(!at(s, 0, BOTTOM) && !at(s, 0, BOTTOM - 1), 'the cleared rows are empty');
}
{
  /* score table (level multiplied) */
  const score = (rows, level) => {
    const s = L.createState(); s.phase = 'playing'; s.level = level;
    for (const y of rows) fillRow(s, y, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    s.piece = { t: 'O', r: 0, x: 3, y: 3, minY: 3 };       /* lands inside the full rows */
    return L.lockPiece(s, { spin: false, mini: false });
  };
  ok(score([BOTTOM], 1).pts === 100, 'single = 100');
  ok(score([BOTTOM - 1, BOTTOM], 1).pts === 300, 'double = 300');
  ok(score([BOTTOM - 2, BOTTOM - 1, BOTTOM], 1).pts === 500, 'triple = 500');
  const q = score([BOTTOM - 3, BOTTOM - 2, BOTTOM - 1, BOTTOM], 2);
  ok(q.pts === 1600 && q.isTetris && q.name === 'TETRIS', 'tetris = 800 x level', [q.pts, q.isTetris]);
}
{
  /* combo chain */
  const s = L.createState(); s.phase = 'playing';
  const clearOne = () => {
    fillRow(s, BOTTOM, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    s.piece = { t: 'O', r: 0, x: 3, y: 3, minY: 3 };
    const r = L.lockPiece(s, { spin: false, mini: false });
    L.commitClear(s, r.rows);
    return r;
  };
  const a = clearOne();
  ok(a.pts === 100 && s.combo === 0, 'first clear has no combo bonus', [a.pts, s.combo]);
  const b = clearOne();
  ok(b.pts === 150 && s.combo === 1, 'combo x1 = +50', [b.pts, s.combo]);
  const c = clearOne();
  ok(c.pts === 200 && s.combo === 2, 'combo x2 = +100', [c.pts, s.combo]);
  s.piece = { t: 'O', r: 0, x: 3, y: 3, minY: 3 };
  const d = L.lockPiece(s, { spin: false, mini: false });
  ok(d.rows.length === 0 && s.combo === -1, 'a lock without a clear breaks the combo', [s.combo]);
}
{
  /* back to back */
  const b = L.createState(); b.phase = 'playing';
  const quad = () => {
    for (let y = BOTTOM - 3; y <= BOTTOM; y++) fillRow(b, y, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    b.piece = { t: 'O', r: 0, x: 3, y: 3, minY: 3 };
    const r = L.lockPiece(b, { spin: false, mini: false });
    L.commitClear(b, r.rows);
    return r;
  };
  const single = () => {
    fillRow(b, BOTTOM, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    b.piece = { t: 'O', r: 0, x: 3, y: 3, minY: 3 };
    const r = L.lockPiece(b, { spin: false, mini: false });
    L.commitClear(b, r.rows);
    return r;
  };
  const t1 = quad();
  ok(t1.pts === 800 && b.b2b === true, 'first tetris 800, b2b armed', [t1.pts, b.b2b]);
  const t2 = quad();
  ok(t2.b2b === true && t2.pts === 1200 + 50, 'b2b tetris 1200 + combo 50', [t2.pts]);
  const t3 = single();
  ok(t3.b2b === false && b.b2b === false, 'a plain single breaks b2b', [t3.b2b, b.b2b]);
}
{
  /* perfect clear */
  const s = L.createState(); s.phase = 'playing';
  fillRow(s, BOTTOM, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  fillRow(s, BOTTOM - 1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  s.piece = { t: 'O', r: 0, x: 3, y: BOTTOM - 2, minY: BOTTOM - 2 };
  const res = L.lockPiece(s, { spin: false, mini: false });
  ok(res.perfect === true && res.rows.length === 2, 'perfect clear detected', [res.perfect, res.rows]);
  ok(res.pts === 300 + 1200, 'double + perfect bonus', res.pts);
  ok(s.stats.perfect === 1, 'perfect stat recorded');
  ok(res.lockedCells.length === 4, 'locked cells reported for the FX layer');
}
{
  /* top out: locking entirely above the visible field */
  const s = L.createState(); s.phase = 'playing';
  s.piece = { t: 'O', r: 0, x: 3, y: -2, minY: -2 };
  const res = L.lockPiece(s, { spin: false, mini: false });
  ok(res.topOut === true, 'locking above the ceiling is a top out', res.topOut);
}

/* ---- 6. T-spin ------------------------------------------------------- */
group('T-spin detection');
{
  /* 3-corner rule truth table (corners TL TR BR BL around the nub centre) */
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const probe = (r, mask, kick) => {
    const s = L.createState(); s.phase = 'playing';
    const p = { t: 'T', r, x: 4, y: 10, minY: 10 };
    s.piece = p; s.spinFlag = { dir: 1, kick: kick || 0 };
    mask.forEach((f, i) => { if (f) setCell(s, 5 + C[i][0], 11 + C[i][1], 'Z'); });
    return L.spinInfo(s, p);
  };
  ok(probe(0, [1, 1, 0, 0], 0).spin === false, 'two corners is not a spin');
  ok(JSON.stringify(probe(0, [1, 1, 1, 0], 0)) === '{"spin":true,"mini":false}', 'state 0 with both top corners = full spin', probe(0, [1, 1, 1, 0], 0));
  ok(JSON.stringify(probe(0, [1, 0, 1, 1], 0)) === '{"spin":true,"mini":true}', 'one front corner, no kick = mini', probe(0, [1, 0, 1, 1], 0));
  ok(JSON.stringify(probe(0, [1, 0, 1, 1], 3)) === '{"spin":true,"mini":false}', 'a deep kick upgrades a mini', probe(0, [1, 0, 1, 1], 3));
  ok(probe(1, [1, 1, 1, 0], 0).mini === false, 'state R front pair = right corners');
  ok(probe(1, [1, 1, 0, 1], 0).mini === true, 'state R with one front corner = mini');
  ok(probe(2, [1, 0, 1, 1], 0).mini === false, 'state 2 front pair = bottom corners');
  ok(probe(3, [1, 1, 0, 1], 0).mini === false, 'state L front pair = left corners');
  ok(probe(3, [1, 1, 1, 1], 0).spin === true, 'four corners is a spin');
  const s4 = put('T', 2, 4, 20);                          /* nub centre on the floor row */
  s4.spinFlag = { dir: 1, kick: 0 };
  setCell(s4, 4, 20, 'Z');
  ok(L.spinInfo(s4, s4.piece).spin === true, 'the floor counts as a filled corner', L.spinInfo(s4, s4.piece));
  const s5 = put('J', 0, 4, 10);
  s5.spinFlag = { dir: 1, kick: 0 };
  fillRow(s5, 11, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  ok(L.spinInfo(s5, s5.piece).spin === false, 'only the T earns T-spins');
  const s6 = put('T', 0, 4, 10);
  ok(L.spinInfo(s6, s6.piece).spin === false, 'no rotation, no spin');
}
{
  /* a real TSD: the naive rotation is blocked by an overhang, only the last
     wall-kick test (left 1, down 2) fits -> 2 lines clear */
  const s = L.createState(); s.phase = 'playing';
  fillRow(s, BOTTOM, [0, 1, 2, 3, 5, 6, 7, 8, 9]);           /* hole at col 4 */
  fillRow(s, BOTTOM - 1, [0, 1, 2, 3, 6, 7, 8, 9]);          /* hole at 4 and 5 */
  fillRow(s, BOTTOM - 2, [0, 1, 2, 3, 5, 6, 8, 9]);          /* overhang + a gap so row 19 never fills */
  setCell(s, 4, 17, 'Z');                                    /* blocks kick tests 1 and 2 */
  s.piece = { t: 'T', r: 0, x: 4, y: 17, minY: 17 };
  ok(L.fits(s.grid, 'T', 0, 4, 17), 'T starts in a legal spot', worldCells(s.piece));
  const r = L.rotate(s, 1);
  ok(r === 4, 'only the 5th wall-kick test fits (TSD kick)', r);
  const spin = L.spinInfo(s, s.piece);
  ok(spin.spin === true && spin.mini === false, 'full T-spin detected', spin);
  const res = L.lockPiece(s, spin);
  ok(res.rows.length === 2, 'TSD clears two', res.rows);
  ok(res.name === 'T-SPIN DOUBLE' && res.pts === 1200, 'TSD scores 1200 at level 1', [res.name, res.pts]);
}
{
  /* spin scoring table */
  const spinLock = (spin, mini, rows, r, x, y, level) => {
    const s = L.createState(); s.phase = 'playing'; s.level = level || 1;
    setCell(s, 0, 5, 'Z');                                  /* keeps the board non-empty */
    for (const yy of rows) fillRow(s, yy, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    s.piece = { t: 'T', r, x, y, minY: y };
    for (const [cx, cy] of worldCells(s.piece)) setCell(s, cx, cy, null);   /* carve the footprint */
    return L.lockPiece(s, { spin, mini });
  };
  const n1 = spinLock(true, false, [BOTTOM], 0, 3, BOTTOM - 1);
  ok(n1.name === 'T-SPIN SINGLE' && n1.pts === 800 && n1.rows.length === 1, 'TSS = 800', [n1.name, n1.pts, n1.rows]);
  const n2 = spinLock(true, true, [BOTTOM], 0, 3, BOTTOM - 1);
  ok(n2.name === 'T-SPIN MINI SINGLE' && n2.pts === 200, 'mini single = 200', [n2.name, n2.pts]);
  const n3 = spinLock(true, false, [BOTTOM - 2, BOTTOM - 1, BOTTOM], 0, 3, BOTTOM - 2);
  ok(n3.pts === 1600 && n3.name === 'T-SPIN TRIPLE', 'TST = 1600', [n3.pts, n3.name]);
  const n4 = spinLock(true, false, [BOTTOM], 0, 3, BOTTOM - 1, 3);
  ok(n4.pts === 2400, 'spins are level multiplied', n4.pts);
  const n5 = spinLock(true, false, [BOTTOM - 3, BOTTOM - 2, BOTTOM - 1, BOTTOM], 0, 3, BOTTOM - 3);
  ok(n5.pts === 2000 && n5.name === 'T-SPIN QUAD', 'Tsq = 2000', [n5.pts, n5.name]);
}
{
  /* the detector on realistic end positions (spinFlag set by the rotation,
     exactly as rotate() leaves it) rather than hand-written flags          */
  const realSpin = (rows, r, x, y, opt = {}) => {
    const s = L.createState(); s.phase = 'playing'; s.level = 1;
    setCell(s, 0, 3, 'Z');                                   /* keeps the board non-empty */
    for (const yy of rows) fillRow(s, yy, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const [cx, cy] of worldCells({ t: 'T', r, x, y })) setCell(s, cx, cy, null);
    for (const [cx, cy] of (opt.open || [])) setCell(s, cx, cy, null);
    for (const [cx, cy] of (opt.fill || [])) setCell(s, cx, cy, 'Z');
    s.piece = { t: 'T', r, x, y, minY: y };
    s.spinFlag = { dir: 1, kick: 0 };            /* as left by rotate() */
    return L.lockPiece(s, L.spinInfo(s, s.piece));
  };
  /* TSS: nub up, both front (lower) corners walled in */
  const tss = realSpin([BOTTOM], 2, 3, BOTTOM - 2, { fill: [[5, BOTTOM - 2]] });
  ok(tss.name === 'T-SPIN SINGLE' && tss.rows.length === 1 && tss.pts === 800, 'real TSS = 800', [tss.name, tss.pts, tss.rows.length]);
  /* TST: nub right inside a three row chimney */
  const tst = realSpin([BOTTOM - 2, BOTTOM - 1, BOTTOM], 0, 3, BOTTOM - 2);
  ok(tst.name === 'T-SPIN TRIPLE' && tst.rows.length === 3 && tst.pts === 1600, 'real TST = 1600', [tst.name, tst.pts, tst.rows.length]);
  /* Tsq: the same chimney four rows deep */
  const tsq = realSpin([BOTTOM - 3, BOTTOM - 2, BOTTOM - 1, BOTTOM], 0, 3, BOTTOM - 3);
  ok(tsq.name === 'T-SPIN QUAD' && tsq.rows.length === 4 && tsq.pts === 2000, 'real Tsq = 2000', [tsq.name, tsq.pts, tsq.rows.length]);
  /* mini: one front corner only, and nothing lines up */
  const mini = realSpin([BOTTOM], 2, 3, BOTTOM - 2, { open: [[5, BOTTOM]], fill: [[3, BOTTOM - 2], [5, BOTTOM - 2]] });
  ok(mini.name === 'T-SPIN MINI' && mini.rows.length === 0 && mini.pts === 100, 'mini with no line = 100', [mini.name, mini.pts, mini.rows.length]);
  ok(mini.perfect === false, 'a spin with leftovers is not a perfect clear');
}
{
  /* the spin flag lifetime: rotate sets it, a shift clears it, falling keeps it */
  const s = put('T', 0, 4, 6);
  ok(L.rotate(s, 1) !== false && s.spinFlag !== null, 'rotate sets the spin flag');
  L.softDrop(s);
  ok(s.spinFlag !== null, 'gravity keeps it');
  ok(L.move(s, 1) === true && s.spinFlag === null, 'a successful shift clears it');
  ok(L.spinInfo(s, s.piece).spin === false, 'therefore no spin when locking after a shift');
  const sf = put('T', 0, 4, 6);
  L.rotate(sf, 1);
  L.hardDrop(sf);
  ok(sf.spinFlag !== null, 'dropping does not clear the spin flag');
}

/* ---- 7. lock delay policy -------------------------------------------- */
group('lock delay resets');
{
  const s = put('T', 0, 4, 10);
  let granted = 0;
  for (let i = 0; i < 40; i++) { s.movedFlag = false; L.resetLock(s); if (s.movedFlag) granted++; }
  ok(granted === 15, 'at most 15 move resets per piece', granted);
  const s2 = put('T', 0, 4, 10);
  s2.lockResets = 99; s2.piece.minY = 5; s2.piece.y = 5;
  L.softDrop(s2);
  ok(s2.lockResets === 0, 'a new lowest row restores the reset budget', s2.lockResets);
  const s3 = put('T', 0, 4, 10);
  s3.lockResets = 99; s3.piece.minY = 5; s3.piece.y = 5; s3.movedFlag = false;
  L.move(s3, 1);
  ok(s3.lockResets === 99 && s3.movedFlag === false, 'sideways moves cannot refill the budget', [s3.lockResets]);
}

/* ---- 8. game over / progression -------------------------------------- */
group('game over & progression');
{
  const s = L.createState(); s.phase = 'playing';
  for (let y = 0; y < 6; y++) fillRow(s, y, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  ok(L.spawn(s) === false && s.phase === 'over', 'spawn into a blocked area ends the game', s.phase);
  const s2 = L.createState(); s2.phase = 'playing';
  ok(L.spawn(s2) === true && s2.phase === 'playing', 'clean spawn works');
  ok(s2.next.length >= 5, 'next queue previews 5', s2.next.length);
  const sp = s2.piece;
  ok(sp.x === L.SPAWN_X[sp.t] && sp.y === 0, 'pieces spawn centred on the top rows', [sp.x, sp.y]);
  ok(L.levelFromLines(0, 1) === 1 && L.levelFromLines(9, 1) === 1 && L.levelFromLines(10, 1) === 2 && L.levelFromLines(99, 3) === 10,
    'level = 1 + floor(lines / 10)');
  ok(L.levelGravity(1) < L.levelGravity(10) && L.levelGravity(200) <= 20, 'gravity rises with level and caps');
  const s3 = put('O', 0, 3, 0);
  for (let x = 0; x < L.COLS; x++) setCell(s3, x, 12, 'Z');
  ok(L.ghostY(s3, s3.piece) === 9, 'ghost rests on the blocker row', L.ghostY(s3, s3.piece));
  ok(L.grounded(s3, s3.piece) === false, 'not grounded while floating');
  ok(L.grounded(s3, { t: 'O', r: 0, x: 3, y: 9, minY: 0 }) === true, 'grounded when resting on the stack');
  const s4 = L.createState();
  ok(L.stackTop(s4) === L.HEIGHT, 'empty stack reports HEIGHT');
}

console.log('\n' + (fail ? 'FAILED  ' + fail + ' of ' : 'ALL PASS  ') + (pass + fail) + ' assertions');
process.exit(fail ? 1 : 0);

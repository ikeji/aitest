/**
 * 派手エフェクト・テトリス
 * Tetris Guideline 準拠のテトリスゲーム
 * ライン消去ごとに画面が爆発するエフェクトを実装
 */

// カラー定義 (Tetris Guideline 7色 + 背景)
const COLORS = {
  I: '#ff00ff', // マゼンタ
  O: '#ffff00', // イエロー
  T: '#00ffff', // シアン
  S: '#00ff00', // グリーン
  Z: '#ff0000', // レッド
  J: '#0000ff', // ブルー
  L: '#ffa500', // オレンジ
  BG: '#1a0a2e',
};

// ピースの形状 (Tetris Guideline 7ピース)
const PIECES = [
  // I piece
  [[1, 5, 9, 13], [4, 5, 6, 7]],
  // O piece
  [[1, 2, 5, 6]],
  // T piece
  [[1, 2, 5, 9], [0, 4, 5, 6], [1, 5, 6, 10], [2, 5, 9, 10]],
  // S piece
  [[6, 7, 9, 10], [1, 5, 4, 8]],
  // Z piece
  [[1, 2, 5, 9], [0, 4, 5, 6]],
  // J piece
  [[1, 2, 5, 9], [0, 4, 5, 6], [1, 5, 7, 10], [2, 4, 5, 6]],
  // L piece
  [[1, 2, 5, 9], [0, 4, 5, 6], [1, 5, 7, 10], [2, 4, 5, 6]],
];

// テトリス ゲーム クラス
class TetrisGame {
  constructor({ canvas, nextCanvas, onGameOver, onScoreUpdate, onLevelUpdate, onLinesUpdate }) {
    this.canvas = canvas;
    this.nextCanvas = nextCanvas;
    this.ctx = canvas.getContext('2d');
    this.nextCtx = nextCanvas.getContext('2d');

    // コールバック
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.onLevelUpdate = onLevelUpdate;
    this.onLinesUpdate = onLinesUpdate;

    // ゲーム状態
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.paused = false;
    this.gameOver = false;
    this.effectIndex = 0; // エフェクト種類インデックス

    // グリッド設定
    this.cellSize = 24;
    this.cols = this.canvas.width / this.cellSize;
    this.rows = this.canvas.height / this.cellSize;
    this.grid = createEmptyGrid(this.cols, this.rows);

    // カレントピース
    this.currentPiece = null;
    this.nextPiece = null;
    this.dropCounter = 0;
    this.dropInterval = 500; // 初期ドロップ間隔
    this.lastDrop = 0;

    // エフェクト設定
    this.effects = this.createEffects();
    this.linesSinceLastEffect = 0;

    // BGM・音声
    this.audioContext = null;
    this.synth = this.createSynth();
    this.bgmPlaying = false;

    // 初期化
    this.reset();
  }

  reset() {
    this.grid = createEmptyGrid(this.cols, this.rows);
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.linesSinceLastEffect = 0;
    this.effectIndex = 0;
    this.paused = false;
    this.gameOver = false;
    this.dropInterval = 500;
    this.dropCounter = 0;
    this.grid.fill(null);
    this.soundStopAll();
    this.createNewPiece();
    this.updateUI();
    if (this.bgmPlaying) this.soundPlayBGM();
  }

  start() {
    // AudioContext の作成（ユーザー操作後）
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    this.soundPlayBGM();
    this.gameLoop = this.gameLoop.bind(this);
    requestAnimationFrame(this.gameLoop);
  }

  createEffects() {
    // エフェクト種類: 0=シンプル, 1=爆発, 2=光, 3=パターン, 4=カオス
    return [
      this.createSimpleEffect,
      this.createExplosionEffect,
      this.createLightEffect,
      this.createPatternEffect,
      this.createChaosEffect,
    ];
  }

  createExplosionEffect(x, y, gridWidth, gridHeight) {
    // ライン消去時の派手な爆発エフェクト
    const particles = [];
    const particleCount = 16 + Math.floor(Math.random() * 16);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 2 + Math.random() * 3;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: COLORS[PIECES[6][0] % 7 || 'I'], // ピース色に基づく
        size: 2 + Math.random() * 3,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
      });
    }

    return {
      type: 'explosion',
      particles,
      update: (dt) => {
        particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= p.decay;
        });
      },
      draw: (ctx) => {
        particles.forEach(p => {
          if (p.life > 0) {
            const alpha = p.life;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.restore();
          }
        });
      },
    };
  }

  createSimpleEffect(x, y, gridWidth, gridHeight) {
    return {
      type: 'simple',
      update: () => {},
      draw: (ctx) => {
        // グリッドラインを描画
        ctx.save();
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridHeight; i++) {
          ctx.beginPath();
          ctx.moveTo(0, i * this.cellSize);
          ctx.lineTo(gridWidth * this.cellSize, i * this.cellSize);
          ctx.stroke();
        }
        for (let i = 0; i <= gridWidth; i++) {
          ctx.beginPath();
          ctx.moveTo(i * this.cellSize, 0);
          ctx.lineTo(i * this.cellSize, gridHeight * this.cellSize);
          ctx.stroke();
        }
        ctx.restore();
      },
    };
  }

  createLightEffect(x, y, gridWidth, gridHeight) {
    return {
      type: 'light',
      pulse: 0,
      update: (dt) => {
        this.pulse = (this.pulse + dt * 3) % (Math.PI * 2);
      },
      draw: (ctx) => {
        ctx.save();
        const intensity = 0.3 + 0.7 * Math.sin(this.pulse);
        ctx.fillStyle = `rgba(255, 105, 180, ${intensity})`;
        ctx.fillRect(x * this.cellSize, y * this.cellSize, gridWidth * this.cellSize, gridHeight * this.cellSize);
        ctx.restore();
      },
    };
  }

  createPatternEffect(x, y, gridWidth, gridHeight) {
    return {
      type: 'pattern',
      phase: 0,
      update: (dt) => {
        this.phase = (this.phase + dt * 5) % (Math.PI * 2);
      },
      draw: (ctx) => {
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < gridWidth; i++) {
          for (let j = 0; j < gridHeight; j++) {
            const xPos = (i + j) * this.cellSize;
            const yPos = (i - j) * this.cellSize;
            if (xPos >= 0 && yPos >= 0 && xPos < this.canvas.width && yPos < this.canvas.height) {
              ctx.fillStyle = `rgba(255, 105, 180, 0.3)`;
              ctx.fillRect(xPos, yPos, 2, 2);
            }
          }
        }
        ctx.restore();
      },
    };
  }

  createChaosEffect(x, y, gridWidth, gridHeight) {
    // カオスエフェクト - ランダムな線と色
    return {
      type: 'chaos',
      cells: [],
      update: (dt) => {
        // 新しいランダムセルを追加
        if (Math.random() < 0.1) {
          const cx = Math.floor(Math.random() * gridWidth);
          const cy = Math.floor(Math.random() * gridHeight);
          this.cells.push({ x: cx, y: cy, life: 1, decay: 0.01 });
        }
        // セルを更新
        for (let i = this.cells.length - 1; i >= 0; i--) {
          const c = this.cells[i];
          c.life -= c.decay;
          if (c.life <= 0) {
            this.cells.splice(i, 1);
          }
        }
      },
      draw: (ctx) => {
        ctx.save();
        this.cells.forEach(c => {
          if (c.life > 0) {
            const alpha = c.life;
            const hue = (Math.random() * 360);
            ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
            ctx.shadowBlur = 5;
            ctx.fillRect(c.x * this.cellSize, c.y * this.cellSize, this.cellSize * alpha, this.cellSize * alpha);
          }
        });
        ctx.restore();
      },
    };
  }

  // シンセサイザー作成
  createSynth() {
    return {
      osc: null,
      gain: null,

      // BGM再生
      playBGM: function() {
        if (!this.osc) {
          this.osc = this.audioContext.createOscillator();
          this.gain = this.audioContext.createGain();
          this.osc.connect(this.gain);
          this.gain.connect(this.audioContext.destination);
          this.osc.start();
        }
        // BGM: ゆらぎのあるノイズ
        this.osc.frequency.value = 110 + Math.random() * 20;
        this.osc.type = 'triangle';
        this.gain.gain.value = 0.1;
      },

      // 音停止
      soundStopAll: function() {
        if (this.osc) {
          this.osc.stop();
          this.osc = null;
          this.gain = null;
        }
      },

      // ライン消去音
      playLineClear: function() {
        this.playSound(440, 'sine', 0.3, 0.1);
      },

      // テトリス音
      playTetris: function() {
        this.playSound(523, 'sine', 0.2, 0.05);
      },

      // Tスピン音
      playTSpin: function() {
        this.playSound(659, 'square', 0.4, 0.15);
      },

      // ピース回転音
      playRotate: function() {
        this.playSound(587, 'triangle', 0.25, 0.08);
      },

      // 消去ライン数に応じた周波数
      getFrequencyForLines: function(lines) {
        const base = 440;
        return base + lines * 100;
      },

      // 音を鳴らす
      playSound: function(frequency, type, duration, delay) {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.value = frequency;
        osc.type = type;
        gain.gain.value = 0;
        gain.gain.setTargetAtTime(0.5, this.audioContext.currentTime + delay, 0.01);
        gain.gain.setTargetAtTime(0, this.audioContext.currentTime + delay + duration, 0.01);
        osc.start(this.audioContext.currentTime + delay);
        osc.stop(this.audioContext.currentTime + delay + duration);
      },

      // コード進行音
      playChord: function(frequencies, type, duration) {
        frequencies.forEach((f, i) => {
          setTimeout(() => this.playSound(f, type, duration, i * 0.05), 0);
        });
      },
    };
  }

  // ピース作成
  createNewPiece() {
    // 次のピースがなければランダム
    if (!this.nextPiece) {
      const pieceIndex = Math.floor(Math.random() * PIECES.length);
      const pieceShape = PIECES[pieceIndex];
      this.nextPiece = {
        type: pieceIndex,
        shape: pieceShape[0], // 初期形状
        rotate: 0,
      };
    }

    // カレントピースを次ピースにセット
    this.currentPiece = {
      type: this.nextPiece.type,
      shape: this.nextPiece.shape,
      rotate: this.nextPiece.rotate,
    };

    // 次のピースを新しいのにする
    const pieceIndex = Math.floor(Math.random() * PIECES.length);
    const pieceShape = PIECES[pieceIndex];
    this.nextPiece = {
      type: pieceIndex,
      shape: pieceShape[0],
      rotate: 0,
    };

    // スタート位置 (カレントピースの形状による)
    this.currentPiece.x = Math.floor(this.cols / 2) - 2;
    this.currentPiece.y = 0;

    // ピースが immediately ゲームオーバーなら
    if (this.collide(this.currentPiece)) {
      this.gameOver = true;
      this.onGameOver();
      return;
    }

    // エフェクトインデックスを更新 (10ラインごとに切り替え)
    this.linesSinceLastEffect += this.lines;
    this.lines = 0; // リセットは行数更新時に行う
    if (this.linesSinceLastEffect >= 10) {
      this.effectIndex = (this.effectIndex + 1) % this.effects.length;
      this.linesSinceLastEffect = 0;
    }

    this.updateUI();
  }

  // 衝突判定
  collide(piece) {
    const [m, o] = [piece.shape, piece.rotate % 4];
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0 &&
          (piece.x + x < 0 || piece.x + x >= this.cols ||
            piece.y + y >= this.rows || this.grid[piece.y + y][piece.x + x])) {
          return true;
        }
      }
    }
    return false;
  }

  // ピース固定
  mergePiece() {
    const [m, o] = [this.currentPiece.shape, this.currentPiece.rotate % 4];
    for (let y = 0; y < m.length; ++y) {
      for (let x = 0; x < m[y].length; ++x) {
        if (m[y][x] !== 0) {
          this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.type;
        }
      }
    }
  }

  // ライン消去
  clearLines() {
    let linesCleared = 0;

    for (let y = this.rows - 1; y > 0; --y) {
      let rowFull = true;
      for (let x = 0; x < this.cols; ++x) {
        if (!this.grid[y][x]) { rowFull = false; break; }
      }
      if (rowFull) {
        linesCleared++;
        // ラインを上にずらす
        for (let row = y; row > 1; --row) {
          for (let x = 0; x < this.cols; ++x) {
            this.grid[row][x] = this.grid[row - 1][x];
          }
        }
        // 最高行をクリア
        for (let x = 0; x < this.cols; ++x) {
          this.grid[1][x] = 0;
        }
        y++; // 同じ行チェック (新しいラインが入ってきたため)
      }
    }

    return linesCleared;
  }

  // スコア更新
  updateScore(lines) {
    // Tetris Guideline スコア計算
    const lineScores = [0, 100, 300, 500, 800]; // 1, 2, 3, 4 lines
    this.score += lineScores[lines] * this.level;
    this.onScoreUpdate(this.score);
  }

  // レベル更新
  updateLevel() {
    // レベルはライン数に応じて上げる
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
      // ドロップ間隔を短縮 (最小50ms)
      this.dropInterval = Math.max(50, 500 - (this.level - 1) * 40);
      this.onLevelUpdate(this.level);
    }
  }

  // ゲームループ
  gameLoop(time = 0) {
    if (this.gameOver || this.paused) {
      requestAnimationFrame(this.gameLoop);
      return;
    }

    const dt = time - this.lastDrop;
    this.lastDrop = time;

    // ドロップ処理
    this.dropCounter += dt;
    if (this.dropCounter > this.dropInterval) {
      this.currentPiece.y++;
      this.dropCounter = 0;

      if (this.collide(this.currentPiece)) {
        this.currentPiece.y--;
        this.mergePiece();
        const linesCleared = this.clearLines();
        if (linesCleared > 0) {
          this.updateScore(linesCleared);
          this.updateLevel();
          this.lines += linesCleared;
          this.onLinesUpdate(this.lines);
          // エフェクト再生
          this.playEffect(linesCleared);
          // 音再生
          this.soundPlayLines(linesCleared);
        }
        this.createNewPiece();
      }
    }

    // 描画
    this.draw();

    requestAnimationFrame(this.gameLoop);
  }

  // エフェクト再生
  playEffect(linesCleared) {
    const effect = this.effects[this.effectIndex];
    const gridWidth = this.cols;
    const gridHeight = this.rows;

    // 全グリッドに対してエフェクトを描画
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (this.grid[y][x] !== 0) {
          // ピースの位置に基づいてエフェクトオフセットを計算
          const pieceX = this.currentPiece ? this.currentPiece.x : 0;
          const pieceY = this.currentPiece ? this.currentPiece.y : 0;
          effect(x, y, gridWidth, gridHeight);
        }
      }
    }

    // エフェクト更新・描画
    // グローバルな描画は gameLoop の draw で行う
  }

  // ラインサウンド
  soundPlayLines(lines) {
    const freq = this.synth.getFrequencyForLines(lines);
    const type = lines >= 4 ? 'sine' : 'square';
    this.synth.playSound(freq, type, 0.2, 0);
    if (lines >= 4) {
      this.synth.playTetris();
    }
  }

  // BGM再生制御
  soundPlayBGM() {
    if (!this.bgmPlaying) {
      this.synth.playBGM();
      this.bgmPlaying = true;
    }
  }

  soundStopBGM() {
    this.synth.soundStopAll();
    this.bgmPlaying = false;
  }

  // 描画
  draw() {
    // キャンバスクリア
    this.ctx.fillStyle = COLORS.BG;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // グリッドとピース描画
    const [m, o] = [this.currentPiece.shape, this.currentPiece.rotate % 4];
    const gridX = 0; // 左寄せ
    const gridY = 0;

    // グリッド描画
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x]) {
          const color = COLORS[PIECES[this.grid[y][x]][0] % 7 || 'I'];
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize - 2,
            this.cellSize - 2
          );
          // 枠線
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 0.5;
          this.ctx.strokeRect(
            x * this.cellSize,
            y * this.cellSize,
            this.cellSize - 2,
            this.cellSize - 2
          );
        }
      }
    }

    // カレントピース描画
    if (this.currentPiece) {
      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x] !== 0) {
            const color = COLORS[PIECES[this.currentPiece.type][0] % 7 || 'I'];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
              (this.currentPiece.x + x) * this.cellSize,
              (this.currentPiece.y + y) * this.cellSize,
              this.cellSize - 2,
              this.cellSize - 2
            );
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(
              (this.currentPiece.x + x) * this.cellSize,
              (this.currentPiece.y + y) * this.cellSize,
              this.cellSize - 2,
              this.cellSize - 2
            );
          }
        }
      }
    }

    // エフェクト描画 (全グリッドに対する現在のエフェクト)
    const effect = this.effects[this.effectIndex];
    if (effect && effect.draw) {
      effect.draw(this.ctx);
    }

    // 次ピース描画
    this.drawNextPiece();
  }

  drawNextPiece() {
    this.nextCtx.fillStyle = COLORS.BG;
    this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

    if (this.nextPiece) {
      const [m] = [this.nextPiece.shape];
      const offsetX = Math.floor((this.nextCanvas.width / this.cellSize - m[0].length) / 2);
      const offsetY = Math.floor((this.nextCanvas.height / this.cellSize - m.length) / 2);

      for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
          if (m[y][x] !== 0) {
            const color = COLORS[PIECES[this.nextPiece.type][0] % 7 || 'I'];
            this.nextCtx.fillStyle = color;
            this.nextCtx.fillRect(
              (offsetX + x) * this.cellSize,
              (offsetY + y) * this.cellSize,
              this.cellSize - 2,
              this.cellSize - 2
            );
            this.nextCtx.strokeStyle = '#fff';
            this.nextCtx.lineWidth = 0.5;
            this.nextCtx.strokeRect(
              (offsetX + x) * this.cellSize,
              (offsetY + y) * this.cellSize,
              this.cellSize - 2,
              this.cellSize - 2
            );
          }
        }
      }
    }
  }

  // 移動
  moveLeft() {
    if (!this.gameOver && !this.paused) {
      this.currentPiece.x--;
      if (this.collide(this.currentPiece)) this.currentPiece.x++;
    }
  }

  moveRight() {
    if (!this.gameOver && !this.paused) {
      this.currentPiece.x++;
      if (this.collide(this.currentPiece)) this.currentPiece.x--;
    }
  }

  // 回転
  rotate() {
    if (!this.gameOver && !this.paused) {
      const nextRotate = (this.currentPiece.rotate + 1) % 4;
      const [m] = [this.currentPiece.shape];
      // ウォールキックテスト (簡易版)
      this.currentPiece.rotate = nextRotate;
      if (this.collide(this.currentPiece)) {
        // 失敗時は元に戻す
        this.currentPiece.rotate = (nextRotate + 3) % 4;
        // シンプルなウォールキック
        this.currentPiece.x += (nextRotate % 2 === 0 ? 1 : -1);
        if (this.collide(this.currentPiece)) {
          this.currentPiece.rotate = (this.currentPiece.rotate + 1) % 4;
          this.currentPiece.x -= (nextRotate % 2 === 0 ? 1 : -1);
        }
      }
      this.synth.playRotate();
    }
  }

  // ハードドロップ
  hardDrop() {
    if (!this.gameOver && !this.paused) {
      // 下まで落とす
      while (!this.collide(Object.assign({}, this.currentPiece, { y: this.currentPiece.y + 1 }))) {
        this.currentPiece.y++;
      }
      this.mergePiece();
      const linesCleared = this.clearLines();
      if (linesCleared > 0) {
        this.updateScore(linesCleared);
        this.updateLevel();
        this.lines += linesCleared;
        this.onLinesUpdate(this.lines);
        this.playEffect(linesCleared);
        this.soundPlayLines(linesCleared);
      }
      this.createNewPiece();
    }
  }
}

// グリッド作成ヘルパー
function createEmptyGrid(cols, rows) {
  const grid = [];
  for (let y = 0; y < rows; ++y) {
    grid[y] = [];
    for (let x = 0; x < cols; ++x) {
      grid[y][x] = 0;
    }
  }
  return grid;
}

// 初期化と起動
document.addEventListener('DOMContentLoaded', () => {
  // キャンバス要素の取得
  const canvas = document.getElementById('tetris-canvas');
  const nextCanvas = document.getElementById('next-canvas');

  // ゲームインスタンス作成
  const game = new TetrisGame({
    canvas,
    nextCanvas,
    onGameOver: () => {
      document.getElementById('game-over').style.display = 'flex';
    },
    onScoreUpdate: (score) => {
      document.getElementById('score').textContent = score;
    },
    onLevelUpdate: (level) => {
      document.getElementById('level').textContent = level;
    },
    onLinesUpdate: (lines) => {
      document.getElementById('lines').textContent = lines;
    },
  });

  // ゲーム開始
  game.start();
});
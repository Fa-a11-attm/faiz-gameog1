/**
 * ============================================================================
 * Classic Snake Game - Modern Arcade Edition
 * Pure Vanilla JavaScript (Zero Dependencies, Static GitHub Pages Ready)
 * ============================================================================
 */

(() => {
  'use strict';

  // --- Configuration & Constants ---
  const GRID_SIZE = 20; // 20x20 grid tiles
  const VIRTUAL_CANVAS_SIZE = 400; // 400x400 virtual pixels (20px per cell)
  const CELL_SIZE = VIRTUAL_CANVAS_SIZE / GRID_SIZE;

  const SPEEDS = {
    easy: 130,   // ms per frame
    normal: 95,
    hard: 65,
  };

  const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
  };

  // --- DOM Elements ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const currentScoreEl = document.getElementById('current-score');
  const highScoreEl = document.getElementById('high-score');
  
  // Overlays
  const startOverlay = document.getElementById('start-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const helpModal = document.getElementById('help-modal');

  // Overlay stats
  const finalScoreEl = document.getElementById('final-score');
  const bestScoreEl = document.getElementById('best-score');
  const newRecordTag = document.getElementById('new-record-tag');
  const bonusTimerBar = document.getElementById('bonus-timer-bar');
  const bonusTimerWrap = document.getElementById('bonus-timer-wrap');

  // Action Buttons
  const startBtn = document.getElementById('start-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const quickPauseBtn = document.getElementById('quick-pause-btn');
  const quickRestartBtn = document.getElementById('quick-restart-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const helpBtn = document.getElementById('help-btn');
  const closeHelpBtn = document.getElementById('close-help-btn');
  const diffButtons = document.querySelectorAll('.diff-btn');

  // D-Pad Buttons
  const dpadUp = document.getElementById('dpad-up');
  const dpadDown = document.getElementById('dpad-down');
  const dpadLeft = document.getElementById('dpad-left');
  const dpadRight = document.getElementById('dpad-right');

  // --- Audio System (Web Audio API Synthesizer) ---
  class SoundSystem {
    constructor() {
      this.ctx = null;
      this.isMuted = localStorage.getItem('snake_muted') === 'true';
      this.updateUI();
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } else if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('snake_muted', this.isMuted);
      this.updateUI();
      if (!this.isMuted) {
        this.playBeep(520, 0.08, 'sine');
      }
    }

    updateUI() {
      if (!soundToggleBtn) return;
      const iconSoundOn = document.getElementById('icon-sound-on');
      const iconSoundOff = document.getElementById('icon-sound-off');
      if (this.isMuted) {
        soundToggleBtn.classList.remove('active');
        if (iconSoundOn) iconSoundOn.style.display = 'none';
        if (iconSoundOff) iconSoundOff.style.display = 'block';
      } else {
        soundToggleBtn.classList.add('active');
        if (iconSoundOn) iconSoundOn.style.display = 'block';
        if (iconSoundOff) iconSoundOff.style.display = 'none';
      }
    }

    playBeep(freq, duration, type = 'sine', rampTo = null) {
      if (this.isMuted) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (rampTo !== null) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, rampTo), now + duration);
        }

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch {
        // Ignore audio playback limitations
      }
    }

    eat() {
      this.playBeep(440, 0.12, 'triangle', 880);
    }

    bonusEat() {
      if (this.isMuted) return;
      try {
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playBeep(freq, 0.1, 'sine');
          }, idx * 60);
        });
      } catch {
        // fallback
      }
    }

    gameOver() {
      this.playBeep(260, 0.45, 'sawtooth', 55);
    }

    click() {
      this.playBeep(600, 0.04, 'sine');
    }
  }

  const sound = new SoundSystem();

  // --- Game State Variables ---
  let gameState = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
  let currentDifficulty = localStorage.getItem('snake_difficulty') || 'normal';
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snake_high_score') || '0', 10);
  let snake = [];
  let currentDir = DIRECTIONS.RIGHT;
  let inputQueue = []; // buffered directional inputs
  let food = null;
  let bonusFood = null;
  let bonusFoodTimer = 0;
  let bonusFoodMaxTime = 6000; // 6 seconds
  let bonusFoodStart = 0;
  let foodCounter = 0; // count to spawn bonus food every 5 foods
  let lastFrameTime = 0;
  let timeAccumulator = 0;
  let animationFrameId = null;

  // --- High DPI Canvas Setup ---
  function setupCanvasDPI() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIRTUAL_CANVAS_SIZE * dpr;
    canvas.height = VIRTUAL_CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);
  }

  // --- Haptic Feedback Helper ---
  function triggerHaptic(pattern = 15) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }

  // --- Game Initialization ---
  function initGame() {
    score = 0;
    foodCounter = 0;
    bonusFood = null;
    hideBonusBar();
    updateScoreDisplay();

    // Center the snake with initial 3 segments moving right
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];

    currentDir = DIRECTIONS.RIGHT;
    inputQueue = [];

    spawnFood();
  }

  function spawnFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    if (bonusFood) {
      occupied.add(`${bonusFood.x},${bonusFood.y}`);
    }

    const freeSpots = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          freeSpots.push({ x, y });
        }
      }
    }

    if (freeSpots.length > 0) {
      food = freeSpots[Math.floor(Math.random() * freeSpots.length)];
    }
  }

  function spawnBonusFood() {
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    if (food) occupied.add(`${food.x},${food.y}`);

    const freeSpots = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          freeSpots.push({ x, y });
        }
      }
    }

    if (freeSpots.length > 0) {
      bonusFood = freeSpots[Math.floor(Math.random() * freeSpots.length)];
      bonusFoodStart = performance.now();
      bonusFoodTimer = bonusFoodMaxTime;
      showBonusBar();
    }
  }

  function showBonusBar() {
    if (bonusTimerWrap) bonusTimerWrap.style.display = 'block';
    if (bonusTimerBar) bonusTimerBar.style.width = '100%';
  }

  function hideBonusBar() {
    if (bonusTimerWrap) bonusTimerWrap.style.display = 'none';
    bonusFood = null;
  }

  function updateBonusTimer(delta) {
    if (!bonusFood) return;
    bonusFoodTimer -= delta;
    if (bonusFoodTimer <= 0) {
      hideBonusBar();
    } else {
      const pct = Math.max(0, (bonusFoodTimer / bonusFoodMaxTime) * 100);
      if (bonusTimerBar) bonusTimerBar.style.width = `${pct}%`;
    }
  }

  // --- Score Management ---
  function updateScoreDisplay() {
    if (currentScoreEl) currentScoreEl.textContent = score;
    if (highScoreEl) highScoreEl.textContent = highScore;
  }

  function checkHighScore() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('snake_high_score', highScore);
      updateScoreDisplay();
      return true;
    }
    return false;
  }

  // --- Difficulty Handling ---
  function setDifficulty(diff) {
    if (!SPEEDS[diff]) return;
    currentDifficulty = diff;
    localStorage.setItem('snake_difficulty', diff);
    diffButtons.forEach(btn => {
      if (btn.dataset.diff === diff) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // --- Direction & Input Buffering ---
  function queueDirection(newDir) {
    sound.init(); // enable audio on first user input

    if (gameState === 'START' || gameState === 'GAMEOVER') {
      startGame();
      return;
    }

    if (gameState === 'PAUSED') {
      resumeGame();
      return;
    }

    // Determine the reference direction: either the last queued direction or current
    const lastDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : currentDir;

    // Prevent direct 180° turns
    const isOpposite = (newDir.x === -lastDir.x && newDir.y === -lastDir.y);
    const isSame = (newDir.x === lastDir.x && newDir.y === lastDir.y);

    if (!isOpposite && !isSame && inputQueue.length < 3) {
      inputQueue.push(newDir);
    }
  }

  // --- Game State Flow ---
  function startGame() {
    sound.init();
    sound.click();
    initGame();
    gameState = 'PLAYING';
    
    startOverlay.classList.remove('active');
    pauseOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');

    lastFrameTime = performance.now();
    timeAccumulator = 0;
  }

  function pauseGame() {
    if (gameState !== 'PLAYING') return;
    gameState = 'PAUSED';
    pauseOverlay.classList.add('active');
    if (quickPauseBtn) quickPauseBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      Resume
    `;
  }

  function resumeGame() {
    if (gameState !== 'PAUSED') return;
    gameState = 'PLAYING';
    pauseOverlay.classList.remove('active');
    if (quickPauseBtn) quickPauseBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      Pause
    `;
    lastFrameTime = performance.now();
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      pauseGame();
    } else if (gameState === 'PAUSED') {
      resumeGame();
    }
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    sound.gameOver();
    triggerHaptic([60, 40, 100]);
    hideBonusBar();

    const isNewRecord = checkHighScore();
    if (finalScoreEl) finalScoreEl.textContent = score;
    if (bestScoreEl) bestScoreEl.textContent = highScore;
    if (newRecordTag) {
      newRecordTag.style.display = isNewRecord ? 'inline-block' : 'none';
    }

    gameOverOverlay.classList.add('active');
    if (quickPauseBtn) quickPauseBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      Pause
    `;
  }

  // --- Game Loop Update ---
  function update() {
    if (inputQueue.length > 0) {
      currentDir = inputQueue.shift();
    }

    const head = snake[0];
    const newHead = {
      x: head.x + currentDir.x,
      y: head.y + currentDir.y,
    };

    // 1. Wall Collision Check
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      triggerGameOver();
      return;
    }

    // 2. Self Collision Check
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        triggerGameOver();
        return;
      }
    }

    // 3. Move snake
    snake.unshift(newHead);

    // 4. Check Food
    let ateFood = false;
    if (food && newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      foodCounter++;
      ateFood = true;
      sound.eat();
      triggerHaptic(20);
      spawnFood();

      if (foodCounter % 5 === 0) {
        spawnBonusFood();
      }
    }

    // 5. Check Bonus Food
    if (bonusFood && newHead.x === bonusFood.x && newHead.y === bonusFood.y) {
      score += 50;
      ateFood = true;
      sound.bonusEat();
      triggerHaptic([30, 30, 50]);
      hideBonusBar();
    }

    // If did not eat, remove tail segment
    if (!ateFood) {
      snake.pop();
    }

    updateScoreDisplay();
  }

  // --- Rendering ---
  function render() {
    ctx.clearRect(0, 0, VIRTUAL_CANVAS_SIZE, VIRTUAL_CANVAS_SIZE);

    // Background Grid Pattern
    drawGrid();

    // Draw Foods
    if (food) drawApple(food.x, food.y);
    if (bonusFood) drawGoldenStar(bonusFood.x, bonusFood.y);

    // Draw Snake
    drawSnake();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, VIRTUAL_CANVAS_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(VIRTUAL_CANVAS_SIZE, pos);
      ctx.stroke();
    }
  }

  function drawApple(gx, gy) {
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const r = CELL_SIZE * 0.42;

    // Subtle glow
    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 8;

    // Apple body
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Stem
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 2);
    ctx.quadraticCurveTo(cx - 2, cy - r - 4, cx - 1, cy - r - 5);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy - r - 2, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Highlight sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGoldenStar(gx, gy) {
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const r = CELL_SIZE * 0.46;

    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 12;

    // Golden Orb
    const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#b45309');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Star icon inside
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy + 0.5);
  }

  function drawSnake() {
    if (snake.length === 0) return;

    // 1. Draw Body Segments
    for (let i = snake.length - 1; i > 0; i--) {
      const seg = snake[i];
      const prev = snake[i - 1];

      const x = seg.x * CELL_SIZE;
      const y = seg.y * CELL_SIZE;
      const progress = i / snake.length;

      // Color transition from vibrant emerald to darker green
      const r = Math.round(16 + (5 - 16) * progress);
      const g = Math.round(185 + (150 - 185) * progress);
      const b = Math.round(129 + (105 - 129) * progress);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      // Rounded segment box
      const pad = 1.5;
      const segW = CELL_SIZE - pad * 2;
      const segH = CELL_SIZE - pad * 2;
      roundRect(ctx, x + pad, y + pad, segW, segH, 5);
      ctx.fill();

      // Connecting joint to previous segment to give smooth continuous body
      if (prev) {
        const jX = (seg.x + prev.x) / 2 * CELL_SIZE + pad;
        const jY = (seg.y + prev.y) / 2 * CELL_SIZE + pad;
        roundRect(ctx, jX, jY, segW, segH, 3);
        ctx.fill();
      }
    }

    // 2. Draw Head
    const head = snake[0];
    const hX = head.x * CELL_SIZE;
    const hY = head.y * CELL_SIZE;

    ctx.save();
    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#10b981';
    roundRect(ctx, hX + 1, hY + 1, CELL_SIZE - 2, CELL_SIZE - 2, 6);
    ctx.fill();
    ctx.restore();

    // 3. Eyes on Head (facing currentDirection)
    const eyeRadius = 2.5;
    const pupilRadius = 1.4;
    let eye1 = { x: 0, y: 0 };
    let eye2 = { x: 0, y: 0 };
    let pupilShift = { x: 0, y: 0 };

    if (currentDir.x === 1) { // RIGHT
      eye1 = { x: hX + CELL_SIZE * 0.7, y: hY + CELL_SIZE * 0.28 };
      eye2 = { x: hX + CELL_SIZE * 0.7, y: hY + CELL_SIZE * 0.72 };
      pupilShift = { x: 1, y: 0 };
    } else if (currentDir.x === -1) { // LEFT
      eye1 = { x: hX + CELL_SIZE * 0.3, y: hY + CELL_SIZE * 0.28 };
      eye2 = { x: hX + CELL_SIZE * 0.3, y: hY + CELL_SIZE * 0.72 };
      pupilShift = { x: -1, y: 0 };
    } else if (currentDir.y === -1) { // UP
      eye1 = { x: hX + CELL_SIZE * 0.28, y: hY + CELL_SIZE * 0.3 };
      eye2 = { x: hX + CELL_SIZE * 0.72, y: hY + CELL_SIZE * 0.3 };
      pupilShift = { x: 0, y: -1 };
    } else { // DOWN
      eye1 = { x: hX + CELL_SIZE * 0.28, y: hY + CELL_SIZE * 0.7 };
      eye2 = { x: hX + CELL_SIZE * 0.72, y: hY + CELL_SIZE * 0.7 };
      pupilShift = { x: 0, y: 1 };
    }

    // Draw Sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
    ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Pupils
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eye1.x + pupilShift.x, eye1.y + pupilShift.y, pupilRadius, 0, Math.PI * 2);
    ctx.arc(eye2.x + pupilShift.x, eye2.y + pupilShift.y, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // --- Main Animation Frame Loop ---
  function gameLoop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (gameState === 'PLAYING') {
      timeAccumulator += delta;
      updateBonusTimer(delta);

      // Current step speed based on selected difficulty
      const stepDuration = SPEEDS[currentDifficulty] || SPEEDS.normal;

      while (timeAccumulator >= stepDuration) {
        update();
        timeAccumulator -= stepDuration;
      }
    }

    render();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // --- Keyboard Input Handling ---
  window.addEventListener('keydown', (e) => {
    // Prevent default scrolling for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR'];
    if (gameKeys.includes(e.code) || gameKeys.includes(e.key)) {
      e.preventDefault();
    }

    if (e.code === 'Space') {
      togglePause();
      return;
    }

    if (e.code === 'KeyR' || (e.code === 'Enter' && gameState !== 'PLAYING')) {
      startGame();
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        queueDirection(DIRECTIONS.UP);
        break;
      case 'ArrowDown':
      case 'KeyS':
        queueDirection(DIRECTIONS.DOWN);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        queueDirection(DIRECTIONS.LEFT);
        break;
      case 'ArrowRight':
      case 'KeyD':
        queueDirection(DIRECTIONS.RIGHT);
        break;
    }
  });

  // --- Touch Swipe Gestures on Canvas ---
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 20;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    // Prevent page scrolling when interacting with canvas
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > SWIPE_THRESHOLD || Math.abs(diffY) > SWIPE_THRESHOLD) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          queueDirection(DIRECTIONS.RIGHT);
        } else {
          queueDirection(DIRECTIONS.LEFT);
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          queueDirection(DIRECTIONS.DOWN);
        } else {
          queueDirection(DIRECTIONS.UP);
        }
      }
    } else {
      // Tap on canvas starts or resumes
      if (gameState === 'START' || gameState === 'GAMEOVER') {
        startGame();
      } else if (gameState === 'PAUSED') {
        resumeGame();
      }
    }
  });

  // --- Virtual D-Pad Touch & Mouse Controls ---
  function bindDpadButton(btnEl, direction) {
    if (!btnEl) return;
    const handleAction = (e) => {
      e.preventDefault();
      btnEl.classList.add('pressed');
      queueDirection(direction);
      triggerHaptic(12);
    };

    const handleRelease = () => {
      btnEl.classList.remove('pressed');
    };

    btnEl.addEventListener('touchstart', handleAction, { passive: false });
    btnEl.addEventListener('touchend', handleRelease, { passive: false });
    btnEl.addEventListener('mousedown', handleAction);
    btnEl.addEventListener('mouseup', handleRelease);
    btnEl.addEventListener('mouseleave', handleRelease);
  }

  bindDpadButton(dpadUp, DIRECTIONS.UP);
  bindDpadButton(dpadDown, DIRECTIONS.DOWN);
  bindDpadButton(dpadLeft, DIRECTIONS.LEFT);
  bindDpadButton(dpadRight, DIRECTIONS.RIGHT);

  // --- Button Listeners ---
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
  if (restartBtn) restartBtn.addEventListener('click', startGame);
  if (quickRestartBtn) quickRestartBtn.addEventListener('click', startGame);
  if (quickPauseBtn) quickPauseBtn.addEventListener('click', togglePause);
  if (soundToggleBtn) soundToggleBtn.addEventListener('click', () => sound.toggleMute());

  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.click();
      setDifficulty(btn.dataset.diff);
    });
  });

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => {
      sound.click();
      helpModal.classList.add('open');
      if (gameState === 'PLAYING') pauseGame();
    });
  }

  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener('click', () => {
      sound.click();
      helpModal.classList.remove('open');
    });
  }

  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.classList.remove('open');
      }
    });
  }

  // --- Lifecycle Setup ---
  window.addEventListener('resize', setupCanvasDPI);

  // Initial Setup
  setupCanvasDPI();
  setDifficulty(currentDifficulty);
  updateScoreDisplay();
  initGame();

  // Start RAF Loop
  animationFrameId = requestAnimationFrame(gameLoop);

})();

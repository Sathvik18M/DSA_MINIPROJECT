import { Minesweeper, LEVELS } from './game.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storage = {
  get(key) { try { return localStorage.getItem(`fieldwork:${key}`); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(`fieldwork:${key}`, value); } catch { /* The game still works without storage. */ } },
};
let game;
let cells = [];
let mode = 'reveal';
let paused = false;
let startedAt = null;
let elapsed = 0;
let recorded = false;
let sound = storage.get('sound') === 'true';
let audioContext;
let focusedIndex = 0;
const board = $('board');
const formatTime = ms => {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const currentTime = () => elapsed + (startedAt === null ? 0 : performance.now() - startedAt);

function tone(type) {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const notes = type === 'won' ? [440, 554, 659, 880] : type === 'lost' ? [180, 120] : type === 'flag' ? [420] : [640];
    notes.forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const at = audioContext.currentTime + i * .11;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(.07, at + .008);
      gain.gain.exponentialRampToValueAtTime(.001, at + .13);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + .15);
    });
  } catch { /* Audio is optional. */ }
}

function updateBest() {
  const stored = storage.get(`best:${game.level}`);
  const best = stored === null ? NaN : Number(stored);
  $('best-time').textContent = Number.isFinite(best) && best >= 0 ? formatTime(best) : '— —';
  $('best-level').textContent = game.label;
  $('best-note').textContent = Number.isFinite(best) && best >= 0 ? 'Your fastest clean sweep. Saved on this device.' : 'A clean field. A time to beat.';
}

function message(title, detail, symbol, state = '') {
  $('message-title').textContent = title;
  $('message-detail').textContent = detail;
  $('message-icon').innerHTML = icon(symbol);
  $('game-message').className = `game-message ${state}`;
}

function reset(level = game?.level || 'beginner') {
  game = new Minesweeper(level);
  paused = false;
  startedAt = null;
  elapsed = 0;
  recorded = false;
  focusedIndex = 0;
  storage.set('level', level);
  $('timer').textContent = '00:00';
  $('pause-overlay').hidden = true;
  $('play-area').classList.remove('paused');
  board.inert = false;
  board.removeAttribute('aria-hidden');
  $('pause-button').innerHTML = icon('pause');
  $('pause-button').setAttribute('aria-label', 'Pause game');
  $('game-layout').className = `game-layout ${level === 'expert' ? 'wide' : level === 'intermediate' ? 'intermediate' : ''}`;
  document.querySelectorAll('[data-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === level)));
  $('board-size').textContent = `${game.rows} × ${game.cols} grid`;
  board.style.setProperty('--columns', game.cols);
  board.setAttribute('aria-label', `${game.label} minefield, ${game.rows} rows and ${game.cols} columns. Arrow keys move, Enter reveals, F flags.`);
  board.replaceChildren();
  cells = game.board.flat().map((cell, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.row = cell.row;
    button.dataset.col = cell.col;
    button.tabIndex = index === 0 ? 0 : -1;
    board.append(button);
    return button;
  });
  $('board-scroll').scrollLeft = 0;
  message('Good things start with one click.', 'Pick any square. Your first move is always safe.', 'pointer');
  setMode('reveal');
  updateBest();
  render();
}

function render() {
  for (const cell of game.board.flat()) {
    const button = cells[cell.row * game.cols + cell.col];
    const showMine = game.status === 'lost' && cell.mine && !cell.flagged;
    const wrong = game.status === 'lost' && cell.flagged && !cell.mine;
    button.className = ['cell', cell.open && 'open', cell.flagged && 'flagged', cell.open && `n${cell.adjacent}`, showMine && 'mine', cell.exploded && 'exploded', wrong && 'wrong', game.finished && 'ended'].filter(Boolean).join(' ');
    const content = wrong ? icon('close') : cell.flagged ? icon('flag') : showMine ? icon('mine') : cell.open && cell.adjacent ? String(cell.adjacent) : '';
    // Keep DOM nodes and focus intact while updating only changed tile content.
    if (button.dataset.content !== content) { button.innerHTML = content; button.dataset.content = content; }
    const state = wrong ? 'Incorrect flag' : cell.flagged ? 'Flagged' : showMine ? 'Mine' : cell.open ? cell.adjacent ? `${cell.adjacent} adjacent mines` : 'Empty' : 'Covered';
    button.setAttribute('aria-label', `Row ${cell.row + 1}, column ${cell.col + 1}: ${state}`);
    button.setAttribute('aria-disabled', String(game.finished));
  }
  $('mine-count').textContent = String(game.mines - game.flags).padStart(3, '0');
  $('progress-label').textContent = `${game.revealed} / ${game.safeCells}`;
  $('progress').max = game.safeCells;
  $('progress').value = game.revealed;
  $('progress').textContent = `${Math.round(game.revealed / game.safeCells * 100)}%`;
  $('pause-button').disabled = game.status !== 'playing';
}

function act(row, col, action) {
  if (paused || game.finished) return;
  const changed = action === 'flag' ? game.toggleFlag(row, col) : action === 'chord' ? game.chord(row, col) : game.reveal(row, col);
  if (!changed) return;
  if (game.status === 'playing' && startedAt === null) startedAt = performance.now();
  if (game.finished) {
    elapsed = currentTime();
    startedAt = null;
    $('timer').textContent = formatTime(elapsed);
    if (game.status === 'won') {
      const previous = storage.get(`best:${game.level}`);
      const best = previous === null ? Infinity : Number(previous);
      const isBest = !Number.isFinite(best) || elapsed < best;
      if (!recorded && isBest) storage.set(`best:${game.level}`, String(elapsed));
      recorded = true;
      updateBest();
      message(isBest ? 'A clean sweep. A new personal best.' : 'Every safe square. Beautifully done.', `${formatTime(elapsed)} on ${game.label.toLowerCase()}. Ready for another field?`, 'trophy', 'won');
    } else message('A mine. It happens to the best of us.', 'Take a look at the field, then try a fresh one.', 'mine', 'lost');
    tone(game.status);
  } else {
    if (game.status === 'playing') message('One square at a time. You’ve got this.', 'Follow the clues. Flag the mines. Find your way through.', 'check');
    tone(action === 'flag' ? 'flag' : 'reveal');
  }
  render();
}

function setMode(next) {
  mode = next;
  $('reveal-mode').setAttribute('aria-pressed', String(mode === 'reveal'));
  $('flag-mode').setAttribute('aria-pressed', String(mode === 'flag'));
  $('touch-action').textContent = mode;
}

function togglePause(force) {
  if (game.status !== 'playing') return;
  const next = typeof force === 'boolean' ? force : !paused;
  if (next === paused) return;
  paused = next;
  if (paused) { elapsed = currentTime(); startedAt = null; }
  else startedAt = performance.now();
  $('timer').textContent = formatTime(currentTime());
  $('pause-overlay').hidden = !paused;
  $('play-area').classList.toggle('paused', paused);
  board.inert = paused;
  if (paused) board.setAttribute('aria-hidden', 'true'); else board.removeAttribute('aria-hidden');
  $('pause-button').innerHTML = icon(paused ? 'play' : 'pause');
  $('pause-button').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
  if (paused) $('resume-button').focus(); else cells[focusedIndex]?.focus({ preventScroll: true });
}

board.addEventListener('click', event => {
  const cell = event.target.closest('.cell');
  if (cell) act(Number(cell.dataset.row), Number(cell.dataset.col), mode);
});
board.addEventListener('contextmenu', event => {
  const cell = event.target.closest('.cell');
  if (cell) { event.preventDefault(); act(Number(cell.dataset.row), Number(cell.dataset.col), 'flag'); }
});
board.addEventListener('dblclick', event => {
  const cell = event.target.closest('.cell');
  if (cell && mode === 'reveal') act(Number(cell.dataset.row), Number(cell.dataset.col), 'chord');
});
board.addEventListener('focusin', event => {
  const cell = event.target.closest('.cell');
  if (!cell) return;
  cells[focusedIndex].tabIndex = -1;
  focusedIndex = Number(cell.dataset.row) * game.cols + Number(cell.dataset.col);
  cell.tabIndex = 0;
});
board.addEventListener('keydown', event => {
  const cell = event.target.closest('.cell');
  if (!cell || paused) return;
  let row = Number(cell.dataset.row);
  let col = Number(cell.dataset.col);
  const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (directions[event.key]) {
    event.preventDefault();
    const [dr, dc] = directions[event.key];
    row = Math.max(0, Math.min(game.rows - 1, row + dr));
    col = Math.max(0, Math.min(game.cols - 1, col + dc));
    cells[row * game.cols + col].focus();
  } else if (['f', 'c', 'Enter', ' '].includes(event.key)) {
    event.preventDefault();
    act(row, col, event.key === 'f' ? 'flag' : event.key === 'c' ? 'chord' : 'reveal');
  }
});
$('new-game').addEventListener('click', () => reset());
document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.level !== game.level) reset(button.dataset.level);
}));
$('reveal-mode').addEventListener('click', () => setMode('reveal'));
$('flag-mode').addEventListener('click', () => setMode('flag'));
$('pause-button').addEventListener('click', () => togglePause());
$('resume-button').addEventListener('click', () => togglePause(false));
$('help-button').addEventListener('click', () => { togglePause(true); $('help-dialog').showModal(); });
$('close-help').addEventListener('click', () => $('help-dialog').close());
$('start-playing').addEventListener('click', () => { $('help-dialog').close(); togglePause(false); });
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) { const rect = $('help-dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('help-dialog').close(); } });

function renderSound() {
  $('sound-button').innerHTML = icon(sound ? 'sound' : 'muted');
  $('sound-button').setAttribute('aria-pressed', String(sound));
  $('sound-button').setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  $('sound-button').title = sound ? 'Turn sound off' : 'Turn sound on';
}
$('sound-button').addEventListener('click', () => { sound = !sound; storage.set('sound', String(sound)); renderSound(); tone('flag'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
setInterval(() => { if (game.status === 'playing' && !paused) $('timer').textContent = formatTime(currentTime()); }, 200);
const savedLevel = storage.get('level');
reset(Object.hasOwn(LEVELS, savedLevel) ? savedLevel : 'beginner');
renderSound();

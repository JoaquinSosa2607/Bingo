// ─────────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyDblcI6H83C185qOJ1UwD6NzPEeoNz6kic",
  authDomain: "bingo-para-jubiladas.firebaseapp.com",
  databaseURL: "https://bingo-para-jubiladas-default-rtdb.firebaseio.com",
  projectId: "bingo-para-jubiladas",
  storageBucket: "bingo-para-jubiladas.firebasestorage.app",
  messagingSenderId: "294868182148",
  appId: "1:294868182148:web:12d00e74764f8618010ed1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (name === 'bolillero') initBolillero();
  if (name === 'carton')    initCarton();
}

// ─────────────────────────────────────────────
// BOLILLERO
// ─────────────────────────────────────────────

let pool          = [];
let extractedNums = [];
let boliReady     = false;
let salaCode      = null;
let bingosCallers = [];
let lineasCallers = [];

function initBolillero() {
  if (boliReady) return;
  resetBolillero();
}

function resetBolillero() {
  boliReady = true;
  pool          = Array.from({ length: 99 }, (_, i) => i + 1);
  extractedNums = [];

  if (salaCode) {
    // Keep the sala alive — just reset game data and signal players
    db.ref('salas/' + salaCode).update({
      numeros: [],
      bingos:  null,
      lineas:  null,
      resetAt: Date.now()
    });
    // Listeners stay attached — don't detach
  } else {
    document.getElementById('sala-idle').classList.remove('hidden');
    document.getElementById('sala-active').classList.add('hidden');
  }

  bingosCallers = [];
  lineasCallers = [];
  document.getElementById('bingo-alert').classList.add('hidden');
  document.getElementById('bingo-callers').innerHTML = '';
  document.getElementById('linea-alert').classList.add('hidden');
  document.getElementById('linea-callers').innerHTML = '';
  document.getElementById('last-nums').classList.add('hidden');
  document.getElementById('last-nums').innerHTML = '';

  document.getElementById('main-num').textContent    = '—';
  document.getElementById('ball-sub').textContent    = '99 disponibles';
  document.getElementById('btn-extract').disabled    = false;

  const grid = document.getElementById('boli-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= 99; i++) {
    const el = document.createElement('div');
    el.className = 'g-ball';
    el.id = 'gb-' + i;
    el.textContent = i;
    grid.appendChild(el);
  }
}

function extraerNumero() {
  if (!pool.length) return;

  const idx = Math.floor(Math.random() * pool.length);
  const num = pool.splice(idx, 1)[0];
  extractedNums.push(num);

  // Update display
  const mainBall = document.getElementById('main-ball');
  document.getElementById('main-num').textContent = num;
  mainBall.classList.remove('pop');
  void mainBall.offsetWidth;
  mainBall.classList.add('pop');

  document.getElementById('gb-' + num)?.classList.add('hit');

  const left = pool.length;
  document.getElementById('ball-sub').textContent =
    left === 0 ? '¡Todos extraídos!' :
    left === 1 ? '1 disponible'      :
    left + ' disponibles';
  if (left === 0) document.getElementById('btn-extract').disabled = true;

  renderLastNums();

  if (salaCode) {
    db.ref('salas/' + salaCode + '/numeros').set(extractedNums);
  }
}

function renderLastNums() {
  const container = document.getElementById('last-nums');
  const prev = extractedNums.slice(-6, -1);  // up to 5 before current

  if (!prev.length) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  container.innerHTML = '';
  prev.forEach((num, i) => {
    const el = document.createElement('div');
    el.className = 'last-num';
    el.textContent = num;
    el.style.opacity = 0.25 + (i / (prev.length - 1 || 1)) * 0.55;
    container.appendChild(el);
  });
}

function crearSala() {
  const code = genCode();
  salaCode = code;

  db.ref('salas/' + code).set({ numeros: [], creadoEn: Date.now() });

  document.getElementById('sala-key').textContent = code;
  document.getElementById('sala-idle').classList.add('hidden');
  document.getElementById('sala-active').classList.remove('hidden');

  // Listen for linea calls
  db.ref('salas/' + code + '/lineas').on('child_added', (snap) => {
    addLineaCaller(snap.val().jugador);
  });

  // Listen for bingo calls
  db.ref('salas/' + code + '/bingos').on('child_added', (snap) => {
    addBingoCaller(snap.val().jugador);
  });

  // Listen for players joining/leaving
  db.ref('salas/' + code + '/jugadores').on('value', (snap) => {
    const data = snap.val();
    const nombres = data ? Object.values(data).map(j => j.nombre) : [];
    renderJugadores(nombres);
  });
}

function addLineaCaller(name) {
  lineasCallers.push(name);
  const alert = document.getElementById('linea-alert');
  const callers = document.getElementById('linea-callers');
  alert.classList.remove('hidden');
  alert.style.animation = 'none';
  void alert.offsetWidth;
  alert.style.animation = '';
  callers.innerHTML = '';
  lineasCallers.forEach(n => {
    const chip = document.createElement('span');
    chip.className = 'jugador-chip linea-chip';
    chip.textContent = n;
    callers.appendChild(chip);
  });
}

function addBingoCaller(name) {
  bingosCallers.push(name);

  const alert = document.getElementById('bingo-alert');
  const callers = document.getElementById('bingo-callers');

  alert.classList.remove('hidden');
  // Re-animate on each new caller
  alert.style.animation = 'none';
  void alert.offsetWidth;
  alert.style.animation = '';

  callers.innerHTML = '';
  bingosCallers.forEach(n => {
    const chip = document.createElement('span');
    chip.className = 'jugador-chip';
    chip.textContent = n;
    callers.appendChild(chip);
  });
}

function renderJugadores(nombres) {
  const container = document.getElementById('sala-jugadores');
  container.innerHTML = '';
  if (!nombres.length) {
    container.innerHTML = '<span class="sala-waiting">Esperando jugadores…</span>';
    return;
  }
  nombres.forEach(nombre => {
    const chip = document.createElement('span');
    chip.className = 'jugador-chip';
    chip.textContent = nombre;
    container.appendChild(chip);
  });
}

function copiarCodigo() {
  if (!salaCode) return;
  const btn = document.getElementById('btn-copy');
  navigator.clipboard.writeText(salaCode).then(() => {
    btn.textContent = '¡Copiado!';
    setTimeout(() => { btn.textContent = 'Copiar código'; }, 1800);
  }).catch(() => {
    // fallback for HTTP (GitHub Pages serves HTTPS, pero por las dudas)
    prompt('Código de sala:', salaCode);
  });
}

// Only unambiguous letters: no I, O (se confunden con 1, 0)
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// ─────────────────────────────────────────────
// CARTÓN
// ─────────────────────────────────────────────

const COL_RANGES = [
  [1,9],[10,19],[20,29],[30,39],[40,49],
  [50,59],[60,69],[70,79],[80,99]
];

let cardGrid          = null;
let marked            = new Set();
let cardLocked        = false;
let calledNums        = new Set();
let salaRef           = null;
let salaCallback      = null;
let connectedSalaCode  = null;
let jugadorRef         = null;
let salaResetRef       = null;
let joinedAt           = 0;
let lineaCalled        = false;
let pendingRejoinCode  = null;
let pendingRejoinName  = null;

const SAVE_KEY = 'sossingo_partida';

function initCarton() {
  document.getElementById('bingo-veil').classList.add('hidden');
  const saved = loadSavedGame();
  if (saved) {
    restoreGame(saved);
  } else if (!cardGrid) {
    generateNewCard();
  }
}

function generateNewCard() {
  if (salaRef && salaCallback) {
    salaRef.off('value', salaCallback);
    salaRef = null;
    salaCallback = null;
  }
  if (salaResetRef) {
    salaResetRef.off();
    salaResetRef = null;
  }
  if (jugadorRef) {
    jugadorRef.remove();
    jugadorRef = null;
  }

  lineaCalled = false;
  document.getElementById('reset-veil').classList.add('hidden');
  document.getElementById('linea-veil').classList.add('hidden');

  marked.clear();
  calledNums.clear();
  cardLocked        = false;
  connectedSalaCode = null;
  clearSavedGame();

  document.getElementById('bingo-veil').classList.add('hidden');
  document.getElementById('game-setup').classList.remove('hidden');
  document.getElementById('prog-row').classList.add('hidden');
  document.getElementById('sala-chip').classList.add('hidden');
  document.getElementById('player-name').value  = '';
  document.getElementById('sala-input').value   = '';
  document.getElementById('carton-player').textContent = '';
  document.getElementById('carton-hint').textContent   = 'Ingresá tu nombre y presioná Comenzar';
  document.getElementById('btn-nuevo').textContent     = 'Nuevo';

  const serial = '#' + Math.floor(1000 + Math.random() * 9000);
  document.getElementById('carton-serial').textContent = serial;

  cardGrid = buildCardGrid();
  renderCard();
  document.getElementById('carton-grid').classList.add('prelocked');
  updateProgress();
}

function lockCard() {
  const name = document.getElementById('player-name').value.trim();
  const code = document.getElementById('sala-input').value.trim().toUpperCase();

  if (code.length === 4) {
    // Validate sala exists before locking
    const startBtn = document.querySelector('#game-setup .btn-pill');
    startBtn.textContent = 'Verificando…';
    startBtn.disabled = true;

    db.ref('salas/' + code).once('value').then(snap => {
      startBtn.textContent = 'Comenzar ▶';
      startBtn.disabled = false;

      if (!snap.exists()) {
        showToast('Sala "' + code + '" no encontrada');
        return;
      }
      doLockCard(name, code);
    });
  } else {
    doLockCard(name, null);
  }
}

function doLockCard(name, code) {
  cardLocked = true;

  document.getElementById('carton-player').textContent = name || 'Jugador';
  document.getElementById('game-setup').classList.add('hidden');
  document.getElementById('prog-row').classList.remove('hidden');
  document.getElementById('carton-hint').textContent   = 'Tocá los números para marcarlos';
  document.getElementById('btn-nuevo').textContent     = '🔒';
  document.getElementById('carton-grid').classList.remove('prelocked');

  if (code) joinSala(code, document.getElementById('carton-player').textContent);
  saveGame();
}

function joinSala(code, playerName) {
  jugadorRef = db.ref('salas/' + code + '/jugadores').push();
  jugadorRef.set({ nombre: playerName || 'Jugador' });
  jugadorRef.onDisconnect().remove();

  joinedAt = Date.now();

  // Listen for host reset
  salaResetRef = db.ref('salas/' + code + '/resetAt');
  salaResetRef.on('value', (snap) => {
    const resetAt = snap.val();
    if (resetAt && resetAt > joinedAt) {
      pendingRejoinCode = code;
      pendingRejoinName = playerName || 'Jugador';
      document.getElementById('reset-veil').classList.remove('hidden');
    }
  });

  salaRef = db.ref('salas/' + code + '/numeros');

  salaCallback = (snapshot) => {
    const data = snapshot.val();
    // Firebase may return null, array, or object-with-numeric-keys
    const nums = !data ? [] :
                 Array.isArray(data) ? data :
                 Object.values(data);
    calledNums = new Set(nums);
    refreshCalledCells();
  };

  salaRef.on('value', salaCallback);

  connectedSalaCode = code;
  document.getElementById('sala-chip-label').textContent = 'Sala ' + code;
  document.getElementById('sala-chip').classList.remove('hidden');
}

// Sync visual "called" state with calledNums (only touches unlocked cells)
function refreshCalledCells() {
  document.querySelectorAll('#carton-grid .c-cell:not(.blank)').forEach(cell => {
    const num = parseInt(cell.dataset.num);
    if (marked.has(num)) return;
    cell.classList.toggle('called', calledNums.has(num));
  });
}

function handleNuevo() {
  if (cardLocked && !confirm('¿Querés generar un nuevo cartón? Se perderá el progreso.')) return;
  generateNewCard();
}

// ─────────────────────────────────────────────
// CARD GENERATION (Spanish tombola 3×9)
// ─────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 3 rows × 9 cols — 6 columns with 2 numbers, 3 with 1 → 15 total (5/row)
function buildCardGrid() {
  while (true) {
    const counts    = shuffle([2,2,2,2,2,2,1,1,1]);
    const grid      = Array.from({ length: 3 }, () => Array(9).fill(null));
    const rowCounts = [0, 0, 0];
    let ok = true;

    for (let col = 0; col < 9; col++) {
      const [lo, hi] = COL_RANGES[col];
      const colPool  = shuffle(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k));
      const cnt      = counts[col];
      const nums     = colPool.slice(0, cnt).sort((a, b) => a - b);

      if (cnt === 1) {
        const avail = [0,1,2].filter(r => rowCounts[r] < 5);
        if (!avail.length) { ok = false; break; }
        const row = avail[Math.floor(Math.random() * avail.length)];
        grid[row][col] = nums[0];
        rowCounts[row]++;
      } else {
        const avail = shuffle([0,1,2].filter(r => rowCounts[r] < 5));
        if (avail.length < 2) { ok = false; break; }
        const r1 = Math.min(avail[0], avail[1]);
        const r2 = Math.max(avail[0], avail[1]);
        grid[r1][col] = nums[0];
        grid[r2][col] = nums[1];
        rowCounts[r1]++;
        rowCounts[r2]++;
      }
    }

    if (ok && rowCounts.every(c => c === 5)) return grid;
  }
}

function renderCard() {
  const container = document.getElementById('carton-grid');
  container.innerHTML = '';

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      const num  = cardGrid[row][col];
      const cell = document.createElement('div');

      if (num === null) {
        cell.className = 'c-cell blank';
      } else {
        cell.className    = 'c-cell' + (marked.has(num) ? ' marked' : '');
        cell.textContent  = num;
        cell.dataset.num  = num;
        cell.addEventListener('click', () => toggleMark(cell, num));
      }
      container.appendChild(cell);
    }
  }
}

function toggleMark(cell, num) {
  if (!cardLocked) return;

  // When connected to a sala, only allow marking numbers that were actually called
  if (connectedSalaCode && !marked.has(num) && !calledNums.has(num)) {
    warnUncalled(cell);
    return;
  }

  if (marked.has(num)) {
    marked.delete(num);
    cell.classList.remove('marked');
    if (calledNums.has(num)) cell.classList.add('called');
  } else {
    marked.add(num);
    cell.classList.add('marked');
    cell.classList.remove('called');
  }
  updateProgress();
  saveGame();
  checkLinea();
  if (marked.size === 15) setTimeout(showBingo, 350);
}

function checkLinea() {
  if (lineaCalled) return;
  for (let row = 0; row < 3; row++) {
    const rowNums = cardGrid[row].filter(n => n !== null);
    if (rowNums.every(n => marked.has(n))) {
      lineaCalled = true;
      setTimeout(showLineaCelebration, 200);
      if (connectedSalaCode) {
        db.ref('salas/' + connectedSalaCode + '/lineas').push({
          jugador:   document.getElementById('carton-player').textContent,
          timestamp: Date.now()
        });
      }
      break;
    }
  }
}

function showLineaCelebration() {
  const veil = document.getElementById('linea-veil');
  veil.classList.remove('hidden');
  setTimeout(() => veil.classList.add('hidden'), 2500);
}

function resetAndRejoin() {
  const code = pendingRejoinCode;
  const name = pendingRejoinName;
  generateNewCard();                        // cleans up listeners
  if (code) doLockCard(name || '', code);   // re-joins same sala
}

function exitFromReset() {
  generateNewCard();
  showView('home');
}

function warnUncalled(cell) {
  cell.classList.remove('cell-shake');
  void cell.offsetWidth;
  cell.classList.add('cell-shake');
  setTimeout(() => cell.classList.remove('cell-shake'), 400);
  showToast('¡Ese número no salió todavía!');
}

function showToast(msg) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast-show');
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  });
}

function updateProgress() {
  const pct = (marked.size / 15) * 100;
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('prog-lbl').textContent  = marked.size + ' / 15';
}

function showBingo() {
  document.getElementById('bingo-veil').classList.remove('hidden');
  launchConfetti();

  if (connectedSalaCode) {
    const name = document.getElementById('carton-player').textContent;
    db.ref('salas/' + connectedSalaCode + '/bingos').push({
      jugador: name,
      timestamp: Date.now()
    });
  }
}

// ─────────────────────────────────────────────
// PERSISTENCIA (localStorage)
// ─────────────────────────────────────────────

function saveGame() {
  if (!cardLocked) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cardGrid,
      marked:      [...marked],
      playerName:  document.getElementById('carton-player').textContent,
      salaCode:    connectedSalaCode,
      serial:      document.getElementById('carton-serial').textContent,
    }));
  } catch (_) {}
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function restoreGame(saved) {
  // Detach any existing listener
  if (salaRef && salaCallback) {
    salaRef.off('value', salaCallback);
    salaRef = null;
    salaCallback = null;
  }

  cardGrid   = saved.cardGrid;
  marked     = new Set(saved.marked);
  calledNums = new Set();
  cardLocked = true;
  connectedSalaCode = saved.salaCode || null;

  // Restore UI
  document.getElementById('carton-serial').textContent  = saved.serial;
  document.getElementById('carton-player').textContent  = saved.playerName;
  document.getElementById('game-setup').classList.add('hidden');
  document.getElementById('prog-row').classList.remove('hidden');
  document.getElementById('carton-hint').textContent    = 'Tocá los números para marcarlos';
  document.getElementById('btn-nuevo').textContent      = '🔒';

  renderCard();
  document.getElementById('carton-grid').classList.remove('prelocked');
  updateProgress();

  // Reconnect to sala (re-registers presence too)
  if (saved.salaCode) {
    joinSala(saved.salaCode, saved.playerName);
  }
}

// ─────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────

function launchConfetti() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99;overflow:hidden';
  document.body.appendChild(wrap);

  const colors = ['#FF3E7F','#FF85A2','#FFB3CF','#FF6BA3','#fff','#FFE0EF'];
  for (let i = 0; i < 70; i++) {
    const piece  = document.createElement('div');
    const isRect = Math.random() > 0.5;
    const size   = Math.random() * 9 + 5;
    piece.style.cssText = [
      'position:absolute', 'top:-20px',
      'left:'   + Math.random() * 100 + '%',
      'width:'  + size + 'px',
      'height:' + (isRect ? size * 0.4 : size) + 'px',
      'background:' + colors[Math.floor(Math.random() * colors.length)],
      'border-radius:' + (isRect ? '2px' : '50%')
    ].join(';');
    wrap.appendChild(piece);

    piece.animate([
      { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
      { transform: `translateY(110vh) translateX(${(Math.random()-.5)*300}px) rotate(${(Math.random()-.5)*1440}deg)`, opacity: 0.2 }
    ], {
      duration: Math.random() * 2000 + 2200,
      delay:    Math.random() * 700,
      easing:   'cubic-bezier(.25,.46,.45,.94)',
      fill:     'forwards'
    });
  }
  setTimeout(() => wrap.remove(), 4200);
}

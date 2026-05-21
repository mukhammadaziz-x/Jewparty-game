/* ══════════════════════════════════════════════════════════════
   PDP JEWPARTY – app.js
   Complete game logic: Home → Setup → Board → End
══════════════════════════════════════════════════════════════ */

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ALL_CATEGORIES = {
  "🎬 Movies": {
    100: { q: "This 1994 film features a man named Forrest who runs across America.", a: "Forrest Gump" },
    200: { q: "The line 'I'll be back' is from which Arnold Schwarzenegger movie?", a: "The Terminator" },
    300: { q: "Which Christopher Nolan film features a city folding inside a dream?", a: "Inception" },
    400: { q: "Who directed the 'Lord of the Rings' trilogy?", a: "Peter Jackson" },
    500: { q: "What 1994 crime film features Jules Winnfield and Vincent Vega?", a: "Pulp Fiction" },
  },
  "🎵 Music": {
    100: { q: "Which artist released the album 'Thriller' in 1982?", a: "Michael Jackson" },
    200: { q: "What band performed 'Bohemian Rhapsody'?", a: "Queen" },
    300: { q: "In what year did The Beatles release 'Abbey Road'?", a: "1969" },
    400: { q: "Who composed the '9th Symphony' despite being deaf?", a: "Beethoven" },
    500: { q: "What genre of music is associated with artists like Tupac and Notorious B.I.G.?", a: "East Coast Hip-Hop / Rap" },
  },
  "🐾 Animals": {
    100: { q: "What is the fastest land animal?", a: "Cheetah" },
    200: { q: "How many hearts does an octopus have?", a: "Three" },
    300: { q: "What is the only mammal capable of true flight?", a: "Bat" },
    400: { q: "What animal has the longest recorded lifespan, living over 500 years?", a: "Greenland Shark" },
    500: { q: "What is the name of the sound a giraffe makes?", a: "Hum / Humming (they are nearly silent)" },
  },
  "🎮 Games": {
    100: { q: "What is the best-selling video game of all time?", a: "Minecraft" },
    200: { q: "In chess, which piece can only move diagonally?", a: "Bishop" },
    300: { q: "Which game features the character 'Master Chief'?", a: "Halo" },
    400: { q: "What year was the original Pong arcade game released?", a: "1972" },
    500: { q: "In Dota 2, what is the name of the final boss that both teams try to defeat last?", a: "Roshan" },
  },
  "🔬 Science": {
    100: { q: "What planet is known as the Red Planet?", a: "Mars" },
    200: { q: "What is the chemical symbol for Gold?", a: "Au" },
    300: { q: "How many bones are in an adult human body?", a: "206" },
    400: { q: "What is the speed of light (approx) in km/s?", a: "299,792 km/s" },
    500: { q: "What is the powerhouse of the cell?", a: "Mitochondria" },
  },
  "📚 History": {
    100: { q: "In what year did World War II end?", a: "1945" },
    200: { q: "Who was the first President of the United States?", a: "George Washington" },
    300: { q: "The Great Wall of China was primarily built during which dynasty?", a: "Ming Dynasty" },
    400: { q: "What year did the Berlin Wall fall?", a: "1989" },
    500: { q: "In what year did Uzbekistan gain its independence?", a: "1991" },
  },
  "🌍 Geography": {
    100: { q: "What is the capital of France?", a: "Paris" },
    200: { q: "What is the longest river in the world?", a: "The Nile" },
    300: { q: "Which country has the most natural lakes?", a: "Canada" },
    400: { q: "What is the smallest country in the world by area?", a: "Vatican City" },
    500: { q: "How many countries share a border with Russia?", a: "14 countries" },
  },
  "🍕 Food": {
    100: { q: "What is the main ingredient in guacamole?", a: "Avocado" },
    200: { q: "From which country does pizza originate?", a: "Italy" },
    300: { q: "What spice gives turmeric its yellow color?", a: "Curcumin" },
    400: { q: "What is the national dish of Uzbekistan?", a: "Plov (Osh)" },
    500: { q: "What chocolate drink was invented by the Aztecs and originally served cold and bitter?", a: "Hot Chocolate (Xocolatl)" },
  },
};

const POINT_VALUES = [100, 200, 300, 400, 500];
const TEAM_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];
const MAX_TEAMS = 6;
const MIN_TEAMS = 2;

// ─── STATE ────────────────────────────────────────────────────────────────────
let G = {
  selectedCats: [],
  teamCount: 3,
  teams: [],
  answered: new Set(),
  currentQ: null,
  timerInterval: null,
  confettiCtx: null,
  confettiPieces: [],
  confettiAF: null,
};

// ─── BG PARTICLES ─────────────────────────────────────────────────────────────
(function () {
  const c = document.getElementById('bg-canvas');
  const ctx = c.getContext('2d');
  let pts = [];
  function resize() { c.width = innerWidth; c.height = innerHeight; }
  window.addEventListener('resize', resize); resize();
  for (let i = 0; i < 90; i++) {
    pts.push({
      x: Math.random() * c.width, y: Math.random() * c.height,
      r: Math.random() * 1.4 + 0.3,
      dx: (Math.random() - .5) * .25, dy: (Math.random() - .5) * .25,
      a: Math.random() * .5 + .1,
    });
  }
  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.a})`; ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
      if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ─── TOAST ────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg, dur = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), dur);
}

// ─── PAGE NAV ─────────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════
function buildPreviewBoard() {
  const board = document.getElementById('preview-board');
  const previewCats = ["🎬 Movies", "🎮 Games", "🔬 Science", "📚 History"];
  const previewPts = [100, 200, 300, 400, 500];

  board.style.gridTemplateColumns = `repeat(${previewCats.length}, 1fr)`;
  board.innerHTML = '';

  // Headers
  previewCats.forEach(c => {
    const h = document.createElement('div');
    h.className = 'pb-header';
    h.textContent = c.replace(/^\S+\s/, ''); // strip emoji
    board.appendChild(h);
  });

  // Cells
  previewPts.forEach(pts => {
    previewCats.forEach(() => {
      const cell = document.createElement('div');
      cell.className = 'pb-cell';
      cell.textContent = pts;
      board.appendChild(cell);
    });
  });
}
buildPreviewBoard();

function showHowTo() { document.getElementById('howto-panel').classList.remove('hidden'); }
function hideHowTo() { document.getElementById('howto-panel').classList.add('hidden'); }

function goHome() {
  stopConfetti();
  showPage('pg-home');
}

// ═══════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════
function goSetup() {
  G.selectedCats = [];
  G.teamCount = 3;
  buildCategoryGrid();
  buildTeamNameGrid(G.teamCount);
  updateCountDisplay();
  showPage('pg-setup');
}

function buildCategoryGrid() {
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';
  Object.keys(ALL_CATEGORIES).forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.dataset.cat = cat;
    card.innerHTML = `
      <div class="cat-emoji">${cat.match(/^\S+/)[0]}</div>
      <div class="cat-name">${cat.replace(/^\S+\s/, '')}</div>
      <div class="cat-count">${Object.keys(ALL_CATEGORIES[cat]).length} questions</div>
    `;
    card.addEventListener('click', () => toggleCategory(cat, card));
    grid.appendChild(card);
  });
}

function toggleCategory(cat, card) {
  const idx = G.selectedCats.indexOf(cat);
  if (idx === -1) {
    if (G.selectedCats.length >= 6) return toast('⚠️ Max 6 categories allowed!');
    G.selectedCats.push(cat);
    card.classList.add('selected');
  } else {
    G.selectedCats.splice(idx, 1);
    card.classList.remove('selected');
  }
}

function changeTeamCount(delta) {
  const next = G.teamCount + delta;
  if (next < MIN_TEAMS || next > MAX_TEAMS) return;
  G.teamCount = next;
  updateCountDisplay();
  buildTeamNameGrid(G.teamCount);
}

function updateCountDisplay() {
  document.getElementById('team-count-display').textContent = G.teamCount;
  document.getElementById('count-minus').disabled = G.teamCount <= MIN_TEAMS;
  document.getElementById('count-plus').disabled = G.teamCount >= MAX_TEAMS;
}

function buildTeamNameGrid(count) {
  const grid = document.getElementById('team-names-grid');

  // Preserve existing names
  const existing = Array.from(grid.querySelectorAll('.team-name-input')).map(i => i.value);

  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const col = TEAM_COLORS[i];
    const card = document.createElement('div');
    card.className = 'team-name-card';
    card.style.borderColor = col + '55';
    card.innerHTML = `
      <div class="team-name-label">
        <div class="team-color-dot" style="background:${col}"></div>
        Team ${i + 1}
      </div>
      <input class="team-name-input" type="text"
             placeholder="Team ${i + 1}"
             value="${existing[i] || ''}"
             maxlength="20" />
    `;
    grid.appendChild(card);
  }
}

function startGame() {
  if (G.selectedCats.length < 3) {
    return toast('⚠️ Please select at least 3 categories!');
  }

  // Gather team names
  G.teams = [];
  const inputs = document.querySelectorAll('.team-name-input');
  inputs.forEach((inp, i) => {
    G.teams.push({
      name: inp.value.trim() || `Team ${i + 1}`,
      score: 0,
      color: TEAM_COLORS[i],
    });
  });

  G.answered = new Set();
  G.currentQ = null;

  buildGameBoard();
  renderScorebar();
  showPage('pg-game');
  document.getElementById('gtb-center').textContent = 'Select a question to begin!';
}

// ═══════════════════════════════════════════════
//  GAME BOARD
// ═══════════════════════════════════════════════
function buildGameBoard() {
  const board = document.getElementById('jeopardy-board');
  const cats = G.selectedCats;
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${cats.length}, 1fr)`;
  board.style.gridTemplateRows = `auto repeat(${POINT_VALUES.length}, 1fr)`;

  // Headers
  cats.forEach(cat => {
    const h = document.createElement('div');
    h.className = 'b-header';
    h.textContent = cat;
    board.appendChild(h);
  });

  // Cells
  POINT_VALUES.forEach(pts => {
    cats.forEach(cat => {
      const key = `${cat}|${pts}`;
      const cell = document.createElement('div');
      cell.className = 'b-cell';
      cell.id = 'cell_' + key.replace(/\W/g, '_');
      cell.dataset.cat = cat;
      cell.dataset.pts = pts;
      cell.innerHTML = `<span class="b-value">${pts}</span>`;
      if (G.answered.has(key)) cell.classList.add('done');
      else cell.addEventListener('click', () => openQuestion(cat, pts, key, cell));
      board.appendChild(cell);
    });
  });
}

function openQuestion(cat, pts, key, cell) {
  if (G.answered.has(key)) return;
  G.currentQ = { cat, pts, key, cell };

  const data = ALL_CATEGORIES[cat][pts];
  document.getElementById('q-cat').textContent = cat;
  document.getElementById('q-pts').textContent = pts;
  document.getElementById('q-body').textContent = data.q;
  document.getElementById('q-ans-text').textContent = data.a;
  document.getElementById('q-answer-wrap').classList.add('hidden');
  document.getElementById('reveal-btn').classList.remove('hidden');

  // Reset timer animation
  const timerEl = document.getElementById('q-timer');
  timerEl.style.animation = 'none';
  timerEl.offsetHeight; // reflow
  timerEl.style.animation = 'countdown 30s linear forwards';

  document.getElementById('q-modal').classList.remove('hidden');

  // Mark active
  cell.classList.add('active-q');
  document.getElementById('gtb-center').textContent = `${cat} — $${pts}`;
}

function revealAnswer() {
  document.getElementById('q-answer-wrap').classList.remove('hidden');
  document.getElementById('reveal-btn').classList.add('hidden');
}

function closeQuestion() {
  if (!G.currentQ) return;
  // Mark answered
  G.answered.add(G.currentQ.key);
  G.currentQ.cell.classList.add('done');
  G.currentQ.cell.classList.remove('active-q');
  G.currentQ.cell.innerHTML = '';  // clear dollar amount
  G.currentQ = null;

  document.getElementById('q-modal').classList.add('hidden');
  document.getElementById('gtb-center').textContent = 'Select a question to begin!';

  checkGameOver();
}

function checkGameOver() {
  const total = G.selectedCats.length * POINT_VALUES.length;
  if (G.answered.size >= total) {
    setTimeout(showEndScreen, 600);
  }
}

// ═══════════════════════════════════════════════
//  SCOREBAR
// ═══════════════════════════════════════════════
function renderScorebar() {
  const bar = document.getElementById('scorebar');
  bar.innerHTML = '';

  G.teams.forEach((team, i) => {
    const card = document.createElement('div');
    card.className = 'scorecard';
    card.id = `sc-${i}`;
    card.style.borderColor = team.color + '66';
    card.innerHTML = `
      <div class="sc-dot" style="background:${team.color}"></div>
      <div class="sc-name" title="${esc(team.name)}">${esc(team.name)}</div>
      <div class="sc-score" id="sc-score-${i}">${team.score}</div>
      <div class="sc-controls">
        <button class="sc-btn plus"  onclick="adjustScore(${i}, 1)"  title="Add points">+</button>
        <button class="sc-btn minus" onclick="adjustScore(${i}, -1)" title="Deduct points">−</button>
      </div>
    `;
    bar.appendChild(card);
  });

  highlightLeader();
}

function adjustScore(teamIdx, direction) {
  if (!G.currentQ && direction === 1) {
    // If no active question, do manual +100
    G.teams[teamIdx].score += 100;
    refreshScorecard(teamIdx);
    highlightLeader();
    return;
  }
  if (!G.currentQ && direction === -1) {
    G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score - 100);
    refreshScorecard(teamIdx);
    highlightLeader();
    return;
  }
  if (!G.currentQ) return;

  const pts = G.currentQ.pts;
  if (direction === 1) {
    G.teams[teamIdx].score += pts;
    showScorePopup(teamIdx, `+${pts}`, '#10b981');
    closeQuestion();
  } else {
    G.teams[teamIdx].score = Math.max(0, G.teams[teamIdx].score - pts);
    showScorePopup(teamIdx, `-${pts}`, '#ef4444');
  }
  refreshScorecard(teamIdx);
  highlightLeader();
}

function refreshScorecard(i) {
  const el = document.getElementById(`sc-score-${i}`);
  if (el) {
    el.textContent = G.teams[i].score;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'fadeIn .3s ease';
  }
}

function highlightLeader() {
  const maxScore = Math.max(...G.teams.map(t => t.score));
  G.teams.forEach((t, i) => {
    const card = document.getElementById(`sc-${i}`);
    if (!card) return;
    if (t.score === maxScore && maxScore > 0) card.classList.add('leading');
    else card.classList.remove('leading');
  });
}

function showScorePopup(teamIdx, text, color) {
  const card = document.getElementById(`sc-${teamIdx}`);
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = text;
  popup.style.color = color;
  popup.style.left = rect.left + rect.width / 2 + 'px';
  popup.style.top = rect.top - 10 + 'px';
  popup.style.transform = 'translateX(-50%)';
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1600);
}

// ═══════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
  else document.exitFullscreen();
}

function confirmReset() {
  if (confirm('Reset the game? All scores will be cleared!')) {
    G.teams.forEach(t => t.score = 0);
    G.answered.clear();
    G.currentQ = null;
    document.getElementById('q-modal').classList.add('hidden');
    buildGameBoard();
    renderScorebar();
  }
}

// ═══════════════════════════════════════════════
//  END SCREEN
// ═══════════════════════════════════════════════
function showEndScreen() {
  const sorted = [...G.teams].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  const pOrder = [1, 0, 2];  // show order: 2nd, 1st, 3rd
  const pClass = ['p2', 'p1', 'p3'];
  const pH = [90, 120, 70];

  // Winner banner
  document.getElementById('winner-banner').textContent =
    `🏆 ${sorted[0].name} wins with ${sorted[0].score} points!`;

  // Podium
  const podium = document.getElementById('end-podium');
  podium.innerHTML = '';
  pOrder.forEach((rank, vi) => {
    const p = sorted[rank];
    if (!p) return;
    const col = document.createElement('div');
    col.className = `podium-col ${pClass[vi]}`;
    col.innerHTML = `
      <div class="podium-medal">${medals[rank]}</div>
      <div class="podium-name" style="color:${p.color}">${esc(p.name)}</div>
      <div class="podium-pts">${p.score}</div>
      <div class="podium-stand" style="height:${pH[vi]}px">${rank + 1}</div>
    `;
    podium.appendChild(col);
  });

  // All scores
  document.getElementById('end-all-scores').innerHTML = sorted.map((t, i) => `
    <div class="end-row">
      <span class="end-rank">${medals[i] || i + 1}</span>
      <div class="end-dot"  style="background:${t.color}"></div>
      <span class="end-name">${esc(t.name)}</span>
      <span class="end-score">${t.score}</span>
    </div>
  `).join('');

  showPage('pg-end');
  startConfetti();
}

function playAgain() {
  stopConfetti();
  goSetup();
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  G.confettiCtx = ctx;
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  const COLORS = ['#fbbf24', '#6366f1', '#ec4899', '#10b981', '#f87171', '#60a5fa', '#a78bfa'];
  G.confettiPieces = [];
  for (let i = 0; i < 160; i++) {
    G.confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      r: Math.random() * Math.PI,
      dr: (Math.random() - .5) * .1,
      dx: (Math.random() - .5) * 1.5,
      dy: Math.random() * 3 + 1.5,
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    G.confettiPieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.dx; p.y += p.dy; p.r += p.dr;
      if (p.y > canvas.height + 20) {
        p.y = -20; p.x = Math.random() * canvas.width;
      }
    });
    G.confettiAF = requestAnimationFrame(loop);
  }
  loop();
}

function stopConfetti() {
  if (G.confettiAF) { cancelAnimationFrame(G.confettiAF); G.confettiAF = null; }
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── KEYBOARD ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideHowTo();
    document.getElementById('q-modal').classList.add('hidden');
  }
  if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
  // Space to reveal answer
  if (e.key === ' ' && !document.getElementById('q-modal').classList.contains('hidden')) {
    e.preventDefault();
    const revealBtn = document.getElementById('reveal-btn');
    if (!revealBtn.classList.contains('hidden')) revealAnswer();
  }
});

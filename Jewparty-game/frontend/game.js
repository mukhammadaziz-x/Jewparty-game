/* ══════════════════════════
   game.js – PDP Jewparty
   Kahoot-style multiplayer
══════════════════════════ */
const API = `${location.protocol}//${location.host}`;
const WS = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

// ─── State ────────────────────────────────────────────────────────────────────
let G = {
    pin: null, playerId: null, isHost: false, me: null,
    state: null, ws: null,
    confettiAF: null, confettiPieces: [],
};

// ─── RECOVERY ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('jp_sess');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            G.pin = data.pin;
            G.playerId = data.playerId;
            G.isHost = data.isHost;
            connectWS();
        } catch (e) { }
    }
});

// ─── Particles ────────────────────────────────────────────────────────────────
(function () {
    const c = document.getElementById('bg-canvas'), ctx = c.getContext('2d');
    let pts = [];
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    window.addEventListener('resize', resize); resize();
    for (let i = 0; i < 90; i++) pts.push({
        x: Math.random() * c.width, y: Math.random() * c.height,
        r: Math.random() * 1.4 + .3, dx: (Math.random() - .5) * .25, dy: (Math.random() - .5) * .25, a: Math.random() * .5 + .1
    });
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

// ─── Utils ────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg, dur = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), dur);
}
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
async function gotoHostSetup() {
    try {
        const topics = await fetch(`${API}/api/topics`).then(r => r.json());
        buildTopicsGrid(topics);
        showView('v-host-setup');
    } catch (e) {
        toast('❌ Cannot connect to server. Is it running?');
    }
}

function buildTopicsGrid(topics) {
    const grid = document.getElementById('sel-topics-grid');
    grid.innerHTML = '';
    if (!topics.length) {
        grid.innerHTML = '<p style="color:var(--t3);grid-column:1/-1;text-align:center">No topics yet. <a href="/admin" style="color:var(--acc1)">Add topics in Admin panel →</a></p>';
        return;
    }
    topics.forEach(t => {
        const card = document.createElement('div');
        card.className = 'sel-topic-card';
        card.dataset.id = t.id;
        card.dataset.selected = 'false';
        card.innerHTML = `
      <div class="stc-emoji">${t.emoji}</div>
      <div class="stc-name">${esc(t.name)}</div>
      <div class="stc-count">${t.questions.length} questions</div>
    `;
        card._topicData = t;
        card.addEventListener('click', () => {
            const sel = card.dataset.selected === 'true';
            card.dataset.selected = sel ? 'false' : 'true';
            card.classList.toggle('selected', !sel);
        });
        grid.appendChild(card);
    });
}

async function createRoom() {
    const cards = [...document.querySelectorAll('.sel-topic-card[data-selected="true"]')];
    if (cards.length < 1) return toast('⚠️ Select at least 1 topic!');
    const topics = cards.map(c => c._topicData);
    const hostName = document.getElementById('host-name').value.trim() || 'Host';
    try {
        const res = await fetch(`${API}/api/rooms`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host_name: hostName, topics }),
        });
        const data = await res.json();
        G.pin = data.pin; G.playerId = data.player_id; G.isHost = true;
        sessionStorage.setItem('jp_sess', JSON.stringify({ pin: G.pin, playerId: G.playerId, isHost: G.isHost }));
        document.getElementById('pin-display').textContent = data.pin;
        document.getElementById('pin-url').textContent = location.host;
        document.getElementById('board-pin').textContent = data.pin;
        showView('v-waiting');
        connectWS();
    } catch (e) { toast('❌ Server connection failed'); }
}

// ─── JOIN ─────────────────────────────────────────────────────────────────────
async function joinGame() {
    const name = document.getElementById('join-name').value.trim();
    const pin = document.getElementById('join-pin').value.trim();
    if (!name) return toast('⚠️ Enter your name!');
    if (!pin || pin.length < 4) return toast('⚠️ Enter a valid PIN!');
    try {
        const res = await fetch(`${API}/api/rooms/${pin}/join`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const e = await res.json();
            return toast(`❌ ${e.detail}`);
        }
        const data = await res.json();
        G.pin = data.pin; G.playerId = data.player_id; G.isHost = false;
        sessionStorage.setItem('jp_sess', JSON.stringify({ pin: G.pin, playerId: G.playerId, isHost: G.isHost }));
        showView('v-player');
        // show waiting msg
        document.getElementById('player-chip').textContent = name;
        document.getElementById('player-chip').style.color = '#fff';
        connectWS();
    } catch (e) { toast('❌ Could not join. Check PIN.'); }
}

// ─── WS ───────────────────────────────────────────────────────────────────────
function connectWS() {
    G.ws = new WebSocket(`${WS}/ws/${G.pin}/${G.playerId}`);
    G.ws.onmessage = e => handleMsg(JSON.parse(e.data));
    G.ws.onclose = () => { toast('⚠️ Disconnected. Reconnecting…'); setTimeout(connectWS, 3000); };
    G.ws.onerror = () => toast('❌ WebSocket error');
}
function send(obj) {
    if (G.ws && G.ws.readyState === WebSocket.OPEN) G.ws.send(JSON.stringify(obj));
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
function handleMsg(msg) {
    G.state = msg.state || G.state;
    if (msg.me) { G.me = msg.me; applyMyColor(msg.me.color); }

    switch (msg.type) {
        case 'init':
            G.me = msg.me;
            G.state = msg.state;
            applyMyColor(msg.me.color);
            if (G.isHost) {
                if (msg.state.game_started) {
                    enterBoard();
                } else {
                    document.getElementById('pin-display').textContent = G.pin;
                    document.getElementById('pin-url').textContent = location.host;
                    document.getElementById('board-pin').textContent = G.pin;
                    renderWaitingPlayers(msg.state.players);
                    showView('v-waiting');
                }
            } else {
                renderPlayerHeader(msg.me);
                renderPlayerLB(msg.state.players);
                showView('v-player');
                if (msg.state.game_started) {
                    enterPlayerGame();
                    if (msg.state.current_q) showPlayerQuestion(msg.state.current_q);
                } else {
                    document.getElementById('player-status-msg').classList.remove('hidden');
                }
            }
            break;

        case 'player_joined':
            if (G.isHost) {
                renderWaitingPlayers(msg.state.players);
                if (!G.state.game_started) {
                    toast(`👋 ${msg.player.name} joined!`);
                    document.getElementById('player-count-badge').textContent =
                        Object.values(msg.state.players).filter(p => !p.is_host).length;
                }
            }
            if (!G.isHost) renderPlayerLB(msg.state.players);
            break;

        case 'player_left':
            if (!G.isHost) renderPlayerLB(msg.state.players);
            break;

        case 'game_started':
            if (G.isHost) enterBoard();
            else { enterPlayerGame(); toast('🎮 Game started! Ready to buzz!'); }
            break;

        case 'question_open':
            if (G.isHost) { openQuestionModal(msg.question); updateBoardStatus(`${msg.question.topic_name} — ${msg.question.points} pts`); }
            else { showPlayerQuestion(msg.question); }
            updateScoreboards(msg.state.players);
            break;

        case 'buzzed':
            if (G.isHost) showBuzzed(msg.player_id, msg.player_name, msg.player_color);
            else showPlayerBuzzed(msg.player_id, msg.player_name, msg.player_color);
            break;

        case 'answer_correct':
            updateScoreboards(msg.state.players);
            if (G.isHost) {
                closeQuestionModal();
                updateBoardAnswered();
                toast(`✅ ${msg.winner_name} Got it! +${msg.points} pts`);
            } else {
                closePlayerQuestion();
                flashResult('correct', msg.winner_name, msg.points, msg.answer);
            }
            break;

        case 'answer_wrong':
            updateScoreboards(msg.state.players);
            if (G.isHost) { clearBuzzer(); toast(`❌ ${msg.loser_name} was wrong! -${msg.points} pts. Others can buzz!`); }
            else flashResult('wrong', msg.loser_name, msg.points);
            break;

        case 'skipped':
        case 'timeout':
            updateScoreboards(msg.state.players);
            if (G.isHost) { closeQuestionModal(); updateBoardAnswered(); toast(msg.type === 'timeout' ? `⏱ Time's up! Answer: ${msg.answer}` : `Skipped. Answer: ${msg.answer}`); }
            else { closePlayerQuestion(); if (msg.answer) toast(`Answer: ${msg.answer}`); }
            break;

        case 'game_over':
            showEndScreen(msg.scores);
            break;

        case 'chat':
            break;

        case 'error':
            toast(`❌ ${msg.message}`);
            break;
    }
}

// ─── HOST FUNCTIONS ───────────────────────────────────────────────────────────
function renderWaitingPlayers(players) {
    const el = document.getElementById('waiting-players');
    el.innerHTML = Object.values(players).map(p => `
    <div class="wp-chip">
      <div class="wp-dot" style="background:${p.color}"></div>
      <span class="wp-name">${esc(p.name)}${p.is_host ? ' 👑' : ''}</span>
    </div>
  `).join('');
    const count = Object.values(players).filter(p => !p.is_host).length;
    document.getElementById('player-count-badge').textContent = count;
}

function startGame() { send({ type: 'start_game' }); }

function enterBoard() {
    buildBoard(G.state.topics);
    updateScoreboards(G.state.players);
    updateBoardAnswered();
    showView('v-board');
}

function buildBoard(topics) {
    const board = document.getElementById('jeopardy-board');
    board.innerHTML = '';
    const pts = [100, 200, 300, 400, 500];
    board.style.gridTemplateColumns = `repeat(${topics.length}, 1fr)`;
    board.style.gridTemplateRows = `auto repeat(${pts.length}, 1fr)`;

    // Headers
    topics.forEach(t => {
        const h = document.createElement('div');
        h.className = 'b-hdr';
        h.textContent = `${t.emoji} ${t.name}`;
        board.appendChild(h);
    });

    // Sort each topic's questions by points
    topics.forEach(topic => {
        // build map
        topic._qByPts = {};
        topic.questions.forEach(q => { topic._qByPts[q.points] = q; });
    });

    pts.forEach(p => {
        topics.forEach(topic => {
            const q = topic._qByPts && topic._qByPts[p];
            const key = q ? `${topic.id}_${q.id}` : null;
            const cell = document.createElement('div');
            cell.className = 'b-cell';
            if (key) cell.id = 'cell_' + key.replace(/\W/g, '_');
            cell.innerHTML = `<span class="b-val">${p}</span>`;
            if (q && G.isHost) {
                if (G.state.answered.includes(key)) {
                    cell.classList.add('done');
                } else {
                    cell.addEventListener('click', () => selectQuestion(topic.id, q.id));
                }
            } else {
                cell.classList.add('locked');
            }
            board.appendChild(cell);
        });
    });
}

function updateBoardAnswered() {
    if (!G.state) return;
    G.state.answered.forEach(key => {
        const safeKey = key.replace(/\W/g, '_');
        const cell = document.getElementById(`cell_${safeKey}`);
        if (cell && !cell.classList.contains('done')) {
            cell.classList.add('done');
            const old = cell.cloneNode(true);
            cell.parentNode.replaceChild(old, cell);
        }
    });
}

function selectQuestion(topicId, qId) {
    if (G.state.current_q) return toast('A question is already active!');
    send({ type: 'select_question', topic_id: topicId, q_id: qId });
}

function openQuestionModal(q) {
    document.getElementById('qm-cat').textContent = q.topic_name;
    document.getElementById('qm-pts').textContent = q.points;
    document.getElementById('qm-text').textContent = q.question;
    // Image
    const img = document.getElementById('qm-img');
    if (q.image) { img.src = `/uploads/${q.image}`; img.classList.remove('hidden'); }
    else { img.classList.add('hidden'); }
    // Reset
    document.getElementById('q-answer-area').classList.add('hidden');
    document.getElementById('q-buzz-info').classList.add('hidden');
    document.getElementById('q-waiting-buzz').classList.remove('hidden');
    document.getElementById('btn-reveal').classList.remove('hidden');
    // Reset timer
    const tf = document.getElementById('qm-timer');
    tf.style.animation = 'none'; tf.offsetHeight; tf.style.animation = 'countdown 30s linear forwards';
    document.getElementById('q-modal').classList.remove('hidden');
}

function showBuzzed(playerId, playerName, playerColor) {
    const info = document.getElementById('q-buzz-info');
    const wait = document.getElementById('q-waiting-buzz');
    document.getElementById('buzz-player-name').textContent = playerName;
    document.getElementById('buzz-player-name').style.color = playerColor;
    info.classList.remove('hidden');
    wait.classList.add('hidden');
}

function clearBuzzer() {
    document.getElementById('q-buzz-info').classList.add('hidden');
    document.getElementById('q-waiting-buzz').classList.remove('hidden');
}

function judgeAnswer(correct) { send({ type: correct ? 'correct_answer' : 'wrong_answer' }); }
function revealAnswer() {
    const ans = G.state && G.state.current_q ? G.state.current_q.answer : '';
    document.getElementById('qm-answer').textContent = ans;
    document.getElementById('q-answer-area').classList.remove('hidden');
    document.getElementById('btn-reveal').classList.add('hidden');
}
function skipQuestion() { send({ type: 'skip' }); }
function closeQuestionModal() {
    document.getElementById('q-modal').classList.add('hidden');
    updateBoardStatus('Select a question!');
}
function closeQuestion() { closeQuestionModal(); }

function updateBoardStatus(msg) { document.getElementById('board-status').textContent = msg; }

function endGame() {
    if (confirm('End game for everyone?')) {
        sessionStorage.removeItem('jp_sess');
        send({ type: 'end_game' });
    }
}

// ─── PLAYER FUNCTIONS ─────────────────────────────────────────────────────────
function applyMyColor(color) {
    const chip = document.getElementById('player-chip');
    if (chip) chip.style.background = color + '33';
}

function renderPlayerHeader(me) {
    document.getElementById('player-chip').textContent = me.name;
    document.getElementById('player-chip').style.color = me.color;
    document.getElementById('player-score-chip').textContent = `${me.score} pts`;
}

function enterPlayerGame() {
    document.getElementById('player-status-msg').classList.add('hidden');
    document.getElementById('buzz-area').classList.remove('hidden');
    document.getElementById('buzz-btn').disabled = true;
    document.getElementById('buzz-result').classList.add('hidden');
}

function showPlayerQuestion(q) {
    const qa = document.getElementById('player-question-area');
    qa.classList.remove('hidden');
    document.getElementById('pq-cat').textContent = q.topic_name;
    document.getElementById('pq-pts').textContent = q.points;
    document.getElementById('pq-text').textContent = q.question;
    // Image
    const img = document.getElementById('pq-img');
    if (q.image) { img.src = `/uploads/${q.image}`; img.classList.remove('hidden'); }
    else img.classList.add('hidden');
    // Timer reset
    const tf = document.getElementById('pq-timer');
    tf.style.animation = 'none'; tf.offsetHeight; tf.style.animation = 'countdown 30s linear forwards';
    // Enable buzz
    document.getElementById('buzz-btn').disabled = false;
    document.getElementById('buzz-btn').classList.remove('buzzed-by-other');
    const br = document.getElementById('buzz-result');
    br.className = 'buzz-result hidden';
    br.textContent = '';
}

function closePlayerQuestion() {
    document.getElementById('player-question-area').classList.add('hidden');
    document.getElementById('buzz-area').classList.add('hidden');
    document.getElementById('buzz-result').className = 'buzz-result hidden';
    document.getElementById('buzz-btn').disabled = true;
    // Show waiting again
    setTimeout(() => {
        document.getElementById('player-status-msg').classList.remove('hidden');
        document.getElementById('buzz-area').classList.remove('hidden');
        document.getElementById('buzz-btn').disabled = true;
    }, 2000);
}

function showPlayerBuzzed(playerId, playerName, playerColor) {
    const br = document.getElementById('buzz-result');
    const isMe = playerId === G.playerId;
    br.className = 'buzz-result buzzed';
    br.textContent = isMe ? '⚡ You buzzed in! Answer now!' : `⚡ ${playerName} buzzed in!`;
    br.style.color = isMe ? '#fff' : playerColor;
    br.classList.remove('hidden');
    document.getElementById('buzz-btn').disabled = true;
    if (isMe) {
        document.getElementById('buzz-btn').style.animation = 'none';
    }
}

function doBuzz() {
    send({ type: 'buzz' });
    document.getElementById('buzz-btn').disabled = true;
}

function flashResult(type, name, pts, answer) {
    const br = document.getElementById('buzz-result');
    br.classList.remove('hidden');
    if (type === 'correct') {
        const isMe = name === (G.me && G.me.name);
        br.className = 'buzz-result correct';
        br.textContent = isMe ? `🎉 Correct! +${pts} pts!` : `✅ ${name} got it! +${pts} pts`;
        // Update my score if it's me
        if (isMe && G.me) {
            G.me.score += pts;
            document.getElementById('player-score-chip').textContent = `${G.me.score} pts`;
        }
        if (answer) toast(`✅ Answer: ${answer}`);
    } else {
        const isMe = name === (G.me && G.me.name);
        br.className = 'buzz-result wrong';
        br.textContent = isMe ? `❌ Wrong! -${pts} pts!` : `❌ ${name} got it wrong! -${pts} pts`;
    }
}

function renderPlayerLB(players) {
    const lb = document.getElementById('player-lb');
    const sorted = Object.values(players).filter(p => !p.is_host).sort((a, b) => b.score - a.score);
    lb.innerHTML = sorted.map((p, i) => `
    <div class="plb-item">
      <span class="plb-name" title="${esc(p.name)}">${['🥇', '🥈', '🥉'][i] || ''}${esc(p.name)}</span>
      <span class="plb-score">${p.score}</span>
    </div>
  `).join('');
}

// ─── SCOREBOARDS ──────────────────────────────────────────────────────────────
function updateScoreboards(players) {
    const sorted = Object.values(players).filter(p => !p.is_host).sort((a, b) => b.score - a.score);
    const maxScore = sorted[0]?.score || 0;
    // Host scorebar
    const sb = document.getElementById('scorebar');
    if (sb) {
        sb.innerHTML = sorted.map(p => `
      <div class="scorecard ${p.score === maxScore && maxScore > 0 ? 'leading' : ''}">
        <div class="sc-dot" style="background:${p.color}"></div>
        <div class="sc-name" title="${esc(p.name)}">${esc(p.name)}</div>
        <div class="sc-score">${p.score}</div>
      </div>
    `).join('');
    }
    // Player LB
    renderPlayerLB(players);
    // Update player's own score
    if (!G.isHost && G.me && players[G.playerId]) {
        G.me.score = players[G.playerId].score;
        document.getElementById('player-score-chip').textContent = `${G.me.score} pts`;
    }
}

// ─── RESULT FLASH ─────────────────────────────────────────────────────────────
let _rfTimer;
function showResult(type, name, pts, answer) {
    // Only host sees this big flash
    if (!G.isHost) return;
    const rf = document.getElementById('result-flash');
    const icon = document.getElementById('rf-icon');
    const title = document.getElementById('rf-title');
    const msg = document.getElementById('rf-msg');
    if (type === 'correct') {
        icon.textContent = '🎉';
        title.textContent = `+${pts} pts`;
        title.style.color = '#10b981';
        msg.textContent = `${name} answered correctly!`;
        if (answer) msg.textContent += `  |  Answer: ${answer}`;
    }
    rf.classList.remove('hidden');
    clearTimeout(_rfTimer);
    _rfTimer = setTimeout(() => rf.classList.add('hidden'), 2500);
}

// ─── END GAME ─────────────────────────────────────────────────────────────────
function showEndScreen(scores) {
    const sorted = scores || [];
    const medals = ['🥇', '🥈', '🥉'];

    // Winner banner
    document.getElementById('winner-banner').textContent =
        sorted[0] ? `🏆 ${sorted[0].name} wins with ${sorted[0].score} points!` : '';

    // Podium [2nd, 1st, 3rd]
    const podiumOrder = [1, 0, 2];
    const podiumClass = ['p2', 'p1', 'p3'];
    const podiumHeight = [80, 110, 60];
    const podium = document.getElementById('end-podium');
    podium.innerHTML = '';
    podiumOrder.forEach((rank, vi) => {
        const p = sorted[rank];
        if (!p) return;
        const col = document.createElement('div');
        col.className = `p-col ${podiumClass[vi]}`;
        col.innerHTML = `
      <div class="p-medal">${medals[rank]}</div>
      <div class="p-name" style="color:${p.color}">${esc(p.name)}</div>
      <div class="p-pts">${p.score}</div>
      <div class="p-stand" style="height:${podiumHeight[vi]}px">${rank + 1}</div>
    `;
        podium.appendChild(col);
    });

    // All scores
    document.getElementById('end-all').innerHTML = sorted.map((p, i) => `
    <div class="end-row">
      <span class="end-rank">${medals[i] || i + 1}</span>
      <div class="end-dot" style="background:${p.color}"></div>
      <span class="end-name">${esc(p.name)}</span>
      <span class="end-score">${p.score}</span>
    </div>
  `).join('');

    showView('v-end');
    startConfetti();
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = innerWidth; canvas.height = innerHeight;
    const COLORS = ['#fbbf24', '#6366f1', '#ec4899', '#10b981', '#f87171', '#60a5fa'];
    G.confettiPieces = [];
    for (let i = 0; i < 180; i++) {
        G.confettiPieces.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
            c: COLORS[Math.floor(Math.random() * COLORS.length)],
            r: Math.random() * Math.PI, dr: (Math.random() - .5) * .1,
            dx: (Math.random() - .5) * 1.5, dy: Math.random() * 3 + 1.5,
        });
    }
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        G.confettiPieces.forEach(p => {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
            ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
            p.x += p.dx; p.y += p.dy; p.r += p.dr;
            if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        });
        G.confettiAF = requestAnimationFrame(loop);
    }
    loop();
}

// ─── MISC ─────────────────────────────────────────────────────────────────────
function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { });
    else document.exitFullscreen();
}

// Keyboard
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById('result-flash').classList.add('hidden');
    }
    if (e.key === ' ') {
        const buzzBtn = document.getElementById('buzz-btn');
        const inPlayerView = document.getElementById('v-player').classList.contains('active');
        if (inPlayerView && buzzBtn && !buzzBtn.disabled) {
            e.preventDefault();
            doBuzz();
        }
    }
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
});

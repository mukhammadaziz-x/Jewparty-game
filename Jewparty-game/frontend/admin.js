/* ══════════════════════════
   admin.js – PDP Jewparty
   Topic & Question Manager
══════════════════════════ */
const API = `${location.protocol}//${location.host}`;

let topics = [];
let activeTopic = null;
let editingTopicId = null;
let editingQId = null;
let selectedPts = 100;
let uploadedImageFilename = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
(function () {
    // Particles
    const c = document.getElementById('bg-canvas'), ctx = c.getContext('2d');
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    window.addEventListener('resize', resize); resize();
    let pts = [];
    for (let i = 0; i < 70; i++) pts.push({
        x: Math.random() * c.width, y: Math.random() * c.height,
        r: Math.random() * 1.3 + .3, dx: (Math.random() - .5) * .2, dy: (Math.random() - .5) * .2, a: Math.random() * .4 + .08
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
    loadTopics();
})();

// ─── Toast ────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg, dur = 2600) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), dur);
}
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Load Topics ──────────────────────────────────────────────────────────────
async function loadTopics() {
    try {
        topics = await fetch(`${API}/api/topics`).then(r => r.json());
        renderTopicList();
        if (activeTopic) {
            const fresh = topics.find(t => t.id === activeTopic.id);
            if (fresh) { activeTopic = fresh; renderQuestions(); }
        }
    } catch (e) {
        toast('❌ Cannot reach server. Make sure backend is running.');
    }
}

function renderTopicList() {
    const list = document.getElementById('topic-list');
    if (!topics.length) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--t3);font-size:14px">No topics yet.<br/>Click + Add to create one.</div>`;
        return;
    }
    list.innerHTML = topics.map(t => `
    <div class="topic-item${activeTopic && activeTopic.id === t.id ? ' active' : ''}"
         onclick="selectTopic('${t.id}')">
      <div class="ti-emoji">${t.emoji}</div>
      <div class="ti-name">${esc(t.name)}</div>
      <div class="ti-count">${t.questions.length}q</div>
      <div class="ti-actions">
        <button class="ti-btn" onclick="event.stopPropagation();openTopicModal('${t.id}')" title="Edit">✏️</button>
        <button class="ti-btn" onclick="event.stopPropagation();deleteTopic('${t.id}')" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

function selectTopic(id) {
    activeTopic = topics.find(t => t.id === id) || null;
    renderTopicList();
    renderQuestions();
}

function renderQuestions() {
    const area = document.getElementById('questions-area');
    const title = document.getElementById('content-title');
    const actions = document.getElementById('content-actions');

    if (!activeTopic) {
        title.textContent = 'Select a topic';
        actions.classList.add('hidden');
        area.innerHTML = `<div class="no-topic-msg"><div style="font-size:48px">📋</div><p>Select a topic to manage its questions.</p></div>`;
        return;
    }

    title.innerHTML = `${activeTopic.emoji} ${esc(activeTopic.name)} <span style="color:var(--t3);font-size:13px;font-weight:500">${activeTopic.questions.length} questions</span>`;
    actions.classList.remove('hidden');

    if (!activeTopic.questions.length) {
        area.innerHTML = `<div class="no-topic-msg"><div style="font-size:48px">❓</div><p>No questions yet.</p><button class="btn btn-gold" onclick="openQuestionModal()">+ Add First Question</button></div>`;
        return;
    }

    const sorted = [...activeTopic.questions].sort((a, b) => a.points - b.points);
    area.innerHTML = sorted.map(q => `
    <div class="q-card-admin">
      <div class="q-pts-badge">${q.points}</div>
      <div class="q-info">
        <div class="q-text-preview">${esc(q.question)}</div>
        <div class="q-ans-preview">✅ ${esc(q.answer)}</div>
      </div>
      ${q.image ? `<img class="q-img-preview" src="/uploads/${q.image}" alt="img"/>` : ''}
      <div class="q-actions-admin">
        <button class="qa-btn" onclick="openQuestionModal('${q.id}')">✏️</button>
        <button class="qa-btn del" onclick="deleteQuestion('${q.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── Topic Modal ──────────────────────────────────────────────────────────────
function openTopicModal(id) {
    editingTopicId = id || null;
    const t = id ? topics.find(t => t.id === id) : null;
    document.getElementById('topic-modal-title').textContent = id ? 'Edit Topic' : 'New Topic';
    document.getElementById('t-name').value = t ? t.name : '';
    document.getElementById('t-emoji').value = t ? t.emoji : '📚';
    document.getElementById('topic-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('t-name').focus(), 100);
}

function closeTopicModal() {
    document.getElementById('topic-modal').classList.add('hidden');
    editingTopicId = null;
}

async function saveTopic() {
    const name = document.getElementById('t-name').value.trim();
    const emoji = document.getElementById('t-emoji').value.trim() || '📚';
    if (!name) return toast('⚠️ Topic name is required!');
    try {
        if (editingTopicId) {
            await fetch(`${API}/api/topics/${editingTopicId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, emoji }),
            });
            toast('✅ Topic updated!');
        } else {
            await fetch(`${API}/api/topics`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, emoji }),
            });
            toast('✅ Topic created!');
        }
        closeTopicModal();
        await loadTopics();
    } catch (e) { toast('❌ Error saving topic.'); }
}

async function deleteTopic(id) {
    if (!confirm('Delete this topic and all its questions?')) return;
    if (activeTopic && activeTopic.id === id) activeTopic = null;
    await fetch(`${API}/api/topics/${id}`, { method: 'DELETE' });
    toast('🗑️ Topic deleted');
    await loadTopics();
}

// ─── Question Modal ───────────────────────────────────────────────────────────
function openQuestionModal(qId) {
    if (!activeTopic) return toast('⚠️ Select a topic first!');
    editingQId = qId || null;
    const q = qId ? activeTopic.questions.find(q => q.id === qId) : null;

    document.getElementById('q-modal-title').textContent = qId ? 'Edit Question' : 'New Question';
    document.getElementById('q-text').value = q ? q.question : '';
    document.getElementById('q-answer').value = q ? q.answer : '';
    selectedPts = q ? q.points : 100;
    uploadedImageFilename = q ? (q.image || null) : null;

    // Points UI
    document.querySelectorAll('.pts-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.pts) === selectedPts);
    });

    // Image preview
    const prev = document.getElementById('img-preview-area');
    const drop = document.getElementById('img-drop-area');
    if (uploadedImageFilename) {
        document.getElementById('img-preview').src = `/uploads/${uploadedImageFilename}`;
        document.getElementById('img-filename').textContent = uploadedImageFilename;
        prev.classList.remove('hidden');
        drop.classList.add('hidden');
    } else {
        prev.classList.add('hidden');
        drop.classList.remove('hidden');
    }

    document.getElementById('q-modal-admin').classList.remove('hidden');
    setTimeout(() => document.getElementById('q-text').focus(), 100);
}

function closeQModal() {
    document.getElementById('q-modal-admin').classList.add('hidden');
    editingQId = null;
    uploadedImageFilename = null;
}

function selectPts(pts) {
    selectedPts = pts;
    document.querySelectorAll('.pts-option').forEach(el => {
        el.classList.toggle('selected', parseInt(el.dataset.pts) === pts);
    });
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
        toast('⏳ Uploading image…');
        const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
        const data = await res.json();
        uploadedImageFilename = data.filename;
        document.getElementById('img-preview').src = data.url;
        document.getElementById('img-filename').textContent = file.name;
        document.getElementById('img-preview-area').classList.remove('hidden');
        document.getElementById('img-drop-area').classList.add('hidden');
        toast('✅ Image uploaded!');
    } catch (e) { toast('❌ Image upload failed.'); }
}

function removeImage() {
    uploadedImageFilename = null;
    document.getElementById('img-preview-area').classList.add('hidden');
    document.getElementById('img-drop-area').classList.remove('hidden');
    document.getElementById('img-file').value = '';
}

async function saveQuestion() {
    const text = document.getElementById('q-text').value.trim();
    const answer = document.getElementById('q-answer').value.trim();
    if (!text) return toast('⚠️ Question text is required!');
    if (!answer) return toast('⚠️ Answer is required!');
    const body = { points: selectedPts, question: text, answer, image: uploadedImageFilename };
    try {
        if (editingQId) {
            await fetch(`${API}/api/topics/${activeTopic.id}/questions/${editingQId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            toast('✅ Question updated!');
        } else {
            await fetch(`${API}/api/topics/${activeTopic.id}/questions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            toast('✅ Question added!');
        }
        closeQModal();
        await loadTopics();
    } catch (e) { toast('❌ Error saving question.'); }
}

async function deleteQuestion(qId) {
    if (!confirm('Delete this question?')) return;
    await fetch(`${API}/api/topics/${activeTopic.id}/questions/${qId}`, { method: 'DELETE' });
    toast('🗑️ Question deleted');
    await loadTopics();
}

// ─── Keyboard & Paste ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeTopicModal();
        closeQModal();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
        if (!document.getElementById('q-modal-admin').classList.contains('hidden')) saveQuestion();
        if (!document.getElementById('topic-modal').classList.contains('hidden')) saveTopic();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const qText = document.getElementById('q-text');
    if (qText) {
        qText.addEventListener('paste', async (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (!file) continue;
                    e.preventDefault(); // Stop text paste if it's purely an image

                    const form = new FormData();
                    form.append('file', file);
                    try {
                        toast('⏳ Uploading pasted image…');
                        const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
                        const data = await res.json();
                        uploadedImageFilename = data.filename;
                        document.getElementById('img-preview').src = data.url;
                        document.getElementById('img-filename').textContent = 'Pasted Image';
                        document.getElementById('img-preview-area').classList.remove('hidden');
                        document.getElementById('img-drop-area').classList.add('hidden');
                        toast('✅ Image uploaded!');
                    } catch (err) { toast('❌ Image upload failed.'); }
                    break; // stop after first image
                }
            }
        });
    }
});

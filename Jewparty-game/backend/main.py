from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import json, os, uuid, asyncio, shutil, random, string, re

app = FastAPI(title="PDP Jewparty Game")

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(__file__)
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
DATA_DIR     = os.path.join(BASE_DIR, "data")
UPLOADS_DIR  = os.path.join(DATA_DIR, "uploads")
DB_FILE      = os.path.join(DATA_DIR, "questions.json")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ── DB helpers ────────────────────────────────────────────────────────────────
DEFAULT_DB = {
    "topics": [
        {
            "id": "t1", "name": "Movies", "emoji": "🎬",
            "questions": [
                {"id": "q1", "points": 100, "question": "This 1994 film features a man named Forrest who runs across America.", "answer": "Forrest Gump", "image": None},
                {"id": "q2", "points": 200, "question": "The line 'I'll be back' is from which Arnold Schwarzenegger movie?", "answer": "The Terminator", "image": None},
                {"id": "q3", "points": 300, "question": "Which Christopher Nolan film features a city folding inside a dream?", "answer": "Inception", "image": None},
                {"id": "q4", "points": 400, "question": "Who directed the 'Lord of the Rings' trilogy?", "answer": "Peter Jackson", "image": None},
                {"id": "q5", "points": 500, "question": "What 1994 crime film features Jules Winnfield and Vincent Vega?", "answer": "Pulp Fiction", "image": None},
            ]
        },
        {
            "id": "t2", "name": "Music", "emoji": "🎵",
            "questions": [
                {"id": "q6",  "points": 100, "question": "Which artist released the album 'Thriller' in 1982?", "answer": "Michael Jackson", "image": None},
                {"id": "q7",  "points": 200, "question": "What band performed 'Bohemian Rhapsody'?", "answer": "Queen", "image": None},
                {"id": "q8",  "points": 300, "question": "In what year did The Beatles release 'Abbey Road'?", "answer": "1969", "image": None},
                {"id": "q9",  "points": 400, "question": "Who composed the '9th Symphony' despite being deaf?", "answer": "Beethoven", "image": None},
                {"id": "q10", "points": 500, "question": "What genre of music is associated with artists like Tupac and Notorious B.I.G.?", "answer": "East Coast Hip-Hop / Rap", "image": None},
            ]
        },
        {
            "id": "t3", "name": "Science", "emoji": "🔬",
            "questions": [
                {"id": "q11", "points": 100, "question": "What planet is known as the Red Planet?", "answer": "Mars", "image": None},
                {"id": "q12", "points": 200, "question": "What is the chemical symbol for Gold?", "answer": "Au", "image": None},
                {"id": "q13", "points": 300, "question": "How many bones are in an adult human body?", "answer": "206", "image": None},
                {"id": "q14", "points": 400, "question": "What is the speed of light (approx) in km/s?", "answer": "299,792 km/s", "image": None},
                {"id": "q15", "points": 500, "question": "What is the powerhouse of the cell?", "answer": "Mitochondria", "image": None},
            ]
        },
        {
            "id": "t4", "name": "History", "emoji": "📚",
            "questions": [
                {"id": "q16", "points": 100, "question": "In what year did World War II end?", "answer": "1945", "image": None},
                {"id": "q17", "points": 200, "question": "Who was the first President of the United States?", "answer": "George Washington", "image": None},
                {"id": "q18", "points": 300, "question": "The Great Wall of China was primarily built during which dynasty?", "answer": "Ming Dynasty", "image": None},
                {"id": "q19", "points": 400, "question": "What year did the Berlin Wall fall?", "answer": "1989", "image": None},
                {"id": "q20", "points": 500, "question": "In what year did Uzbekistan gain its independence?", "answer": "1991", "image": None},
            ]
        },
        {
            "id": "t5", "name": "Games", "emoji": "🎮",
            "questions": [
                {"id": "q21", "points": 100, "question": "What is the best-selling video game of all time?", "answer": "Minecraft", "image": None},
                {"id": "q22", "points": 200, "question": "In chess, which piece can only move diagonally?", "answer": "Bishop", "image": None},
                {"id": "q23", "points": 300, "question": "Which game features the character 'Master Chief'?", "answer": "Halo", "image": None},
                {"id": "q24", "points": 400, "question": "What year was the original Pong released?", "answer": "1972", "image": None},
                {"id": "q25", "points": 500, "question": "In Dota 2, what is the name of the final boss near the end of the game?", "answer": "Roshan", "image": None},
            ]
        },
    ]
}

def load_db():
    if not os.path.exists(DB_FILE):
        save_db(DEFAULT_DB)
        return DEFAULT_DB
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ── Upload ────────────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]:
        raise HTTPException(400, "Only image files allowed (jpg, png, gif, webp, svg)")
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOADS_DIR, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"filename": filename, "url": f"/uploads/{filename}"}

# ── Topics API ────────────────────────────────────────────────────────────────
class TopicIn(BaseModel):
    name: str
    emoji: str = "📚"

class QuestionIn(BaseModel):
    points: int
    question: str
    answer: str
    image: Optional[str] = None

@app.get("/api/topics")
async def get_topics():
    return load_db()["topics"]

@app.post("/api/topics")
async def create_topic(body: TopicIn):
    db = load_db()
    topic = {"id": str(uuid.uuid4()), "name": body.name, "emoji": body.emoji, "questions": []}
    db["topics"].append(topic)
    save_db(db)
    return topic

@app.put("/api/topics/{tid}")
async def update_topic(tid: str, body: TopicIn):
    db = load_db()
    for t in db["topics"]:
        if t["id"] == tid:
            t["name"] = body.name
            t["emoji"] = body.emoji
            save_db(db)
            return t
    raise HTTPException(404, "Topic not found")

@app.delete("/api/topics/{tid}")
async def delete_topic(tid: str):
    db = load_db()
    db["topics"] = [t for t in db["topics"] if t["id"] != tid]
    save_db(db)
    return {"ok": True}

@app.post("/api/topics/{tid}/questions")
async def add_question(tid: str, body: QuestionIn):
    db = load_db()
    for t in db["topics"]:
        if t["id"] == tid:
            q = {"id": str(uuid.uuid4()), "points": body.points,
                 "question": body.question, "answer": body.answer,
                 "image": body.image}
            t["questions"].append(q)
            save_db(db)
            return q
    raise HTTPException(404, "Topic not found")

@app.put("/api/topics/{tid}/questions/{qid}")
async def update_question(tid: str, qid: str, body: QuestionIn):
    db = load_db()
    for t in db["topics"]:
        if t["id"] == tid:
            for i, q in enumerate(t["questions"]):
                if q["id"] == qid:
                    t["questions"][i] = {"id": qid, "points": body.points,
                                          "question": body.question, "answer": body.answer,
                                          "image": body.image}
                    save_db(db)
                    return t["questions"][i]
    raise HTTPException(404, "Not found")

@app.delete("/api/topics/{tid}/questions/{qid}")
async def delete_question(tid: str, qid: str):
    db = load_db()
    for t in db["topics"]:
        if t["id"] == tid:
            t["questions"] = [q for q in t["questions"] if q["id"] != qid]
            save_db(db)
            return {"ok": True}
    raise HTTPException(404, "Not found")

# ── Rooms ────────────────────────────────────────────────────────────────────
rooms: Dict[str, dict] = {}
COLORS = ["#6366f1","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4"]

def make_pin():
    while True:
        pin = ''.join(random.choices(string.digits, k=6))
        if pin not in rooms:
            return pin

def get_color(i): return COLORS[i % len(COLORS)]

def room_public(room):
    return {
        "pin": room["pin"],
        "host_id": room["host_id"],
        "players": room["players"],
        "topics": room["topics"],
        "answered": room["answered"],
        "current_q": room["current_q"],
        "buzzed_player": room["buzzed_player"],
        "buzz_locked": room["buzz_locked"],
        "game_started": room["game_started"],
    }

@app.post("/api/rooms")
async def create_room(body: dict):
    pin = make_pin()
    host_id = str(uuid.uuid4())
    rooms[pin] = {
        "pin": pin,
        "host_id": host_id,
        "players": {
            host_id: {
                "id": host_id, "name": body.get("host_name", "Host"),
                "score": 0, "is_host": True, "color": get_color(0),
            }
        },
        "topics": body.get("topics", []),
        "answered": [],
        "current_q": None,
        "buzzed_player": None,
        "buzz_locked": False,
        "game_started": False,
        "connections": {},
    }
    return {"pin": pin, "player_id": host_id}

@app.post("/api/rooms/{pin}/join")
async def join_room(pin: str, body: dict):
    room = rooms.get(pin)
    if not room:
        raise HTTPException(404, "Room not found")
    if room["game_started"]:
        raise HTTPException(400, "Game already started")
    pid = str(uuid.uuid4())
    idx = len(room["players"])
    room["players"][pid] = {
        "id": pid, "name": body.get("name", f"Player {idx}"),
        "score": 0, "is_host": False, "color": get_color(idx),
    }
    return {"pin": pin, "player_id": pid}

@app.get("/api/rooms/{pin}")
async def get_room(pin: str):
    room = rooms.get(pin)
    if not room:
        raise HTTPException(404, "Room not found")
    return room_public(room)

# ── WebSocket ────────────────────────────────────────────────────────────────
async def broadcast(room, msg):
    dead = []
    for pid, ws in list(room["connections"].items()):
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(pid)
    for pid in dead:
        room["connections"].pop(pid, None)

@app.websocket("/ws/{pin}/{player_id}")
async def ws_endpoint(ws: WebSocket, pin: str, player_id: str):
    await ws.accept()
    room = rooms.get(pin)
    if not room or player_id not in room["players"]:
        await ws.send_json({"type": "error", "message": "Invalid PIN or player"})
        await ws.close()
        return

    room["connections"][player_id] = ws
    me = room["players"][player_id]

    await ws.send_json({"type": "init", "state": room_public(room), "me": me})
    await broadcast(room, {"type": "player_joined", "player": me, "state": room_public(room)})

    try:
        while True:
            data = await ws.receive_json()
            await handle_msg(room, player_id, data)
    except WebSocketDisconnect:
        room["connections"].pop(player_id, None)
        await broadcast(room, {"type": "player_left", "player_id": player_id, "state": room_public(room)})

async def handle_msg(room, player_id, data):
    t      = data.get("type")
    player = room["players"].get(player_id)
    if not player:
        return
    is_host = player["is_host"]

    # ── Host: start game
    if t == "start_game" and is_host:
        room["game_started"] = True
        await broadcast(room, {"type": "game_started", "state": room_public(room)})

    # ── Host: select question from board
    elif t == "select_question" and is_host:
        if room["current_q"]:
            return
        tid = data.get("topic_id")
        qid = data.get("q_id")
        key = f"{tid}_{qid}"
        if key in room["answered"]:
            return
        # Find question
        for topic in room["topics"]:
            if topic["id"] == tid:
                for q in topic["questions"]:
                    if q["id"] == qid:
                        room["current_q"] = {
                            "key": key, "topic_id": tid, "q_id": qid,
                            "topic_name": f"{topic['emoji']} {topic['name']}",
                            "points": q["points"],
                            "question": q["question"],
                            "answer": q["answer"],
                            "image": q.get("image"),
                        }
                        room["buzzed_player"] = None
                        room["buzz_locked"] = False
                        await broadcast(room, {
                            "type": "question_open",
                            "question": room["current_q"],
                            "state": room_public(room),
                        })
                        asyncio.create_task(auto_timeout(room, key, 30))
                        return

    # ── Player: buzz in
    elif t == "buzz":
        if room["current_q"] and not room["buzz_locked"] and not room["buzzed_player"]:
            room["buzzed_player"] = player_id
            room["buzz_locked"] = True
            await broadcast(room, {
                "type": "buzzed",
                "player_id": player_id,
                "player_name": player["name"],
                "player_color": player["color"],
                "state": room_public(room),
            })

    # ── Host: correct answer
    elif t == "correct_answer" and is_host:
        if room["current_q"] and room["buzzed_player"]:
            winner_id = room["buzzed_player"]
            winner    = room["players"].get(winner_id)
            if winner:
                pts = int(room["current_q"].get("points", 0))
                answer = room["current_q"].get("answer", "")
                key = room["current_q"].get("key")
                winner["score"] = int(winner.get("score", 0)) + pts
                room["answered"].append(key)
                room["current_q"] = None
                room["buzzed_player"] = None
                room["buzz_locked"] = False
                await broadcast(room, {
                    "type": "answer_correct",
                    "winner_id": winner_id,
                    "winner_name": str(winner.get("name", "")),
                    "winner_color": str(winner.get("color", "#fff")),
                    "points": pts,
                    "answer": answer,
                    "state": room_public(room),
                })

    # ── Host: wrong answer (deduct & let others buzz)
    elif t == "wrong_answer" and is_host:
        if room["current_q"] and room["buzzed_player"]:
            loser_id = room["buzzed_player"]
            loser    = room["players"].get(loser_id)
            pts      = int(room["current_q"]["points"])
            if loser:
                loser["score"] = max(0, loser["score"] - pts)
            room["buzzed_player"] = None
            room["buzz_locked"] = False
            await broadcast(room, {
                "type": "answer_wrong",
                "loser_id": loser_id,
                "loser_name": loser["name"] if loser else "",
                "points": pts,
                "state": room_public(room),
            })

    # ── Host: skip question
    elif t == "skip" and is_host:
        if room["current_q"]:
            answer = room["current_q"]["answer"]
            key    = room["current_q"]["key"]
            room["answered"].append(key)
            room["current_q"] = None
            room["buzzed_player"] = None
            room["buzz_locked"] = False
            await broadcast(room, {"type": "skipped", "answer": answer, "state": room_public(room)})

    # ── Host: end game
    elif t == "end_game" and is_host:
        players_only = [p for p in room["players"].values() if not p.get("is_host")]
        sorted_players = sorted(players_only, key=lambda p: p["score"], reverse=True)
        await broadcast(room, {"type": "game_over", "scores": sorted_players, "state": room_public(room)})

    # ── Chat
    elif t == "chat":
        text = str(data.get("text", ""))[:200].strip()
        if text:
            await broadcast(room, {
                "type": "chat",
                "player_name": player["name"],
                "player_color": player["color"],
                "text": text,
            })

async def auto_timeout(room, key, seconds):
    await asyncio.sleep(seconds)
    if room["current_q"] and room["current_q"].get("key") == key:
        answer = room["current_q"]["answer"]
        room["answered"].append(key)
        room["current_q"] = None
        room["buzzed_player"] = None
        room["buzz_locked"] = False
        await broadcast(room, {"type": "timeout", "answer": answer, "state": room_public(room)})

# ── Frontend routes ───────────────────────────────────────────────────────────
def static(name):
    return FileResponse(os.path.join(FRONTEND_DIR, name))

@app.get("/")           
async def r_index(): return static("index.html")
@app.get("/admin")      
async def r_admin(): return static("admin.html")
@app.get("/style.css")  
async def r_css():   return static("style.css")
@app.get("/game.js")    
async def r_gamejs(): return static("game.js")
@app.get("/admin.js")   
async def r_adminjs(): return static("admin.js")
@app.get("/health")     
async def r_health(): return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

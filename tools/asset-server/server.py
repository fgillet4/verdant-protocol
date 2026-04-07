"""
Verdant Protocol — Asset Studio Server
Run: uvicorn server:app --reload --port 7432
"""
import os, json, uuid, shutil, mimetypes
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import aiofiles

# ── Paths ─────────────────────────────────────────────────────────────────────

BASE        = Path(__file__).parent
DATA_DIR    = BASE / "data"
UPLOAD_DIR  = BASE / "uploads" / "models"
STATIC_DIR  = BASE / "static"
GAME_ASSETS = BASE.parent.parent / "assets"   # verdant_protocol/assets/
GAME_MODELS = GAME_ASSETS / "models"

for d in [DATA_DIR, UPLOAD_DIR, STATIC_DIR, GAME_MODELS, UPLOAD_AUDIO, GAME_AUDIO]:
    d.mkdir(parents=True, exist_ok=True)

REGISTRY_FILE      = DATA_DIR / "registry.json"
WORLD_FILE         = DATA_DIR / "world_objects.json"
ANIMATIONS_FILE    = DATA_DIR / "animations.json"
QUESTS_FILE        = DATA_DIR / "quests.json"
DIALOGUES_FILE     = DATA_DIR / "dialogues.json"
SOUNDS_FILE        = DATA_DIR / "sounds.json"
UPLOAD_AUDIO       = BASE / "uploads" / "audio"
GAME_AUDIO         = GAME_ASSETS / "audio"

def _load(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            pass
    return default

def _save(path: Path, data):
    path.write_text(json.dumps(data, indent=2))

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Verdant Protocol Asset Studio", version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.mount("/static",  StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/audio",   StaticFiles(directory=str(UPLOAD_AUDIO)), name="audio")

# ── In-memory state (backed by JSON files) ───────────────────────────────────

registry: dict      = _load(REGISTRY_FILE, {})
world_objects: list = _load(WORLD_FILE, [])
animations: dict    = _load(ANIMATIONS_FILE, {})
quests: dict        = _load(QUESTS_FILE, {})
dialogues: dict     = _load(DIALOGUES_FILE, {})
sounds: dict        = _load(SOUNDS_FILE, {})

# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return FileResponse(str(STATIC_DIR / "index.html"))

# ── Assets ────────────────────────────────────────────────────────────────────

@app.get("/api/assets")
def list_assets():
    return list(registry.values())

@app.post("/api/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    asset_type: str = "misc",
    display_name: Optional[str] = None,
):
    if not file.filename:
        raise HTTPException(400, "No filename")

    ext = Path(file.filename).suffix.lower()
    if ext not in {".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    asset_id = str(uuid.uuid4())[:8]
    safe_name = file.filename.replace(" ", "_")
    dest = UPLOAD_DIR / f"{asset_id}_{safe_name}"

    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Also copy GLBs into game assets folder
    if ext in {".glb", ".gltf"}:
        shutil.copy2(dest, GAME_MODELS / safe_name)

    name = display_name or Path(file.filename).stem.replace("_", " ").title()

    entry = {
        "id": asset_id,
        "filename": safe_name,
        "original_name": file.filename,
        "display_name": name,
        "type": asset_type,
        "path": f"/uploads/{asset_id}_{safe_name}",
        "game_path": f"/assets/models/{safe_name}" if ext in {".glb",".gltf"} else None,
        "size": len(content),
        "ext": ext,
        "tags": [],
        "created_at": __import__("datetime").datetime.utcnow().isoformat(),
    }

    registry[asset_id] = entry
    _save(REGISTRY_FILE, registry)
    _sync_game_registry()

    return entry

@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: str):
    a = registry.get(asset_id)
    if not a:
        raise HTTPException(404, "Asset not found")
    return a

@app.patch("/api/assets/{asset_id}")
def update_asset(asset_id: str, data: dict = Body(...)):
    a = registry.get(asset_id)
    if not a:
        raise HTTPException(404, "Asset not found")
    allowed = {"display_name", "type", "tags", "description"}
    for k, v in data.items():
        if k in allowed:
            a[k] = v
    _save(REGISTRY_FILE, registry)
    _sync_game_registry()
    return a

@app.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: str):
    a = registry.pop(asset_id, None)
    if not a:
        raise HTTPException(404, "Asset not found")
    # Remove file
    for p in UPLOAD_DIR.glob(f"{asset_id}_*"):
        p.unlink(missing_ok=True)
    _save(REGISTRY_FILE, registry)
    _sync_game_registry()
    return {"ok": True}

@app.get("/api/assets/{asset_id}/file")
def get_asset_file(asset_id: str):
    a = registry.get(asset_id)
    if not a:
        raise HTTPException(404)
    path = UPLOAD_DIR / f"{asset_id}_{a['filename']}"
    if not path.exists():
        raise HTTPException(404, "File missing")
    mt = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return FileResponse(str(path), media_type=mt)

# ── Animations ────────────────────────────────────────────────────────────────

@app.get("/api/animations/{asset_id}")
def get_animations(asset_id: str):
    return animations.get(asset_id, {})

@app.put("/api/animations/{asset_id}")
def save_animations(asset_id: str, data: dict = Body(...)):
    animations[asset_id] = data
    _save(ANIMATIONS_FILE, animations)
    return {"ok": True}

# ── World objects ─────────────────────────────────────────────────────────────

@app.get("/api/world")
def list_world_objects():
    return world_objects

@app.post("/api/world")
def add_world_object(obj: dict = Body(...)):
    obj["id"] = str(uuid.uuid4())[:8]
    world_objects.append(obj)
    _save(WORLD_FILE, world_objects)
    return obj

@app.delete("/api/world/{obj_id}")
def remove_world_object(obj_id: str):
    global world_objects
    world_objects = [o for o in world_objects if o.get("id") != obj_id]
    _save(WORLD_FILE, world_objects)
    return {"ok": True}

@app.get("/api/world/export")
def export_world():
    """Returns world_objects as JS-ready JSON for World.js to consume."""
    return world_objects

# ── Codegen ───────────────────────────────────────────────────────────────────

TEMPLATES = {
    "enemy": '''\
import * as THREE from 'three'
// Auto-generated by Asset Studio — fill in stats and event handlers

export const {CONST_NAME}_DEF = {{
  id:        '{id}',
  name:      '{display_name}',
  modelPath: '{game_path}',
  stats: {{
    maxHp:        50,
    attack:       10,
    defense:      5,
    speed:        3.0,
    attackRange:  2.0,
  }},
  xpReward: 25,
  xpStyle:  'biomech',   // skill that gets XP on kill
  lootTable: [
    // {{ itemId: 'copperOre', chance: 0.3, qty: [1, 3] }},
  ],
  animations: {{
    idle:   'Idle',
    walk:   'Walk',
    attack: 'Attack',
    death:  'Death',
  }},
}}
''',
    "item": '''\
// Add this entry inside ITEM_DEFS in src/inventory/ItemDefs.js

  {id}: {{
    id:          '{id}',
    name:        '{display_name}',
    type:        'misc',      // weapon | armour | consumable | material | tool | misc
    stackable:   false,
    modelPath:   '{game_path}',
    description: 'TODO: describe this item.',
    // ── Weapon fields ──────────────────────────────────────
    // style:    'biomech',  // biomech | marksmanship | mycelial | solarcasting
    // attack:   10,
    // ── Armour fields ──────────────────────────────────────
    // slot:     'body',     // head | body | legs | feet | hands
    // defense:  5,
    // ── Consumable fields ──────────────────────────────────
    // useEffect: true,
  }},
''',
    "npc": '''\
// src/world/npcs/{CamelName}.js
// Auto-generated by Asset Studio

import * as THREE from 'three'
import {{ bus }}   from '../../utils/EventBus.js'

export class {CamelName} {{
  /**
   * @param {{THREE.Scene}} scene
   * @param {{THREE.Vector3}} position
   */
  constructor(scene, position) {{
    this.id       = '{id}'
    this.name     = '{display_name}'
    this.position = position.clone()
    this._mesh    = null
    this._load(scene)
  }}

  _load(scene) {{
    // TODO: load '{game_path}' via AssetLoader
    // this._mesh = ... attach to scene
  }}

  interact(player) {{
    // TODO: dialogue / trade logic
    bus.emit('ui:examine', {{ text: 'You speak with {display_name}.' }})
  }}

  update(delta) {{
    // TODO: idle behaviour
  }}
}}
''',
    "structure": '''\
// Add to src/world/BlueprintDefs.js → BLUEPRINTS array:
{{
  id:          '{id}',
  name:        '{display_name}',
  levelReq:    1,
  materials:   [
    // {{ itemId: 'wood', qty: 5 }},
  ],
  modelPath:   '{game_path}',
  description: 'TODO',
  effect: {{
    type:   'passive',   // passive | aoe | campfire | relay
    radius: 5,
    // bonus: {{ hpRegen: 1 }},
  }},
}},
''',
    "world-object": '''\
// Spawn call to add inside World.js _build() method:
// const geo  = new THREE.BoxGeometry(1, 1, 1)  // replace with loaded GLB
// const mat  = new THREE.MeshStandardMaterial()
// const mesh = new THREE.Mesh(geo, mat)
// mesh.position.set(X, 0, Z)
// mesh.name = '{id}'
// this.scene.add(mesh)

// Or add to world registry:
{{
  "id":        "{id}",
  "name":      "{display_name}",
  "modelPath": "{game_path}",
  "position":  {{ "x": 0, "y": 0, "z": 0 }},
  "rotation":  {{ "y": 0 }},
  "scale":     1.0
}}
''',
    "skill-node": '''\
// Add to src/skills/SkillRegistry.js → SKILLS object:
  {id}: {{
    id:          '{id}',
    name:        '{display_name}',
    color:       '#4caf50',
    faction:     null,          // null | 'rootweaver' | 'solar-compact'
    description: 'TODO: describe this skill.',
    unlocks: {{
      5:  'TODO unlock at level 5',
      20: 'TODO unlock at level 20',
      50: 'TODO unlock at level 50',
    }},
  }},
''',
}

def _to_id(name: str) -> str:
    import re
    slug = re.sub(r'[^a-zA-Z0-9 ]', '', name).strip()
    parts = slug.split()
    if not parts:
        return "asset"
    return parts[0].lower() + ''.join(p.title() for p in parts[1:])

def _to_camel(name: str) -> str:
    import re
    slug = re.sub(r'[^a-zA-Z0-9 ]', '', name).strip()
    return ''.join(p.title() for p in slug.split())

@app.post("/api/codegen")
def generate_code(payload: dict = Body(...)):
    asset_id    = payload.get("asset_id")
    entity_type = payload.get("entity_type", "item")

    a = registry.get(asset_id)
    if not a:
        raise HTTPException(404, "Asset not found")

    template = TEMPLATES.get(entity_type)
    if not template:
        raise HTTPException(400, f"Unknown entity type: {entity_type}. Valid: {list(TEMPLATES.keys())}")

    display = a.get("display_name", a["filename"])
    asset_id_slug = _to_id(display)
    camel = _to_camel(display)
    const_name = camel.upper()

    code = template.format(
        id=asset_id_slug,
        display_name=display,
        game_path=a.get("game_path") or a["path"],
        CONST_NAME=const_name,
        CamelName=camel,
    )

    return {"code": code, "entity_type": entity_type, "asset_id": asset_id}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _sync_game_registry():
    """Write a clean registry.json into verdant_protocol/assets/ for the game to consume."""
    out = {}
    for a in registry.values():
        if a.get("ext") in {".glb", ".gltf"}:
            out[a["id"]] = {
                "id":   a["id"],
                "name": a["display_name"],
                "path": a.get("game_path", a["path"]),
                "type": a["type"],
                "tags": a.get("tags", []),
            }
    game_reg = GAME_ASSETS / "registry.json"
    game_reg.write_text(json.dumps(out, indent=2))

# ── Quests ───────────────────────────────────────────────────────────────────

@app.get("/api/quests")
def list_quests():
    return list(quests.values())

@app.post("/api/quests")
def create_quest(q: dict = Body(...)):
    q.setdefault("id", _to_id(q.get("title", "quest")) + "_" + str(uuid.uuid4())[:4])
    q.setdefault("title", "New Quest")
    q.setdefault("description", "")
    q.setdefault("giver_npc", "")
    q.setdefault("faction", None)
    q.setdefault("level_req", 1)
    q.setdefault("prerequisites", [])
    q.setdefault("start_dialogue_id", "")
    q.setdefault("complete_dialogue_id", "")
    q.setdefault("stages", [])
    q.setdefault("rewards", {"xp": {}, "items": [], "faction_rep": {}})
    quests[q["id"]] = q
    _save(QUESTS_FILE, quests)
    return q

@app.put("/api/quests/{quest_id}")
def update_quest(quest_id: str, q: dict = Body(...)):
    if quest_id not in quests:
        raise HTTPException(404, "Quest not found")
    quests[quest_id] = q
    _save(QUESTS_FILE, quests)
    return q

@app.delete("/api/quests/{quest_id}")
def delete_quest(quest_id: str):
    quests.pop(quest_id, None)
    _save(QUESTS_FILE, quests)
    return {"ok": True}

@app.get("/api/quests/{quest_id}/export")
def export_quest_js(quest_id: str):
    q = quests.get(quest_id)
    if not q:
        raise HTTPException(404)
    title  = q.get("title", "Quest")
    cname  = _to_camel(title)
    stages = json.dumps(q.get("stages", []), indent=4)
    rewards = json.dumps(q.get("rewards", {}), indent=4)
    code = f"""// Auto-generated by Quest Studio — src/quests/{cname}.js
import {{ bus }} from '../utils/EventBus.js'

export const {cname.upper()}_QUEST = {{
  id:          '{q["id"]}',
  title:       '{title}',
  description: '{q.get("description","")}',
  giverNpc:    '{q.get("giver_npc","")}',
  faction:     {json.dumps(q.get("faction"))},
  levelReq:    {q.get("level_req", 1)},
  prerequisites: {json.dumps(q.get("prerequisites", []))},
  startDialogue:    '{q.get("start_dialogue_id","")}',
  completeDialogue: '{q.get("complete_dialogue_id","")}',
  stages:  {stages},
  rewards: {rewards},
}}
"""
    return {"code": code}

# ── Dialogues ─────────────────────────────────────────────────────────────────

@app.get("/api/dialogues")
def list_dialogues():
    return list(dialogues.values())

@app.post("/api/dialogues")
def create_dialogue(d: dict = Body(...)):
    did = d.get("id") or ("dlg_" + str(uuid.uuid4())[:6])
    start_id = "node_start"
    d.setdefault("id", did)
    d.setdefault("npc_name", "NPC")
    d.setdefault("start", start_id)
    d.setdefault("nodes", {
        start_id: {"type": "npc", "speaker": d.get("npc_name","NPC"),
                   "text": "Hello, traveller.", "next": "node_end",
                   "x": 60, "y": 120},
        "node_end": {"type": "end", "x": 380, "y": 120},
    })
    dialogues[did] = d
    _save(DIALOGUES_FILE, dialogues)
    return d

@app.put("/api/dialogues/{dialogue_id}")
def update_dialogue(dialogue_id: str, d: dict = Body(...)):
    dialogues[dialogue_id] = d
    _save(DIALOGUES_FILE, dialogues)
    return d

@app.delete("/api/dialogues/{dialogue_id}")
def delete_dialogue(dialogue_id: str):
    dialogues.pop(dialogue_id, None)
    _save(DIALOGUES_FILE, dialogues)
    return {"ok": True}

@app.get("/api/dialogues/{dialogue_id}/export")
def export_dialogue_js(dialogue_id: str):
    d = dialogues.get(dialogue_id)
    if not d:
        raise HTTPException(404)
    # Strip layout coords before export
    clean_nodes = {}
    for nid, node in d.get("nodes", {}).items():
        n = {k: v for k, v in node.items() if k not in ("x", "y")}
        clean_nodes[nid] = n
    export_d = {k: v for k, v in d.items() if k != "nodes"}
    export_d["nodes"] = clean_nodes
    cname = _to_camel(d.get("npc_name", "dialogue"))
    code = f"""// Auto-generated by Quest Studio
// src/quests/dialogues/{d['id']}.js
export const {d['id'].upper().replace('-','_')}_DIALOGUE = {json.dumps(export_d, indent=2)}
"""
    return {"code": code}

# ── Sounds ───────────────────────────────────────────────────────────────────

@app.get("/api/sounds")
def list_sounds():
    return list(sounds.values())

@app.post("/api/sounds/upload")
async def upload_sound(
    file: UploadFile = File(...),
    sound_type: str = "sfx",        # sfx | music | ambient
    display_name: Optional[str] = None,
    scene: Optional[str] = None,    # which scene/biome this plays in
    loop: bool = False,
    volume: float = 1.0,
):
    if not file.filename:
        raise HTTPException(400, "No filename")
    ext = Path(file.filename).suffix.lower()
    if ext not in {".mp3", ".ogg", ".wav", ".flac", ".m4a", ".webm"}:
        raise HTTPException(400, f"Unsupported audio type: {ext}")

    sound_id  = str(uuid.uuid4())[:8]
    safe_name = file.filename.replace(" ", "_")
    dest      = UPLOAD_AUDIO / f"{sound_id}_{safe_name}"

    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Copy to game audio folder
    shutil.copy2(dest, GAME_AUDIO / safe_name)

    name = display_name or Path(file.filename).stem.replace("_", " ").title()
    entry = {
        "id":           sound_id,
        "filename":     safe_name,
        "display_name": name,
        "type":         sound_type,
        "path":         f"/audio/{sound_id}_{safe_name}",
        "game_path":    f"/assets/audio/{safe_name}",
        "scene":        scene or "",
        "loop":         loop,
        "volume":       volume,
        "size":         len(content),
        "ext":          ext,
        "created_at":   __import__("datetime").datetime.utcnow().isoformat(),
    }
    sounds[sound_id] = entry
    _save(SOUNDS_FILE, sounds)
    return entry

@app.patch("/api/sounds/{sound_id}")
def update_sound(sound_id: str, data: dict = Body(...)):
    s = sounds.get(sound_id)
    if not s:
        raise HTTPException(404, "Sound not found")
    for k in ("display_name", "type", "scene", "loop", "volume"):
        if k in data:
            s[k] = data[k]
    _save(SOUNDS_FILE, sounds)
    return s

@app.delete("/api/sounds/{sound_id}")
def delete_sound(sound_id: str):
    s = sounds.pop(sound_id, None)
    if not s:
        raise HTTPException(404)
    for p in UPLOAD_AUDIO.glob(f"{sound_id}_*"):
        p.unlink(missing_ok=True)
    _save(SOUNDS_FILE, sounds)
    return {"ok": True}

@app.get("/api/sounds/export")
def export_sound_manifest():
    """Returns a JS-ready manifest grouped by scene."""
    manifest = {}
    for s in sounds.values():
        scene = s.get("scene") or "_global"
        manifest.setdefault(scene, []).append({
            "id": s["id"], "name": s["display_name"],
            "path": s["game_path"], "type": s["type"],
            "loop": s["loop"], "volume": s["volume"],
        })
    return manifest

# ── Extra pages ───────────────────────────────────────────────────────────────

@app.get("/quest-studio")
def quest_studio_page():
    return FileResponse(str(STATIC_DIR / "quest-studio.html"))

@app.get("/scene-designer")
def scene_designer_page():
    return FileResponse(str(STATIC_DIR / "scene-designer.html"))

# ── Dev info ──────────────────────────────────────────────────────────────────

@app.get("/api/info")
def info():
    return {
        "assets":        len(registry),
        "world_objects": len(world_objects),
        "quests":        len(quests),
        "dialogues":     len(dialogues),
        "sounds":        len(sounds),
        "upload_dir":    str(UPLOAD_DIR),
        "game_assets":   str(GAME_ASSETS),
    }

"""
seed.py — Populates the asset registry with Verdant Protocol's procedural game entities.
Run automatically by start.sh on first boot, or manually: python3 seed.py
Procedural assets are built from Three.js geometry (no GLB file) but are tracked
in the registry so they appear in Asset Studio and can have metadata attached.
"""

import json
from pathlib import Path
from datetime import datetime

DATA_DIR      = Path(__file__).parent / "data"
REGISTRY_FILE = DATA_DIR / "registry.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Load existing registry ────────────────────────────────────────────────────

def _load():
    if REGISTRY_FILE.exists():
        try:
            return json.loads(REGISTRY_FILE.read_text())
        except Exception:
            pass
    return {}

def _save(reg):
    REGISTRY_FILE.write_text(json.dumps(reg, indent=2))

# ── Seed data — mirrors src/world/*Defs.js and src/enemies/ ──────────────────

SEED_ENTRIES = [

  # ── Player ──────────────────────────────────────────────────────────────────
  {
    "id":           "player",
    "display_name": "Player Character",
    "type":         "player",
    "category":     "player",
    "glb_path":     "/assets/models/player/player.glb",
    "tags":         ["player", "character"],
    "description":  "The local player entity. Stats, inventory, and movement managed by Player.js.",
    "source_file":  "src/player/Player.js",
    "game_path":    "procedural://player",
  },

  # ── Enemies ─────────────────────────────────────────────────────────────────
  {
    "id":           "forestDrone",
    "display_name": "Forest Drone",
    "type":         "enemy",
    "category":     "enemies",
    "glb_path":     "/assets/models/enemies/drone.glb",
    "tags":         ["enemy", "drone", "biomech"],
    "description":  "Aerial patrol drone. Passive until attacked. Combat level 14. Built from Three.js geometry in DroneMesh.js.",
    "source_file":  "src/enemies/DroneEnemy.js",
    "game_path":    "procedural://enemies/forestDrone",
    "stats": {
      "hp": 50, "maxHp": 50, "attack": 18, "defense": 10,
      "combatLevel": 14, "combatStyle": "biomech"
    },
  },

  # ── Trees ───────────────────────────────────────────────────────────────────
  {
    "id":           "tree_normal",
    "display_name": "Tree",
    "type":         "world",
    "category":     "world/trees",
    "glb_path":     "/assets/models/trees/normal.glb",
    "tags":         ["tree", "woodcutting", "level1"],
    "description":  "Standard tree. Yields normal logs. Level 1 Woodcutting. 25 XP.",
    "source_file":  "src/world/Tree.js",
    "game_path":    "procedural://world/trees/normal",
    "skill":        "woodcutting",
    "level_req":    1,
    "xp":           25,
    "drops":        ["normalLog"],
  },
  {
    "id":           "tree_mossOak",
    "display_name": "Moss Oak",
    "type":         "world",
    "category":     "world/trees",
    "glb_path":     "/assets/models/trees/mossOak.glb",
    "tags":         ["tree", "woodcutting", "level15"],
    "description":  "Moss-draped oak. Yields moss logs. Level 15 Woodcutting. 37 XP.",
    "source_file":  "src/world/Tree.js",
    "game_path":    "procedural://world/trees/mossOak",
    "skill":        "woodcutting",
    "level_req":    15,
    "xp":           37,
    "drops":        ["mossLog"],
  },
  {
    "id":           "tree_ironwood",
    "display_name": "Ironwood",
    "type":         "world",
    "category":     "world/trees",
    "glb_path":     "/assets/models/trees/ironwood.glb",
    "tags":         ["tree", "woodcutting", "level30"],
    "description":  "Dense ironwood. Yields iron logs. Level 30 Woodcutting. 50 XP.",
    "source_file":  "src/world/Tree.js",
    "game_path":    "procedural://world/trees/ironwood",
    "skill":        "woodcutting",
    "level_req":    30,
    "xp":           50,
    "drops":        ["ironLog"],
  },
  {
    "id":           "tree_ancient",
    "display_name": "Ancient Canopy",
    "type":         "world",
    "category":     "world/trees",
    "glb_path":     "/assets/models/trees/ancient.glb",
    "tags":         ["tree", "woodcutting", "level60", "rare"],
    "description":  "Ancient canopy tree. Yields ancient logs. Level 60 Woodcutting. 80 XP.",
    "source_file":  "src/world/Tree.js",
    "game_path":    "procedural://world/trees/ancient",
    "skill":        "woodcutting",
    "level_req":    60,
    "xp":           80,
    "drops":        ["ancientLog"],
  },

  # ── Ore nodes ────────────────────────────────────────────────────────────────
  {
    "id":           "ore_copper",
    "display_name": "Copper Vein",
    "type":         "world",
    "category":     "world/ore",
    "glb_path":     "/assets/models/ore/copper.glb",
    "tags":         ["ore", "mining", "level1"],
    "description":  "Copper vein. Yields copper ore. Level 1 Mining. 17.5 XP.",
    "source_file":  "src/world/OreNode.js",
    "game_path":    "procedural://world/ore/copper",
    "skill":        "mining",
    "level_req":    1,
    "xp":           17.5,
    "drops":        ["copperOre"],
  },
  {
    "id":           "ore_iron",
    "display_name": "Iron Seam",
    "type":         "world",
    "category":     "world/ore",
    "glb_path":     "/assets/models/ore/iron.glb",
    "tags":         ["ore", "mining", "level15"],
    "description":  "Iron seam. Yields iron ore. Level 15 Mining. 35 XP.",
    "source_file":  "src/world/OreNode.js",
    "game_path":    "procedural://world/ore/iron",
    "skill":        "mining",
    "level_req":    15,
    "xp":           35,
    "drops":        ["ironOre"],
  },
  {
    "id":           "ore_coal",
    "display_name": "Coal Deposit",
    "type":         "world",
    "category":     "world/ore",
    "glb_path":     "/assets/models/ore/coal.glb",
    "tags":         ["ore", "mining", "level30"],
    "description":  "Coal deposit. Yields coal. Level 30 Mining. 50 XP.",
    "source_file":  "src/world/OreNode.js",
    "game_path":    "procedural://world/ore/coal",
    "skill":        "mining",
    "level_req":    30,
    "xp":           50,
    "drops":        ["coal"],
  },
  {
    "id":           "ore_solarite",
    "display_name": "Solarite Vein",
    "type":         "world",
    "category":     "world/ore",
    "glb_path":     "/assets/models/ore/solarite.glb",
    "tags":         ["ore", "mining", "level55", "rare"],
    "description":  "Solarite vein. Crystallised solar energy. Level 55 Mining. 80 XP.",
    "source_file":  "src/world/OreNode.js",
    "game_path":    "procedural://world/ore/solarite",
    "skill":        "mining",
    "level_req":    55,
    "xp":           80,
    "drops":        ["solariteOre"],
  },
  {
    "id":           "ore_heartstone",
    "display_name": "Heartstone",
    "type":         "world",
    "category":     "world/ore",
    "glb_path":     "/assets/models/ore/heartstone.glb",
    "tags":         ["ore", "mining", "level70", "rare", "rootweaver"],
    "description":  "Heartstone. Mycelial mineral, sacred to Rootweavers. Level 70 Mining. 95 XP.",
    "source_file":  "src/world/OreNode.js",
    "game_path":    "procedural://world/ore/heartstone",
    "skill":        "mining",
    "level_req":    70,
    "xp":           95,
    "drops":        ["heartstoneOre"],
  },

  # ── Gather nodes ─────────────────────────────────────────────────────────────
  {
    "id":           "gather_herb",
    "display_name": "Herb Patch",
    "type":         "world",
    "category":     "world/gather",
    "glb_path":     "/assets/models/gather/herb.glb",
    "tags":         ["gather", "herb", "chemistry"],
    "description":  "Medicinal herb cluster. Yields wild herbs for Chemistry. Respawns in 20s.",
    "source_file":  "src/world/GatherNode.js",
    "game_path":    "procedural://world/gather/herb",
    "skill":        "gather",
    "drops":        ["wildHerbs"],
  },
  {
    "id":           "gather_fungi",
    "display_name": "Fungi Cluster",
    "type":         "world",
    "category":     "world/gather",
    "glb_path":     "/assets/models/gather/fungi.glb",
    "tags":         ["gather", "fungi", "chemistry", "rootweaver"],
    "description":  "Glowing fungi cluster. Yields fungal mass for Chemistry brews. Respawns in 25s.",
    "source_file":  "src/world/GatherNode.js",
    "game_path":    "procedural://world/gather/fungi",
    "skill":        "gather",
    "drops":        ["fungalMass"],
  },

  # ── Stations ─────────────────────────────────────────────────────────────────
  {
    "id":           "foundryStation",
    "display_name": "Foundry",
    "type":         "structure",
    "category":     "structures/stations",
    "glb_path":     "/assets/models/stations/foundry.glb",
    "tags":         ["station", "foundry", "smelting"],
    "description":  "Smelting forge. Used to smelt ores into bars and ingots. Built from salvaged drone parts and river stone.",
    "source_file":  "src/world/FoundryStation.js",
    "game_path":    "procedural://structures/stations/foundry",
  },
  {
    "id":           "chemBench",
    "display_name": "Chemistry Bench",
    "type":         "structure",
    "category":     "structures/stations",
    "glb_path":     "/assets/models/stations/chemBench.glb",
    "tags":         ["station", "chemistry", "brewing"],
    "description":  "Chemistry bench with flasks and distiller. Used to brew potions and compounds.",
    "source_file":  "src/world/ChemBench.js",
    "game_path":    "procedural://structures/stations/chemBench",
  },
  {
    "id":           "techBench",
    "display_name": "Tech Bench",
    "type":         "structure",
    "category":     "structures/stations",
    "glb_path":     "/assets/models/stations/techBench.glb",
    "tags":         ["station", "tech", "fabrication", "solar-compact"],
    "description":  "Fabrication bench running on salvaged solar. Used to craft tech items and gadgets.",
    "source_file":  "src/world/TechBench.js",
    "game_path":    "procedural://structures/stations/techBench",
  },

  # ── Buildable structures ──────────────────────────────────────────────────────
  {
    "id":           "build_campfire",
    "display_name": "Campfire",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level1"],
    "description":  "Restores 2 HP per combat tick to nearby players. Cost: 5× Normal Log.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/campfire",
    "level_req":    1, "xp": 30,
  },
  {
    "id":           "build_leanTo",
    "display_name": "Lean-to",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level10"],
    "description":  "+10% movement speed while nearby. Cost: 6× Normal Log, 2× Moss Log.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/leanTo",
    "level_req":    10, "xp": 55,
  },
  {
    "id":           "build_barricade",
    "display_name": "Barricade",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level20"],
    "description":  "Slows enemies that approach. Cost: 4× Iron Log, 2× Iron Bar.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/barricade",
    "level_req":    20, "xp": 80,
  },
  {
    "id":           "build_watchtower",
    "display_name": "Watchtower",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level35", "solar-compact"],
    "description":  "Extends enemy detection range by 20 units. Cost: 8× Iron Log, 4× Steel Bar.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/watchtower",
    "level_req":    35, "xp": 110,
  },
  {
    "id":           "build_solarRelay",
    "display_name": "Solar Relay",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level50", "solar-compact"],
    "description":  "Boosts attunement recharge by 30% in a large area. Cost: 4× Solarite Ingot, 6× Steel Bar.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/solarRelay",
    "level_req":    50, "xp": 150,
  },
  {
    "id":           "build_rootNexus",
    "display_name": "Root Nexus",
    "type":         "structure",
    "category":     "structures/buildables",
    "tags":         ["buildable", "construction", "level70", "rootweaver", "rare"],
    "description":  "Sacred mycelial site. HP regen + attunement boost. Cost: 4× Heartstone Core, 8× Ancient Log.",
    "source_file":  "src/world/BlueprintDefs.js",
    "game_path":    "procedural://structures/buildables/rootNexus",
    "level_req":    70, "xp": 220,
  },
]

# ── Run ───────────────────────────────────────────────────────────────────────

def seed(force=False):
    registry = _load()
    added = 0

    for entry in SEED_ENTRIES:
        if not force and entry["id"] in registry:
            continue   # skip already-seeded entries

        registry[entry["id"]] = {
            "id":           entry["id"],
            "filename":     "procedural",
            "original_name": entry["display_name"],
            "display_name": entry["display_name"],
            "type":         entry["type"],
            "category":     entry.get("category", entry["type"]),
            "path":         None,
            "game_path":    entry.get("game_path"),
            "source_file":  entry.get("source_file", ""),
            "size":         0,
            "ext":          "procedural",
            "tags":         entry.get("tags", []),
            "description":  entry.get("description", ""),
            "source":       "procedural",
            "created_at":   datetime.utcnow().isoformat(),
            **{k: v for k, v in entry.items()
               if k not in ("id","display_name","type","category","game_path",
                            "source_file","tags","description")},
        }
        added += 1

    _save(registry)
    print(f"[seed] {added} entries added ({len(registry)} total in registry)")

if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    seed(force=force)

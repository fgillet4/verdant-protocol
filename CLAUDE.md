# Verdant Protocol — Master Agent Instructions

## Project Overview
Verdant Protocol is a browser-based 3D MMORPG built with Three.js. Solarpunk theme.
Click-to-move with A* pathfinding on a navmesh. Two player factions (Rootweavers vs Solar
Compact). RuneScape-style skill grinding. Full PvP and PvM with bosses.

## Tech Stack
- **Renderer**: Three.js (ES modules via importmap)
- **Pathfinding**: Custom A* on navmesh polygons + funnel smoothing
- **Networking**: Socket.io (server: Node.js + Express)
- **Database**: PostgreSQL (player data, skills, world state)
- **Asset pipeline**: Hunyuan3D → Blender retopo → GLB → Three.js asset registry
- **Build**: Vite (dev server + bundler)

## Repository Structure
```
verdant-protocol/
├── CLAUDE.md              ← You are here. Master instructions.
├── AGENTS.md              ← Accumulated knowledge base (agents write here)
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.js            ← Entry point. Bootstraps Engine then GameLoop.
│   ├── engine/
│   │   ├── Engine.js      ← Three.js scene, renderer, camera, lighting. OWNED BY: engine-agent
│   │   ├── GameLoop.js    ← requestAnimationFrame loop, delta time. OWNED BY: engine-agent
│   │   └── AssetLoader.js ← GLB loading, asset registry. OWNED BY: engine-agent
│   ├── pathfinding/
│   │   ├── Navmesh.js     ← Polygon graph, walkability. OWNED BY: pathfinding-agent
│   │   ├── AStar.js       ← A* with min-heap priority queue. OWNED BY: pathfinding-agent
│   │   ├── Funnel.js      ← String-pull path smoothing. OWNED BY: pathfinding-agent
│   │   └── PathFollower.js← Moves entity along smoothed path. OWNED BY: pathfinding-agent
│   ├── player/
│   │   ├── Player.js      ← Local player entity, stats, input. OWNED BY: player-agent
│   │   └── RemotePlayer.js← Other players (interpolated). OWNED BY: network-agent
│   ├── combat/
│   │   ├── CombatManager.js ← Tick system (600ms), auto-attack. OWNED BY: combat-agent
│   │   ├── Abilities.js   ← Special moves, cooldowns. OWNED BY: combat-agent
│   │   └── DamageCalc.js  ← Combat triangle, stats → damage. OWNED BY: combat-agent
│   ├── world/
│   │   ├── World.js       ← Zone management, terrain. OWNED BY: world-agent
│   │   ├── Biome.js       ← Biome types, ecosystem health. OWNED BY: world-agent
│   │   └── EcosystemState.js ← Global health tracker. OWNED BY: world-agent
│   ├── skills/
│   │   ├── SkillRegistry.js  ← All 20+ skills, XP tables. OWNED BY: skills-agent
│   │   ├── FactionGate.js    ← Faction-locked skill logic. OWNED BY: skills-agent
│   │   └── XPSystem.js       ← XP gain, level calc. OWNED BY: skills-agent
│   ├── ui/
│   │   ├── HUD.js         ← HP bar, skills bar, minimap. OWNED BY: ui-agent
│   │   └── SkillPanel.js  ← Skill tree UI. OWNED BY: ui-agent
│   ├── network/
│   │   └── NetworkManager.js ← Socket.io client. OWNED BY: network-agent
│   └── utils/
│       ├── MinHeap.js     ← Priority queue used by A*. OWNED BY: pathfinding-agent
│       ├── EventBus.js    ← Simple pub/sub. Shared. Do not modify without discussion.
│       └── MathUtils.js   ← Vec3 helpers, lerp, clamp. Shared.
├── server/
│   ├── index.js           ← Express + Socket.io server. OWNED BY: network-agent
│   ├── db/                ← PostgreSQL queries. OWNED BY: network-agent
│   └── game/              ← Server-side game logic. OWNED BY: network-agent
├── agents/
│   ├── engine-agent.md
│   ├── pathfinding-agent.md
│   ├── combat-agent.md
│   ├── world-agent.md
│   ├── skills-agent.md
│   ├── ui-agent.md
│   └── network-agent.md
└── assets/
    ├── models/            ← GLB files from Hunyuan3D pipeline
    ├── textures/
    └── registry.json      ← Asset manifest
```

## Critical Rules for All Agents

### Ownership
- Every file has one owner listed above. **Never modify a file you don't own** without
  leaving a comment explaining why and flagging it in AGENTS.md.
- Cross-module communication happens **only through EventBus** or clearly typed interfaces.
  Never import directly across domain boundaries (e.g. combat importing from pathfinding).

### EventBus Events (canonical list — add new ones here)
```
player:click-move       { worldPos: Vector3 }
player:arrived          { }
player:attack-target    { targetId: string }
combat:tick             { attackerId, targetId, damage, type }
combat:death            { entityId }
skill:xp-gained         { skillId, amount, newLevel? }
world:ecosystem-changed { zoneId, healthDelta }
ui:open-skill-panel     { }
ui:right-click          { x, y, target: { type, entityId?, worldPos?, label? } }
ui:examine              { text }
skill:action            { type, target }
world:interact          { target }
network:player-joined   { playerId, data }
network:player-left     { playerId }
ui:open-foundry         { stationId }
foundry:smelt           { recipeId }
foundry:smelt-complete  { recipeId, outputItem }
foundry:smelt-failed    { reason }
chemistry:craft         { recipeId }
chemistry:craft-complete { recipeId, outputItem }
chemistry:craft-failed  { reason }
item:use                { instanceId, defId }
attunement:restore      { amount }
player:xp-buff          { factor, durationMs }
player:weapon-coat      { type, bonus, charges, targetType? }
combat:aoe-effect       { type, radius, durationMs }
construction:start-placement { blueprintId }
construction:built      { blueprintId, structureId, position }
tech:fabricate          { recipeId }
tech:fabricate-complete { recipeId }
tech:fabricate-failed   { reason }
tech:ore-scan           { durationMs }
tech:signal-jam         { radius, durationMs }
tech:place-mine         { damage, radius }
tech:deploy-turret      { range, shots }
tech:activate-companion { type }
tech:place-gridweave        { attunementBoost }
chat:message                { playerId, playerName?, text }
marksmanship:ability        { id }
marksmanship:ability-used   { id, cdMs }
inventory:item-received { item }
inventory:changed       { }
```

### Code Style
- ES modules throughout. No CommonJS.
- JSDoc on all public methods.
- No magic numbers — use named constants in utils/Constants.js
- Three.js objects: always dispose geometry and materials when removing from scene.
- Never block the main thread. Heavy work goes in a Web Worker.

### Performance Rules
- Target 60fps on a mid-range laptop (GTX 1660 equiv)
- Max draw calls per frame: 500
- Use instanced meshes for repeated objects (trees, rocks, NPCs of same type)
- LOD: 3 levels. Full detail < 20m, reduced 20–60m, impostor > 60m
- Navmesh A*: must complete in < 2ms for any query. Profile and cache if needed.

### Pathfinding Contract (engine-agent and pathfinding-agent must respect this)
```js
// pathfinding-agent exposes this interface. engine-agent calls it.
navmesh.findPath(startVec3, endVec3) → Vector3[]  // smoothed waypoints or []
```
The returned array is world-space Vector3 waypoints. Empty array = no path found.
PathFollower.js consumes this array and moves the entity.

### Combat Tick Contract
```js
// combat-agent runs a tick every 600ms (like OSRS)
// Each tick: process auto-attacks, check ability queues, apply DoTs
// combat-agent fires combat:tick events — UI and networking listen
COMBAT_TICK_MS = 600
```

### Git Discipline
- Each agent works in its own git worktree branch: `agent/engine`, `agent/pathfinding` etc.
- Commit messages: `[agent-name] what was done`
- Never force push. Never commit to main directly.
- Merge via PR with at least the QA agent validating.

## Codebase Indexing — How It Works

### The Problem This Solves
The codebase is split into ~40 small files on purpose. Small files = low token cost when
an AI needs to read one. But you still need a way to get the full picture fast at the
start of a session without opening 40 files one by one.

### The Two-Layer System

**Layer 1 — `codebase.md` (full source dump)**
Run this once before starting any AI session:
```bash
./generate_codebase.sh
```
This produces `codebase.md` — every source file concatenated in dependency order, ~4000
lines. Read it in one shot to understand the whole codebase. It is gitignored; regenerate
after any significant change. When Claude Code reads `codebase.md` it gets the complete
picture without hunting through individual files.

**Layer 2 — `src/*/index.js` barrel files**
Every domain folder has an `index.js` that re-exports everything in that domain:
```js
// Instead of:
import { CombatManager } from '../combat/CombatManager.js'
import { DamageCalc }    from '../combat/DamageCalc.js'

// You can write:
import { CombatManager, DamageCalc } from '../combat'
```
Use barrel imports in new code. Existing files use direct paths — both work fine.

### File Size Rule
**Target: no file over ~120 lines.** When a file gets long, split it:
- Pure data → its own `*Defs.js` file
- Algorithm → its own file
- DOM building → its own component class
- The original becomes a thin coordinator that imports and wires the pieces

### Domain Map (what lives where)
```
src/engine/       — Three.js renderer, camera, raycasting
src/pathfinding/  — Navmesh, A*, funnel smoother, path follower
src/player/       — Local player entity
src/world/        — Terrain, biome zones
src/inventory/    — Item data (ItemDefs), loot tables, bag, equipment slots
src/combat/       — Damage formula, 600ms tick, abilities
src/enemies/      — Drone mesh, drone AI, enemy manager
src/skills/       — Skill definitions, XP table, XP award system
src/attunement/   — Attunement definitions, point system
src/ui/           — All DOM panels: HUD, inventory, attunement bar, tooltips
src/utils/        — EventBus (pub/sub), MinHeap
```

### EventBus Is the Only Cross-Domain Wire
Domains never import from each other. All cross-cutting communication goes through
`bus.emit(event, payload)` and `bus.on(event, handler)`. The canonical event list is
in the "EventBus Events" section above. Add new events there when you create them.

## Current Sprint: Foundation
Priority order:
1. ✅ Project scaffold (this file)
2. 🔧 Engine.js — Three.js scene + click raycasting
3. 🔧 Pathfinding — Navmesh + A* + PathFollower
4. ⏳ Player.js — entity that follows the path
5. ⏳ GameLoop.js — ties it together
6. ⏳ Basic terrain mesh for the navmesh to sit on
7. ⏳ HUD stub

## World Lore Reference (for quest/dialogue agents)
- Two factions: **Rootweavers** (deep ecology, organic tech) vs **Solar Compact** (eco-modernism, repurposed machines)
- Shared enemy: **The Extractive Machine** (drone network, industrial AI)
- Players start unguilded, choose faction around level 40–50
- Third path: **Wanderers** (neutral traders, diplomats)
- Key skills: Biomech, Solarcasting, Mycelial, Marksmanship, Canopy Harvest,
  Controlled Burn, Foraging, Water Reclamation, Seed Lore, Foundry/Bonding,
  Wildtongue, Recoding, Gridweaving, Navigation, Tenacity, Beast Whispering,
  Construction, Diplomacy, Fermentation, Ecology

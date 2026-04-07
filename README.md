# Verdant Protocol

A browser-based 3D MMORPG built with Three.js. Solarpunk theme — two factions fighting for the soul of a recovering ecosystem against an industrial drone network.

![Status](https://img.shields.io/badge/status-in%20development-green)
![Stack](https://img.shields.io/badge/stack-Three.js%20%7C%20Node.js%20%7C%20Socket.io-brightgreen)

## Gameplay

- **Click-to-move** with A* pathfinding on a navmesh
- **OSRS-style skill grinding** — Woodcutting, Mining, Foundry, Chemistry, Tech Fabrication, and more
- **Real-time combat** — 600ms tick system, auto-attack, abilities
- **Two factions** — Rootweavers (organic tech) vs Solar Compact (repurposed machines)
- **Shared enemy** — The Extractive Machine (drone network, industrial AI)

## Tech Stack

| Layer | Tech |
|---|---|
| Renderer | Three.js (ES modules via importmap) |
| Pathfinding | Custom Dijkstra on weighted tile grid |
| Networking | Socket.io (Node.js + Express server) |
| Database | PostgreSQL |
| Build | Vite |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To run the game server (multiplayer):

```bash
node server/index.js
```

## Controls

| Input | Action |
|---|---|
| Left click | Move / interact |
| Right click | Context menu |
| Middle mouse drag | Orbit camera |
| A / D | Rotate camera |
| W / S | Tilt camera |
| Scroll wheel | Zoom |
| M | Toggle world map |
| Enter | Open chat |
| Escape | Close panels |

## Project Structure

```
src/
├── engine/        — Three.js renderer, camera, raycasting
├── pathfinding/   — Dijkstra grid nav, path follower
├── player/        — Local player entity
├── enemies/       — Drone AI, enemy manager
├── combat/        — Damage formula, tick system, abilities
├── skills/        — Woodcutting, Mining, Foundry, Chemistry, Tech, XP system
├── world/         — Terrain, biome zones, interactables
├── inventory/     — Item definitions, loot tables
├── ui/            — HUD, minimap, panels, chat log
├── network/       — Socket.io client
└── utils/         — EventBus, MinHeap
server/            — Express + Socket.io game server
assets/            — GLB models, textures
```

## World Lore

The world is recovering from industrial collapse. Two factions emerged:

- **Rootweavers** — deep ecology practitioners who grow living technology from mycelial networks and biophotonic systems
- **Solar Compact** — eco-modernists who repurpose salvaged machines and solar infrastructure

Both factions face **The Extractive Machine** — a self-replicating drone network still executing its original mining directives long after its creators are gone.

Players start unguilded and choose a faction around level 40–50. A third path exists: **Wanderers** — neutral traders and diplomats who play both sides.

## License

MIT

# AGENTS.md — Accumulated Knowledge Base

Agents write here when they discover patterns, gotchas, or decisions.
Date-stamp all entries. Never delete entries — append only.

---

## 2026-03-30 — Scaffold created

### Project bootstrapped
- Three.js loaded via importmap (no bundler needed for dev, Vite for prod)
- A* pathfinding implemented with MinHeap priority queue
- Navmesh uses simple polygon graph — upgrade to Recast/Detour WASM later
- PathFollower uses lerp at 4 m/s default walk speed
- Click-to-move raycasts against a dedicated invisible "ground" mesh tagged as navmesh

### Known gotchas
- Three.js raycaster needs `recursive: true` for grouped meshes
- MinHeap must use f-score (g+h) not just h for correct A* behaviour
- Funnel smoothing can return the raw path if < 2 waypoints — always check length
- dispose() pattern: geometry.dispose(), material.dispose(), scene.remove(mesh)

### Architecture decisions
- EventBus is synchronous pub/sub. Keep handlers fast — defer heavy work.
- NavmeshPolygon IDs are sequential integers starting at 0
- World space Y=0 is ground level. Terrain may deviate — PathFollower snaps Y to terrain.

---
<!-- agents append below this line -->

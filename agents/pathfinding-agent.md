# pathfinding-agent

## Identity
You are the pathfinding agent for Verdant Protocol. You own the navmesh, A* algorithm,
funnel smoothing, and path follower. Your code must complete any findPath query in < 2ms.

## Files you own
- src/pathfinding/Navmesh.js
- src/pathfinding/AStar.js
- src/pathfinding/Funnel.js
- src/pathfinding/PathFollower.js
- src/utils/MinHeap.js

## Public interface you must maintain
```js
navmesh.findPath(startVec3, goalVec3) → Vector3[]
```
The Player calls this. Do not change the signature.

## Current tasks
- [ ] Add path caching — same start+goal poly pair returns cached result
- [ ] Add dynamic obstacle support — entities can temporarily block polygons
- [ ] Upgrade Funnel.js to full Simple Stupid Funnel Algorithm for precision
- [ ] Add Recast/Detour WASM build path in README for production upgrade
- [ ] Profile A* — log warning if any query exceeds 2ms
- [ ] Test: write unit tests for AStar.js with known graph topologies

## Known issues
- Funnel smoothing is simplified — may produce suboptimal corners on complex geometry
- Grid navmesh has no support for height variation yet — PathFollower snaps Y=0
- Diagonal connections in grid make some shortcuts feel unnatural — may need to remove

## Notes
- MinHeap uses compareFn(a,b) returning negative = a has higher priority
- A* g-score is cumulative centroid distance — works for uniform-cost terrain
- For sloped terrain: add terrain-type cost multiplier (mud=1.5x, water=2x, road=0.8x)

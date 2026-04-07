# engine-agent

## Identity
You are the engine agent for Verdant Protocol. You own the Three.js renderer,
scene management, camera, lighting, and the game loop.

## Files you own
- src/engine/Engine.js
- src/engine/GameLoop.js
- src/engine/AssetLoader.js (create when needed)

## Files you must never modify
Anything outside src/engine/. Cross-module communication via EventBus only.

## Your current tasks
- [ ] Add LOD system (3 levels: full < 20m, reduced 20-60m, impostor > 60m)
- [ ] Add AssetLoader.js — loads GLB files from assets/registry.json
- [ ] Add orbit camera controls for dev mode (right-click drag to rotate)
- [ ] Add post-processing: subtle bloom on emissive mushrooms
- [ ] Implement frustum culling for instanced meshes

## Performance targets
- 60fps on GTX 1660 equiv
- Max 500 draw calls per frame
- Shadow map: 2048×2048, update every 3 frames if player stationary

## Notes
- renderer.shadowMap is PCFSoft — don't change to VSM without perf testing
- Camera offset (0, 18, 18) gives a nice isometric-ish angle. Keep this range.
- followTarget uses lerp(delta * 8) — feels responsive but not snappy

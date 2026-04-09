/**
 * AssetLoader — singleton GLTFLoader with caching.
 * loadModel(path) resolves with a cloned THREE.Group ready to add to a scene.
 * Returns null (never rejects) so callers can use .then(model => { if (model) swap }).
 * OWNED BY: engine-agent
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const _loader = new GLTFLoader()
const _cache  = new Map()  // path → THREE.Group (master copy, never added to scene)

/**
 * Load a GLB/GLTF from path. Caches the master scene, returns a fresh clone each call.
 * @param {string} path
 * @returns {Promise<THREE.Group|null>}
 */
export function loadModel(path) {
  if (_cache.has(path)) {
    return Promise.resolve(_cache.get(path).clone())
  }
  return new Promise(resolve => {
    _loader.load(
      path,
      gltf => {
        _cache.set(path, gltf.scene)
        resolve(gltf.scene.clone())
      },
      undefined,
      () => resolve(null),   // file not found → null, caller keeps procedural
    )
  })
}

/**
 * Fire-and-forget preload — warms the cache without blocking.
 * @param {string[]} paths
 */
export function preloadModels(paths) {
  for (const p of paths) loadModel(p)
}

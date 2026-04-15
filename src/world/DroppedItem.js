/**
 * DroppedItem — a 3D world object representing an item on the ground.
 * Bobs gently, fades out in the last 5 seconds, auto-despawns at 30s.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

const DESPAWN_MS   = 30_000
const FADE_START   = 25_000   // start fading 5s before despawn
const BOB_SPEED    = 2.0
const BOB_HEIGHT   = 0.08
const BASE_Y       = 0.35

export class DroppedItem {
  /**
   * @param {string} id             unique drop id
   * @param {object} item           item instance (defId, name, color, quantity)
   * @param {THREE.Vector3} pos     world position
   * @param {THREE.Scene} scene
   */
  constructor(id, item, pos, scene) {
    this.id        = id
    this.item      = item
    this._scene    = scene
    this._spawnedAt = performance.now()
    this._alive    = true
    this._bobOffset = Math.random() * Math.PI * 2  // desync items

    this.object = this._build(item, pos)
    scene.add(this.object)
  }

  get position() { return this.object.position }
  get isAlive()  { return this._alive }

  /**
   * @param {number} delta seconds
   * @returns {boolean} false when despawned
   */
  update(delta) {
    if (!this._alive) return false

    const elapsed = performance.now() - this._spawnedAt

    if (elapsed >= DESPAWN_MS) {
      this._despawn()
      return false
    }

    // Bob
    this._bobOffset += BOB_SPEED * delta
    this.object.position.y = BASE_Y + Math.sin(this._bobOffset) * BOB_HEIGHT

    // Slow spin
    this.object.rotation.y += 0.6 * delta

    // Fade out in last 5 seconds
    if (elapsed >= FADE_START) {
      const t = 1 - (elapsed - FADE_START) / (DESPAWN_MS - FADE_START)
      this._mesh.material.opacity    = Math.max(0, t * 0.9)
      this._glowMesh.material.opacity = Math.max(0, t * 0.35)
    }

    return true
  }

  destroy() {
    this._despawn()
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _despawn() {
    if (!this._alive) return
    this._alive = false
    this._scene.remove(this.object)
    this.object.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose()
        child.material.dispose()
      }
    })
  }

  _build(item, pos) {
    const group = new THREE.Group()
    group.position.copy(pos)
    group.position.y = BASE_Y

    // Coloured cube (item colour or default teal)
    const color = item.color ?? '#4caf50'
    const geo   = new THREE.BoxGeometry(0.28, 0.28, 0.28)
    const mat   = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9,
    })
    this._mesh = new THREE.Mesh(geo, mat)
    this._mesh.castShadow = false
    group.add(this._mesh)

    // Soft glow halo
    const glowGeo  = new THREE.SphereGeometry(0.28, 8, 8)
    const glowMat  = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    })
    this._glowMesh = new THREE.Mesh(glowGeo, glowMat)
    this._glowMesh.scale.setScalar(1.5)
    group.add(this._glowMesh)

    return group
  }
}

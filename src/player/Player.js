import * as THREE from 'three'
import { bus } from '../utils/EventBus.js'
import { PathFollower } from '../pathfinding/PathFollower.js'
import { GridNav } from '../pathfinding/GridNav.js'

// Shared path-dot geometry (flat circle on the ground)
const _DOT_GEO = new THREE.CircleGeometry(0.14, 8)
_DOT_GEO.rotateX(-Math.PI / 2)
const _DOT_MAT = new THREE.MeshBasicMaterial({
  color: 0x76ff03, transparent: true, opacity: 0.65, depthWrite: false,
})

/**
 * Player — local player entity.
 * Listens for player:click-move events, requests a path, and follows it.
 * Uses GridNav (Dijkstra) for pathfinding — same approach as Realm-of-Frank.
 * OWNED BY: player-agent
 */
export class Player {
  /**
   * @param {GridNav} gridNav
   */
  constructor(gridNav) {
    this.navmesh = gridNav   // keep property name for compatibility

    // ── 3D representation ─────────────────────────────────────────────────
    this.object = new THREE.Group()
    this._buildMesh()

    // ── Stats ─────────────────────────────────────────────────────────────
    this.stats = {
      hp: 100, maxHp: 100,
      faction: null,
      skills: {},
    }

    // ── Path follower ─────────────────────────────────────────────────────
    this.follower = new PathFollower(this.object)

    // ── Path dot visualisation ────────────────────────────────────────────
    /** @type {THREE.Mesh[]} */
    this._dots = []

    // ── Listen for events ─────────────────────────────────────────────────
    bus.on('player:click-move', ({ worldPos }) => this._moveTo(worldPos))
    bus.on('player:arrived',    () => this._onArrive())
  }

  _buildMesh() {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.8, metalness: 0.1 })
    )
    body.position.y = 0.85
    body.castShadow = true

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x76ff03 })
    )
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 1.1, -0.5)

    this.object.add(body, nose)
  }

  /**
   * Handle a click-move request.
   * @param {THREE.Vector3} worldPos
   */
  _moveTo(worldPos) {
    const waypoints = this.navmesh.findPath(this.object.position, worldPos)
    if (!waypoints || waypoints.length < 2) {
      console.warn('[Player] No path found')
      return
    }

    this.follower.setPath(waypoints)
    this._drawDots(waypoints)

    const statusEl = document.getElementById('status')
    if (statusEl) statusEl.textContent = 'Walking...'
  }

  _onArrive() {
    const statusEl = document.getElementById('status')
    if (statusEl) statusEl.textContent = 'Click the ground to move'
    this._clearDots()
  }

  // ── Path dot visualisation ────────────────────────────────────────────────

  _drawDots(waypoints) {
    this._clearDots()
    for (let i = 1; i < waypoints.length; i++) {
      const alpha = 0.65 * (1 - (i / waypoints.length) * 0.5)
      const mat   = _DOT_MAT.clone()
      mat.opacity = alpha
      const dot   = new THREE.Mesh(_DOT_GEO, mat)
      dot.position.copy(waypoints[i])
      dot.position.y = 0.42
      this._dots.push(dot)
      bus.emit('world:add-debug-object', { object: dot })
    }
  }

  _clearDots() {
    for (const dot of this._dots) {
      bus.emit('world:remove-debug-object', { object: dot })
      dot.material.dispose()
    }
    this._dots = []
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * Called every frame from GameLoop.
   * @param {number} delta
   */
  update(delta) {
    this.follower.update(delta)

    const coordEl = document.getElementById('coords')
    if (coordEl) {
      const p = this.object.position
      coordEl.textContent = `${p.x.toFixed(1)}, ${p.z.toFixed(1)}`
    }
  }

  /** @returns {THREE.Vector3} */
  get position() { return this.object.position }
}

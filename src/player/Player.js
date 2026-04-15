import * as THREE from 'three'
import { bus } from '../utils/EventBus.js'
import { PathFollower } from '../pathfinding/PathFollower.js'
import { GridNav } from '../pathfinding/GridNav.js'

const MELEE_RANGE     = 2.5  // world units — one tile
const REPATH_INTERVAL = 0.5  // seconds between chase re-paths

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

    // ── Chase state ───────────────────────────────────────────────────────
    /** @type {{ id: string, getPos: () => THREE.Vector3 } | null} */
    this._chase       = null
    this._repathTimer = 0

    // ── Walk-to state (one-shot approach, e.g. benches) ───────────────────
    /** @type {{ targetPos: THREE.Vector3, onInRange: Function, reach: number } | null} */
    this._walkTo = null

    // ── Listen for events ─────────────────────────────────────────────────
    bus.on('player:click-move', ({ worldPos, _internal }) => {
      if (!_internal) { this._clearChase(); this._walkTo = null }
      this._moveTo(worldPos)
    })
    bus.on('player:arrived',    () => this._onArrive())
    bus.on('combat:death',      ({ entityId }) => { if (this._chase?.id === entityId) this._clearChase() })
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
   * Begin chasing an entity for melee combat.
   * Re-paths every REPATH_INTERVAL until within MELEE_RANGE, then stops moving.
   * @param {string} id — enemy entity id (cleared on combat:death)
   * @param {() => THREE.Vector3} getPos — live position getter
   */
  chaseTarget(id, getPos) {
    this._chase       = { id, getPos }
    this._repathTimer = REPATH_INTERVAL  // trigger immediate path on first update
  }

  _clearChase() {
    this._chase       = null
    this._repathTimer = 0
  }

  /**
   * Walk to a position and fire a callback once within reach.
   * Cancelled if the player manually clicks elsewhere.
   * @param {THREE.Vector3} targetPos
   * @param {Function} onInRange
   * @param {number} [reach=2.5]
   */
  walkTo(targetPos, onInRange, reach = 2.5) {
    this._clearChase()
    this._walkTo = { targetPos, onInRange, reach }
    this._moveTo(targetPos)
  }

  /**
   * Handle a click-move request.
   * @param {THREE.Vector3} worldPos
   */
  _moveTo(worldPos) {
    const waypoints = this.navmesh.findPath(this.object.position, worldPos)
    if (!waypoints || waypoints.length === 0) {
      console.warn('[Player] No path found')
      return
    }
    if (waypoints.length === 1) {
      // Already at destination cell — fire arrival immediately
      this._onArrive()
      if (this._walkTo) {
        const { onInRange } = this._walkTo
        this._walkTo = null
        onInRange()
      }
      return
    }

    this.follower.setPath(waypoints)
    this._drawDots(waypoints)
  }

  _onArrive() {
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
    // Walk-to — one-shot approach (benches, interactables)
    if (this._walkTo) {
      const { targetPos, onInRange, reach } = this._walkTo
      const dx = this.object.position.x - targetPos.x
      const dz = this.object.position.z - targetPos.z
      if (Math.sqrt(dx * dx + dz * dz) <= reach) {
        this._walkTo = null
        onInRange()
      }
    }

    // Chase — re-path toward target while outside melee range
    if (this._chase) {
      this._repathTimer += delta
      if (this._repathTimer >= REPATH_INTERVAL) {
        this._repathTimer = 0
        const targetPos = this._chase.getPos()
        const dx = this.object.position.x - targetPos.x
        const dz = this.object.position.z - targetPos.z
        if (Math.sqrt(dx * dx + dz * dz) > MELEE_RANGE) {
          this._moveTo(targetPos)
        } else {
          this.follower.stop()
        }
      }
    }

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

import * as THREE        from 'three'
import { bus }           from '../utils/EventBus.js'
import { PathFollower }  from '../pathfinding/PathFollower.js'
import { rollDroneLoot } from '../inventory/LootTable.js'
import { buildDroneMesh } from './DroneMesh.js'

const AGGRO_RANGE   = 10
const ATTACK_RANGE  = 2.0
const LEASH_RANGE   = 28
const WANDER_RADIUS = 12
const WANDER_DELAY  = 3.5
const HOVER_HEIGHT  = 1.3
const WALK_SPEED    = 3.2

const STATE = Object.freeze({ WANDER: 0, CHASE: 1, ATTACK: 2, DEAD: 3 })

/**
 * DroneEnemy — patrol/aggro sentinel.
 * AI state machine: WANDER → CHASE → ATTACK → DEAD.
 * Mesh construction delegated to DroneMesh.js.
 * OWNED BY: enemies-agent
 */
export class DroneEnemy {
  /**
   * @param {string} id
   * @param {THREE.Vector3} spawnPos
   * @param {import('../pathfinding/Navmesh.js').Navmesh} navmesh
   */
  constructor(id, spawnPos, navmesh) {
    this.id       = id
    this.navmesh  = navmesh
    this.spawnPos = spawnPos.clone()

    this.stats = {
      hp: 50, maxHp: 50,
      attack: 18, defense: 10,   // attack:18 → ~60% hit rate vs default player
      combatStyle: 'biomech',
      combatLevel: 14,           // used for OSRS-style level colour in tooltip
    }

    const mesh      = buildDroneMesh()
    this.object     = mesh.object
    this._bodyMat   = mesh.bodyMat
    this._sensorMat = mesh.sensorMat

    this.object.position.copy(spawnPos)
    this.object.position.y = HOVER_HEIGHT

    this.follower = new PathFollower(this.object)
    this.follower._speed = WALK_SPEED

    this._state       = STATE.WANDER
    this._wanderTimer = Math.random() * WANDER_DELAY
    this._playerObject = null
    this._lastPlayerPos = new THREE.Vector3()
    this._rePathTimer   = 0

    bus.on('combat:death', ({ entityId }) => { if (entityId === this.id) this._die() })
    bus.on('combat:tick',  ({ targetId })  => {
      if (targetId !== this.id) return
      // Retaliate — enter chase when first hit by the player
      if (this._state === STATE.WANDER) this._enterChase()
    })
  }

  /** @param {THREE.Object3D} playerObject */
  setPlayerRef(playerObject) { this._playerObject = playerObject }

  /** @param {number} delta — seconds */
  update(delta) {
    if (this._state === STATE.DEAD) return

    // Hover bob
    this.object.position.y = HOVER_HEIGHT + Math.sin(Date.now() * 0.0018 + this.id.length) * 0.1
    this.follower.update(delta)

    if (!this._playerObject) return
    const distToPlayer = this.object.position.distanceTo(this._playerObject.position)
    const distToSpawn  = this.object.position.distanceTo(this.spawnPos)

    if      (this._state === STATE.WANDER) this._tickWander(delta, distToPlayer)
    else if (this._state === STATE.CHASE)  this._tickChase(delta, distToPlayer, distToSpawn)
    else if (this._state === STATE.ATTACK) this._tickAttack(distToPlayer)
  }

  _tickWander(delta, distToPlayer) {
    // Passive — only chase if provoked (handled by combat:tick listener)
    this._wanderTimer -= delta
    if (this._wanderTimer <= 0 && !this.follower.isMoving) {
      this._wanderTimer = WANDER_DELAY + Math.random() * 2
      this._pickWanderPoint()
    }
  }

  _tickChase(delta, distToPlayer, distToSpawn) {
    if (distToSpawn > LEASH_RANGE) {
      this._state = STATE.WANDER
      this._sensorMat.emissive.setHex(0xff0000)
      this._sensorMat.emissiveIntensity = 1.2
      this._pathTo(this.spawnPos)
      return
    }
    if (distToPlayer < ATTACK_RANGE) {
      this._state = STATE.ATTACK
      this.follower.stop()
      bus.emit('enemy:engage', { enemyId: this.id })
      return
    }
    this._rePathTimer -= delta
    const playerMoved = this._playerObject.position.distanceTo(this._lastPlayerPos) > 2
    if ((playerMoved || this._rePathTimer <= 0) && !this.follower.isMoving) {
      this._rePathTimer = 1.5
      this._lastPlayerPos.copy(this._playerObject.position)
      this._pathTo(this._playerObject.position)
    }
  }

  _tickAttack(distToPlayer) {
    if (distToPlayer > ATTACK_RANGE * 1.6) this._state = STATE.CHASE
  }

  _enterChase() {
    this._state = STATE.CHASE
    this._sensorMat.emissive.setHex(0xff4400)
    this._sensorMat.emissiveIntensity = 2.0
    this.follower.stop()
  }

  _pickWanderPoint() {
    const angle  = Math.random() * Math.PI * 2
    const radius = 4 + Math.random() * WANDER_RADIUS
    this._pathTo(new THREE.Vector3(
      this.spawnPos.x + Math.cos(angle) * radius, 0,
      this.spawnPos.z + Math.sin(angle) * radius,
    ))
  }

  _pathTo(target) {
    // Drones are aerial — fly straight to target, ignoring ground obstacles
    const from = this.object.position.clone()
    const to   = target.clone()
    to.y = from.y   // maintain hover height
    this.follower.setPath([from, to])
  }

  _die() {
    if (this._state === STATE.DEAD) return
    this._state = STATE.DEAD
    this.follower.stop()
    this._bodyMat.emissive.setHex(0xff2200)
    this._bodyMat.emissiveIntensity = 1.0
    this._sensorMat.emissiveIntensity = 0

    setTimeout(() => {
      bus.emit('world:remove-debug-object', { object: this.object })
      bus.emit('enemy:died', { enemyId: this.id })
      const items = rollDroneLoot()
      if (items.length) bus.emit('enemy:loot', { items, sourcePos: this.object.position.clone() })
    }, 800)
  }

}

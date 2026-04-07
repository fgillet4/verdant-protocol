import * as THREE from 'three'
import { bus } from '../utils/EventBus.js'
import { DroneEnemy } from './DroneEnemy.js'

/**
 * EnemyManager — spawns and updates enemy entities.
 * Acts as the bridge between enemies, the scene, Engine (click detection),
 * and CombatManager.
 */
export class EnemyManager {
  /**
   * @param {import('../pathfinding/Navmesh.js').Navmesh} navmesh
   * @param {import('../engine/Engine.js').Engine} engine
   * @param {import('../combat/CombatManager.js').CombatManager} combat
   */
  constructor(navmesh, engine, combat) {
    this.navmesh = navmesh
    this.engine  = engine
    this.combat  = combat

    /** @type {Map<string, DroneEnemy>} */
    this.enemies = new Map()

    this._playerObject = null

    bus.on('enemy:died', ({ enemyId }) => {
      this.enemies.delete(enemyId)
      this.combat.unregisterEntity(enemyId)
      this.engine.removeInteractableMesh(enemyId)
    })
  }

  /** @param {THREE.Object3D} playerObject */
  setPlayerRef(playerObject) {
    this._playerObject = playerObject
    for (const enemy of this.enemies.values()) {
      enemy.setPlayerRef(playerObject)
    }
  }

  /**
   * Spawn a single drone at the given world position.
   * @param {THREE.Vector3} pos
   * @returns {DroneEnemy}
   */
  spawnDrone(pos) {
    const id = `drone_${this.enemies.size}_${Math.random().toString(36).slice(2, 5)}`
    const drone = new DroneEnemy(id, pos, this.navmesh)

    if (this._playerObject) drone.setPlayerRef(this._playerObject)

    this.enemies.set(id, drone)
    this.combat.registerEntity(id, drone)
    this.engine.addInteractableMesh(drone.object, id, 'enemy', 'Forest Drone', { combatLevel: drone.stats.combatLevel })
    bus.emit('world:add-debug-object', { object: drone.object })

    return drone
  }

  /**
   * Spawn multiple drones arranged in a ring around the zone.
   * @param {number} count
   */
  spawnDrones(count) {
    for (let i = 0; i < count; i++) {
      const angle  = (i / count) * Math.PI * 2
      const radius = 15 + Math.random() * 12
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      )
      this.spawnDrone(pos)
    }
  }

  /**
   * Called every frame from GameLoop.
   * @param {number} delta
   */
  update(delta) {
    for (const enemy of this.enemies.values()) {
      enemy.update(delta)
    }
  }
}

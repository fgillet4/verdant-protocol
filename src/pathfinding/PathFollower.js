import * as THREE from 'three'
import { bus } from '../utils/EventBus.js'

const WALK_SPEED = 4.0   // metres per second
const ARRIVE_THRESHOLD = 0.15  // metres — close enough to waypoint

/**
 * PathFollower — attached to a player or NPC.
 * Call update(delta) every frame from GameLoop.
 * Call setPath(waypoints) to start movement.
 */
export class PathFollower {
  /**
   * @param {THREE.Object3D} object — the Three.js object to move
   */
  constructor(object) {
    this.object = object
    /** @type {THREE.Vector3[]} */
    this._waypoints = []
    this._waypointIndex = 0
    this._moving = false
    this._speed = WALK_SPEED

    // Reusable vectors
    this._target = new THREE.Vector3()
    this._dir = new THREE.Vector3()
    this._lookAt = new THREE.Vector3()
  }

  /**
   * Set a new path to follow. Replaces any current path.
   * @param {THREE.Vector3[]} waypoints — world-space, Y=0 assumed
   */
  setPath(waypoints) {
    if (!waypoints || waypoints.length < 2) {
      this.stop()
      return
    }
    this._waypoints = waypoints
    this._waypointIndex = 1  // start → first waypoint
    this._moving = true
  }

  stop() {
    this._moving = false
    this._waypoints = []
  }

  get isMoving() { return this._moving }

  /**
   * Call every frame from GameLoop.
   * @param {number} delta — seconds since last frame
   */
  update(delta) {
    if (!this._moving || this._waypoints.length === 0) return

    const target = this._waypoints[this._waypointIndex]
    if (!target) { this._arrive(); return }

    // Direction to next waypoint (XZ only)
    this._dir.subVectors(target, this.object.position)
    this._dir.y = 0
    const dist = this._dir.length()

    if (dist < ARRIVE_THRESHOLD) {
      // Snap to waypoint, advance
      this.object.position.x = target.x
      this.object.position.z = target.z
      this._waypointIndex++
      if (this._waypointIndex >= this._waypoints.length) {
        this._arrive()
      }
      return
    }

    // Move toward waypoint
    this._dir.normalize()
    const step = Math.min(this._speed * delta, dist)
    this.object.position.addScaledVector(this._dir, step)

    // Rotate to face direction of travel
    this._lookAt.copy(this.object.position).addScaledVector(this._dir, 1)
    this._lookAt.y = this.object.position.y
    this.object.lookAt(this._lookAt)
  }

  _arrive() {
    this._moving = false
    this._waypoints = []
    bus.emit('player:arrived', {})
  }
}

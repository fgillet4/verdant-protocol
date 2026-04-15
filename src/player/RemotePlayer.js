/**
 * RemotePlayer — renders another player's character in the world.
 * Interpolates position at 10 Hz updates for smooth movement.
 * OWNED BY: network-agent
 */
import * as THREE from 'three'

const INTERP_SPEED = 12   // lerp factor (higher = snappier)

// Shared geometry/material for all remote players (instanced later if needed)
const _BODY_GEO = new THREE.CapsuleGeometry(0.35, 1.0, 4, 8)
const _BODY_MAT = new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.8, metalness: 0.1 })
const _NOSE_GEO = new THREE.ConeGeometry(0.15, 0.4, 6)
const _NOSE_MAT = new THREE.MeshStandardMaterial({ color: 0x64b5f6 })

export class RemotePlayer {
  /**
   * @param {string} playerId   socket id
   * @param {string} username
   * @param {THREE.Scene} scene
   */
  constructor(playerId, username, scene) {
    this.playerId = playerId
    this.username = username
    this._scene   = scene

    this.object = new THREE.Group()

    const body = new THREE.Mesh(_BODY_GEO, _BODY_MAT.clone())
    body.position.y = 0.85
    body.castShadow = true

    const nose = new THREE.Mesh(_NOSE_GEO, _NOSE_MAT.clone())
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, 1.1, -0.5)

    this.object.add(body, nose)

    // Name label above head
    this._label = this._makeLabel(username)
    this._label.position.set(0, 2.4, 0)
    this.object.add(this._label)

    // Target position for interpolation
    this._targetX = 0
    this._targetZ = 0

    scene.add(this.object)
  }

  /** Set the server-authoritative target position. */
  setTarget(x, z, rotation) {
    this._targetX   = x
    this._targetZ   = z
    this._targetRot = rotation ?? this.object.rotation.y
  }

  /** Called every frame from game loop. */
  update(delta) {
    const t = Math.min(1, INTERP_SPEED * delta)
    this.object.position.x += (this._targetX - this.object.position.x) * t
    this.object.position.z += (this._targetZ - this.object.position.z) * t
    if (this._targetRot !== undefined) {
      this.object.rotation.y += (this._targetRot - this.object.rotation.y) * t
    }
    // Keep label facing camera (billboard — rotated in world update if needed)
  }

  destroy() {
    this._scene.remove(this.object)
    this.object.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose()
        child.material.dispose()
      }
    })
    if (this._labelCanvas) {
      // canvas label has no GPU resources to dispose
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _makeLabel(text) {
    const canvas = document.createElement('canvas')
    canvas.width  = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.font = 'bold 28px "Courier New", monospace'
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#81c784'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 42)

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(1.6, 0.4, 1)
    return sprite
  }
}

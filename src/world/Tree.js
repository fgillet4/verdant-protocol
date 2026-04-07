/**
 * Tree — individual interactable tree entity.
 * States: STANDING → STUMP → (respawn) → STANDING
 * Each tree instance takes a tier def from TreeDefs.js for visual/gameplay variation.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

const RESPAWN_MS = 40_000

// Shared geometry (all tiers reuse these shapes, only materials differ)
const _trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6)
const _canopyGeo = new THREE.ConeGeometry(1.0, 2.2, 6)
const _stumpGeo  = new THREE.CylinderGeometry(0.14, 0.18, 0.35, 6)
const _stumpMat  = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 })

export class Tree {
  /**
   * @param {string} id
   * @param {number} x
   * @param {number} z
   * @param {number} scale
   * @param {object} tierDef  — from TREE_TIERS in TreeDefs.js
   */
  constructor(id, x, z, scale, tierDef) {
    this.id       = id
    this.tier     = tierDef
    this.position = new THREE.Vector3(x, 0, z)
    this.scale    = scale
    this._state   = 'standing'
    this._chopsLeft = this._rollChops()

    this.object = this._build(x, z, scale, tierDef)
  }

  get isStanding() { return this._state === 'standing' }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build(x, z, scale, tier) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)

    const trunkMat  = new THREE.MeshStandardMaterial({ color: tier.trunkColor,  roughness: 1 })
    const canopyMat = new THREE.MeshStandardMaterial({ color: tier.canopyColor, roughness: 0.9 })

    this._trunk = new THREE.Mesh(_trunkGeo, trunkMat)
    this._trunk.position.y = 0.9 * scale
    this._trunk.scale.setScalar(scale)
    this._trunk.castShadow = true

    this._canopy = new THREE.Mesh(_canopyGeo, canopyMat)
    this._canopy.position.y = (0.9 + 1.5) * scale
    this._canopy.scale.setScalar(scale)
    this._canopy.rotation.y = Math.random() * Math.PI * 2
    this._canopy.castShadow = true

    this._stump = new THREE.Mesh(_stumpGeo, _stumpMat)
    this._stump.position.y = 0.17
    this._stump.visible = false

    group.add(this._trunk, this._canopy, this._stump)
    return group
  }

  // ── Chop ──────────────────────────────────────────────────────────────────

  /** Returns true when the tree falls. */
  chop() {
    if (this._state !== 'standing') return false
    this._chopsLeft--

    this._canopy.rotation.z = (Math.random() - 0.5) * 0.18
    setTimeout(() => { if (this._canopy) this._canopy.rotation.z = 0 }, 150)

    if (this._chopsLeft <= 0) {
      this._fell()
      return true
    }
    return false
  }

  _fell() {
    this._state = 'stump'
    this._trunk.visible  = false
    this._canopy.visible = false
    this._stump.visible  = true
    setTimeout(() => this._respawn(), RESPAWN_MS)
  }

  _respawn() {
    this._state      = 'standing'
    this._chopsLeft  = this._rollChops()
    this._trunk.visible  = true
    this._canopy.visible = true
    this._stump.visible  = false
  }

  _rollChops() {
    const { chopsMin, chopsMax } = this.tier ?? { chopsMin: 3, chopsMax: 7 }
    return chopsMin + Math.floor(Math.random() * (chopsMax - chopsMin + 1))
  }
}

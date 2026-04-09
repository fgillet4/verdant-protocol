/**
 * Tree — individual interactable tree entity.
 * States: STANDING → STUMP → (respawn) → STANDING
 * Procedural geometry used immediately; swaps to GLB from assets/models/trees/{id}.glb
 * when available. Chop/fell animations degrade gracefully if GLB lacks named meshes.
 * OWNED BY: world-agent
 */
import * as THREE    from 'three'
import { loadModel } from '../engine/AssetLoader.js'

const RESPAWN_MS = 40_000

// Shared geometry (all tiers reuse, only materials differ)
const _trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6)
const _canopyGeo = new THREE.ConeGeometry(1.0, 2.2, 6)
const _stumpGeo  = new THREE.CylinderGeometry(0.14, 0.18, 0.35, 6)
const _stumpMat  = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 1 })

export class Tree {
  constructor(id, x, z, scale, tierDef) {
    this.id       = id
    this.tier     = tierDef
    this.position = new THREE.Vector3(x, 0, z)
    this.scale    = scale
    this._state   = 'standing'
    this._chopsLeft = this._rollChops()

    // Persistent wrapper — World.js / raycaster hold this reference forever
    this.object = new THREE.Group()
    this.object.position.set(x, 0, z)

    this._buildProcedural(scale, tierDef)

    // Try to swap to GLB; keep procedural if file missing
    loadModel(`/assets/models/trees/${tierDef.id}.glb`).then(model => {
      if (!model) return
      this._clearProcedural()
      model.scale.setScalar(scale)
      model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
      this.object.add(model)
      this._glbModel = model
    })
  }

  get isStanding() { return this._state === 'standing' }

  // ── Build procedural fallback ─────────────────────────────────────────────

  _buildProcedural(scale, tier) {
    const trunkMat  = new THREE.MeshStandardMaterial({ color: tier.trunkColor, roughness: 1 })
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

    this.object.add(this._trunk, this._canopy, this._stump)
  }

  _clearProcedural() {
    this.object.clear()
    this._trunk  = null
    this._canopy = null
    this._stump  = null
  }

  // ── Chop ──────────────────────────────────────────────────────────────────

  chop() {
    if (this._state !== 'standing') return false
    this._chopsLeft--

    if (this._canopy) {
      this._canopy.rotation.z = (Math.random() - 0.5) * 0.18
      setTimeout(() => { if (this._canopy) this._canopy.rotation.z = 0 }, 150)
    } else if (this._glbModel) {
      // Nudge whole GLB model
      this._glbModel.rotation.z = (Math.random() - 0.5) * 0.1
      setTimeout(() => { if (this._glbModel) this._glbModel.rotation.z = 0 }, 150)
    }

    if (this._chopsLeft <= 0) {
      this._fell()
      return true
    }
    return false
  }

  _fell() {
    this._state = 'stump'
    if (this._trunk)  this._trunk.visible  = false
    if (this._canopy) this._canopy.visible = false
    if (this._stump)  this._stump.visible  = true
    if (this._glbModel) this._glbModel.visible = false
    setTimeout(() => this._respawn(), RESPAWN_MS)
  }

  _respawn() {
    this._state     = 'standing'
    this._chopsLeft = this._rollChops()
    if (this._trunk)  this._trunk.visible  = true
    if (this._canopy) this._canopy.visible = true
    if (this._stump)  this._stump.visible  = false
    if (this._glbModel) this._glbModel.visible = true
  }

  _rollChops() {
    const { chopsMin, chopsMax } = this.tier ?? { chopsMin: 3, chopsMax: 7 }
    return chopsMin + Math.floor(Math.random() * (chopsMax - chopsMin + 1))
  }
}

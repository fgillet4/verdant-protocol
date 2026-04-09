/**
 * GatherNode — small interactable plant/fungi cluster.
 * Types: 'herb' | 'fungi'
 * States: AVAILABLE → DEPLETED → (respawn) → AVAILABLE
 * Builds procedurally; swaps to GLB from assets/models/gather/{herb|fungi}.glb.
 * OWNED BY: world-agent
 */
import * as THREE    from 'three'
import { loadModel } from '../engine/AssetLoader.js'

const HERB_COLOR  = 0x7cb342
const FUNGI_COLOR = 0x00e5cc
const FUNGI_EMIT  = 0x00c4aa

export class GatherNode {
  constructor(id, x, z, type) {
    this.id       = id
    this.type     = type
    this.position = new THREE.Vector3(x, 0, z)
    this._available = true

    this.object = new THREE.Group()
    this.object.position.set(x, 0, z)

    this._parts = []
    this._buildProcedural(type)

    loadModel(`/assets/models/gather/${type}.glb`).then(model => {
      if (!model) return
      this.object.clear()
      this._parts = []
      model.traverse(c => { if (c.isMesh) c.castShadow = true })
      this.object.add(model)
      this._glbModel = model
    })
  }

  get isAvailable() { return this._available }

  gather() {
    if (!this._available) return null
    this._available = false
    this._showDepleted()
    setTimeout(() => this._respawn(), this.type === 'herb' ? 20_000 : 25_000)
    return this.type === 'herb' ? 'wildHerbs' : 'fungalMass'
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _buildProcedural(type) {
    if (type === 'herb') {
      this._buildHerb()
    } else {
      this._buildFungi()
    }
  }

  _buildHerb() {
    const mat = new THREE.MeshStandardMaterial({ color: HERB_COLOR, roughness: 0.8, side: THREE.DoubleSide })
    for (let i = 0; i < 4; i++) {
      const leaf  = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), mat)
      const angle = (i / 4) * Math.PI * 2
      leaf.position.set(Math.cos(angle) * 0.1, 0.14, Math.sin(angle) * 0.1)
      leaf.rotation.set(-0.3 + Math.random() * 0.3, angle, 0)
      leaf.castShadow = true
      this._parts.push(leaf)
      this.object.add(leaf)
    }
  }

  _buildFungi() {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xd4b896 })
    const capMat  = new THREE.MeshStandardMaterial({ color: FUNGI_COLOR, emissive: FUNGI_EMIT, emissiveIntensity: 0.6, roughness: 0.4 })
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2
      const r = 0.1 + Math.random() * 0.06
      const s = 0.5 + Math.random() * 0.5
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.18 * s, 5), stemMat)
      stem.position.set(Math.cos(angle) * r, 0.09 * s, Math.sin(angle) * r)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat)
      cap.position.set(Math.cos(angle) * r, 0.18 * s, Math.sin(angle) * r)
      this._parts.push(stem, cap)
      this.object.add(stem, cap)
    }
  }

  // ── State ─────────────────────────────────────────────────────────────────

  _showDepleted() {
    if (this._glbModel) {
      this._glbModel.traverse(c => {
        if (c.isMesh) {
          c.material = c.material.clone()
          c.material.transparent = true
          c.material.opacity = 0.25
        }
      })
      return
    }
    for (const p of this._parts) {
      p.material = p.material.clone()
      p.material.opacity     = 0.25
      p.material.transparent = true
      if (p.material.emissiveIntensity !== undefined) p.material.emissiveIntensity = 0
    }
  }

  _respawn() {
    this._available = true
    if (this._glbModel) {
      this._glbModel.traverse(c => {
        if (c.isMesh) {
          c.material.opacity     = 1
          c.material.transparent = false
        }
      })
      return
    }
    for (const p of this._parts) {
      p.material.opacity     = 1
      p.material.transparent = false
      if (this.type === 'fungi' && p.material.emissiveIntensity !== undefined) {
        p.material.emissiveIntensity = 0.6
      }
    }
  }
}

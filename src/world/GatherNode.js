/**
 * GatherNode — a small interactable plant/fungi cluster in the world.
 * Types: 'herb' (→ wildHerbs) | 'fungi' (→ fungalMass)
 * States: AVAILABLE → DEPLETED → (respawn) → AVAILABLE
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

const HERB_COLOR  = 0x7cb342
const FUNGI_COLOR = 0x00e5cc
const FUNGI_EMIT  = 0x00c4aa

export class GatherNode {
  /**
   * @param {string} id
   * @param {number} x
   * @param {number} z
   * @param {'herb'|'fungi'} type
   */
  constructor(id, x, z, type) {
    this.id       = id
    this.type     = type
    this.position = new THREE.Vector3(x, 0, z)
    this._available = true
    this.object   = this._build(x, z, type)
  }

  get isAvailable() { return this._available }

  /** Returns itemId that was gathered, or null if depleted. */
  gather() {
    if (!this._available) return null
    this._available = false
    this._showDepleted()
    setTimeout(() => this._respawn(), this.type === 'herb' ? 20_000 : 25_000)
    return this.type === 'herb' ? 'wildHerbs' : 'fungalMass'
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build(x, z, type) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    this._parts = []

    if (type === 'herb') {
      this._buildHerb(group)
    } else {
      this._buildFungi(group)
    }
    return group
  }

  _buildHerb(group) {
    const mat = new THREE.MeshStandardMaterial({ color: HERB_COLOR, roughness: 0.8, side: THREE.DoubleSide })
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), mat)
      const angle = (i / 4) * Math.PI * 2
      leaf.position.set(Math.cos(angle) * 0.1, 0.14, Math.sin(angle) * 0.1)
      leaf.rotation.set(-0.3 + Math.random() * 0.3, angle, 0)
      leaf.castShadow = true
      this._parts.push(leaf)
      group.add(leaf)
    }
  }

  _buildFungi(group) {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xd4b896 })
    const capMat  = new THREE.MeshStandardMaterial({
      color: FUNGI_COLOR, emissive: FUNGI_EMIT, emissiveIntensity: 0.6, roughness: 0.4,
    })
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2
      const r     = 0.1 + Math.random() * 0.06
      const s     = 0.5 + Math.random() * 0.5

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.18 * s, 5), stemMat)
      stem.position.set(Math.cos(angle) * r, 0.09 * s, Math.sin(angle) * r)

      const cap  = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), capMat)
      cap.position.set(Math.cos(angle) * r, 0.18 * s, Math.sin(angle) * r)

      this._parts.push(stem, cap)
      group.add(stem, cap)
    }
  }

  // ── State ─────────────────────────────────────────────────────────────────

  _showDepleted() {
    for (const p of this._parts) {
      p.material = p.material.clone()
      p.material.opacity   = 0.25
      p.material.transparent = true
      if (p.material.emissiveIntensity !== undefined) p.material.emissiveIntensity = 0
    }
  }

  _respawn() {
    this._available = true
    for (const p of this._parts) {
      p.material.opacity   = 1
      p.material.transparent = false
      if (this.type === 'fungi' && p.material.emissiveIntensity !== undefined) {
        p.material.emissiveIntensity = 0.6
      }
    }
  }
}

/**
 * OreNode — individual interactable ore vein / rock.
 * States: INTACT → DEPLETED → (respawn) → INTACT
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

// Shared geometries
const _rockGeo  = new THREE.DodecahedronGeometry(0.55, 0)
const _veinGeo  = new THREE.OctahedronGeometry(0.22, 0)
const _dustGeo  = new THREE.DodecahedronGeometry(0.3, 0)

export class OreNode {
  /**
   * @param {string} id
   * @param {number} x
   * @param {number} z
   * @param {number} scale
   * @param {object} tierDef  — from ORE_TIERS in OreNodeDefs.js
   */
  constructor(id, x, z, scale, tierDef) {
    this.id       = id
    this.tier     = tierDef
    this.position = new THREE.Vector3(x, 0, z)
    this.scale    = scale
    this._state   = 'intact'
    this._minesLeft = this._rollMines()

    this.object = this._build(x, z, scale, tierDef)
  }

  get isIntact() { return this._state === 'intact' }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build(x, z, scale, tier) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)

    const rockMat = new THREE.MeshStandardMaterial({
      color: tier.rockColor, roughness: 0.95, metalness: 0.05,
    })
    const veinMat = new THREE.MeshStandardMaterial({
      color: tier.veinColor, roughness: 0.6, metalness: 0.3,
      // Solarite and Heartstone glow
      emissive: (tier.id === 'solarite' || tier.id === 'heartstone') ? tier.veinColor : 0x000000,
      emissiveIntensity: tier.id === 'solarite' ? 0.4 : tier.id === 'heartstone' ? 0.3 : 0,
    })
    const dustMat = new THREE.MeshStandardMaterial({
      color: tier.rockColor, roughness: 1, transparent: true, opacity: 0.6,
    })

    // Main rock body
    this._rock = new THREE.Mesh(_rockGeo, rockMat)
    this._rock.position.y = 0.35 * scale
    this._rock.scale.setScalar(scale)
    this._rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    )
    this._rock.castShadow = true

    // Ore vein embedded in the rock face
    this._vein = new THREE.Mesh(_veinGeo, veinMat)
    this._vein.position.set(0.2 * scale, 0.45 * scale, 0.25 * scale)
    this._vein.scale.setScalar(scale * 0.8)
    this._vein.rotation.set(Math.random(), Math.random(), Math.random())
    this._vein.castShadow = true

    // Depleted rubble (hidden until mined out)
    this._dust = new THREE.Mesh(_dustGeo, dustMat)
    this._dust.position.y = 0.2 * scale
    this._dust.scale.setScalar(scale * 0.55)
    this._dust.rotation.copy(this._rock.rotation)
    this._dust.visible = false

    group.add(this._rock, this._vein, this._dust)
    return group
  }

  // ── Mine ──────────────────────────────────────────────────────────────────

  /** Called by Mining on each successful swing. Returns true when vein depletes. */
  mine() {
    if (this._state !== 'intact') return false
    this._minesLeft--

    // Nudge vein slightly
    this._vein.rotation.x += (Math.random() - 0.5) * 0.3
    setTimeout(() => {
      if (this._vein) this._vein.rotation.x *= 0.85
    }, 120)

    if (this._minesLeft <= 0) {
      this._deplete()
      return true
    }
    return false
  }

  _deplete() {
    this._state = 'depleted'
    this._rock.visible = false
    this._vein.visible = false
    this._dust.visible = true
    setTimeout(() => this._respawn(), this.tier.respawnMs)
  }

  _respawn() {
    this._state     = 'intact'
    this._minesLeft = this._rollMines()
    this._rock.visible = true
    this._vein.visible = true
    this._dust.visible = false
  }

  _rollMines() {
    const { minesMin, minesMax } = this.tier ?? { minesMin: 2, minesMax: 5 }
    return minesMin + Math.floor(Math.random() * (minesMax - minesMin + 1))
  }
}

/**
 * OreNode — individual interactable ore vein / rock.
 * States: INTACT → DEPLETED → (respawn) → INTACT
 * Builds procedurally; swaps to GLB from assets/models/ore/{tierId}.glb when available.
 * OWNED BY: world-agent
 */
import * as THREE    from 'three'
import { loadModel } from '../engine/AssetLoader.js'

const _rockGeo = new THREE.DodecahedronGeometry(0.55, 0)
const _veinGeo = new THREE.OctahedronGeometry(0.22, 0)
const _dustGeo = new THREE.DodecahedronGeometry(0.3, 0)

export class OreNode {
  constructor(id, x, z, scale, tierDef) {
    this.id       = id
    this.tier     = tierDef
    this.position = new THREE.Vector3(x, 0, z)
    this.scale    = scale
    this._state   = 'intact'
    this._minesLeft = this._rollMines()

    this.object = new THREE.Group()
    this.object.position.set(x, 0, z)

    this._buildProcedural(scale, tierDef)

    loadModel(`/assets/models/ore/${tierDef.id}.glb`).then(model => {
      if (!model) return
      this._clearProcedural()
      model.scale.setScalar(scale)
      model.traverse(c => { if (c.isMesh) c.castShadow = true })
      this.object.add(model)
      this._glbModel = model
    })
  }

  get isIntact() { return this._state === 'intact' }

  _buildProcedural(scale, tier) {
    const rockMat = new THREE.MeshStandardMaterial({ color: tier.rockColor, roughness: 0.95, metalness: 0.05 })
    const veinMat = new THREE.MeshStandardMaterial({
      color: tier.veinColor, roughness: 0.6, metalness: 0.3,
      emissive: (tier.id === 'solarite' || tier.id === 'heartstone') ? tier.veinColor : 0x000000,
      emissiveIntensity: tier.id === 'solarite' ? 0.4 : tier.id === 'heartstone' ? 0.3 : 0,
    })
    const dustMat = new THREE.MeshStandardMaterial({ color: tier.rockColor, roughness: 1, transparent: true, opacity: 0.6 })

    this._rock = new THREE.Mesh(_rockGeo, rockMat)
    this._rock.position.y = 0.35 * scale
    this._rock.scale.setScalar(scale)
    this._rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    this._rock.castShadow = true

    this._vein = new THREE.Mesh(_veinGeo, veinMat)
    this._vein.position.set(0.2 * scale, 0.45 * scale, 0.25 * scale)
    this._vein.scale.setScalar(scale * 0.8)
    this._vein.rotation.set(Math.random(), Math.random(), Math.random())
    this._vein.castShadow = true

    this._dust = new THREE.Mesh(_dustGeo, dustMat)
    this._dust.position.y = 0.2 * scale
    this._dust.scale.setScalar(scale * 0.55)
    this._dust.rotation.copy(this._rock.rotation)
    this._dust.visible = false

    this.object.add(this._rock, this._vein, this._dust)
  }

  _clearProcedural() {
    this.object.clear()
    this._rock = null
    this._vein = null
    this._dust = null
  }

  // ── Mine ──────────────────────────────────────────────────────────────────

  mine() {
    if (this._state !== 'intact') return false
    this._minesLeft--

    if (this._vein) {
      this._vein.rotation.x += (Math.random() - 0.5) * 0.3
      setTimeout(() => { if (this._vein) this._vein.rotation.x *= 0.85 }, 120)
    } else if (this._glbModel) {
      this._glbModel.rotation.y += (Math.random() - 0.5) * 0.1
      setTimeout(() => { if (this._glbModel) this._glbModel.rotation.y *= 0.9 }, 120)
    }

    if (this._minesLeft <= 0) {
      this._deplete()
      return true
    }
    return false
  }

  _deplete() {
    this._state = 'depleted'
    if (this._rock) this._rock.visible = false
    if (this._vein) this._vein.visible = false
    if (this._dust) this._dust.visible = true
    if (this._glbModel) this._glbModel.visible = false
    setTimeout(() => this._respawn(), this.tier.respawnMs)
  }

  _respawn() {
    this._state     = 'intact'
    this._minesLeft = this._rollMines()
    if (this._rock) this._rock.visible = true
    if (this._vein) this._vein.visible = true
    if (this._dust) this._dust.visible = false
    if (this._glbModel) this._glbModel.visible = true
  }

  _rollMines() {
    const { minesMin, minesMax } = this.tier ?? { minesMin: 2, minesMax: 5 }
    return minesMin + Math.floor(Math.random() * (minesMax - minesMin + 1))
  }
}

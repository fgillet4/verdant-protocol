/**
 * Structure — a placed construction with a 3D mesh and proximity effect.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

const _uid = (() => { let n = 0; return () => `struct_${n++}` })()

export class Structure {
  /**
   * @param {object} blueprint — from BLUEPRINTS in BlueprintDefs.js
   * @param {THREE.Vector3} position
   */
  constructor(blueprint, position) {
    this.id        = _uid()
    this.blueprint = blueprint
    this.position  = position.clone()
    this.object    = _buildMesh(blueprint.id, position)
    this._regenCd  = 0
  }

  /**
   * @param {number} delta — seconds
   * @param {import('../player/Player.js').Player} player
   */
  update(delta, player) {
    const dist = player.position.distanceTo(this.position)
    if (dist > this.blueprint.effectRadius) return

    switch (this.blueprint.effectType) {
      case 'hp-regen':
        this._regenCd -= delta
        if (this._regenCd <= 0) {
          this._regenCd = 0.6   // one combat tick
          player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + this.blueprint.effectValue)
        }
        break
      case 'attunement-boost':
      case 'nexus':
        // Signal to main.js — handled via bus listen once registered
        // (future: emit each frame, AttunementSystem multiplies recharge rate)
        break
      default: break
    }
  }
}

// ── Mesh builders ─────────────────────────────────────────────────────────────

function _buildMesh(type, pos) {
  const g = new THREE.Group()
  g.position.copy(pos)
  const builders = { campfire, leanTo, barricade, watchtower, solarRelay, rootNexus }
  ;(builders[type] ?? campfire)(g)
  return g
}

function campfire(g) {
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 5), logMat)
    log.position.set(Math.cos(a) * 0.28, 0.35, Math.sin(a) * 0.28)
    log.rotation.z = 0.55
    log.rotation.y = a
    log.castShadow = true
    g.add(log)
  }
  const emberMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, emissive: 0xff4500, emissiveIntensity: 1.3 })
  g.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), emberMat), { position: new THREE.Vector3(0, 0.22, 0) }))
  const light = new THREE.PointLight(0xff5500, 1.2, 6)
  light.position.set(0, 0.5, 0)
  g.add(light)
}

function leanTo(g) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.88 })
  const bark = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.95, side: THREE.DoubleSide })
  for (const [x, z] of [[-0.7,-0.5],[0.7,-0.5],[-0.7,0.5],[0.7,0.5]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.0, 5), wood)
    post.position.set(x, 1.0, z)
    post.castShadow = true
    g.add(post)
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.3), bark)
  roof.position.set(0, 1.8, 0)
  roof.rotation.x = 0.3
  roof.castShadow = true
  g.add(roof)
}

function barricade(g) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.85, metalness: 0.1 })
  for (let i = 0; i < 5; i++) {
    const h = 1.0 + (i % 2) * 0.3
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 6), mat)
    post.position.set((i - 2) * 0.45, h / 2, 0)
    post.castShadow = true
    g.add(post)
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.1), mat)
  rail.position.set(0, 0.9, 0)
  g.add(rail)
}

function watchtower(g) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.7, metalness: 0.4 })
  const wood  = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.88 })
  for (const [x, z] of [[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.5, 5), steel)
    leg.position.set(x, 2.25, z)
    leg.castShadow = true
    g.add(leg)
  }
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), wood)
  platform.position.set(0, 4.2, 0)
  g.add(platform)
  const railing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), steel)
  railing.position.set(0, 4.55, 0.72)
  g.add(railing)
}

function solarRelay(g) {
  const metal = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5, metalness: 0.6 })
  const panel = new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffc107, emissiveIntensity: 0.3, metalness: 0.8 })
  const mast  = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.5, 6), metal)
  mast.position.y = 1.75
  mast.castShadow = true
  g.add(mast)
  for (let i = 0; i < 3; i++) {
    const a   = (i / 3) * Math.PI * 2
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), metal)
    arm.position.set(Math.cos(a) * 0.45, 3.2, Math.sin(a) * 0.45)
    arm.rotation.y = a
    const sp  = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.4), panel)
    sp.position.set(Math.cos(a) * 0.7, 3.3, Math.sin(a) * 0.7)
    sp.rotation.y = a
    g.add(arm, sp)
  }
  const light = new THREE.PointLight(0xffc107, 0.6, 10)
  light.position.set(0, 3.5, 0)
  g.add(light)
}

function rootNexus(g) {
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.95 })
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xce93d8, emissive: 0xba68c8, emissiveIntensity: 0.8, roughness: 0.3,
  })
  for (let i = 0; i < 4; i++) {
    const a    = (i / 4) * Math.PI * 2
    const col  = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 1.8 + Math.random() * 0.6, 5), rootMat)
    col.position.set(Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7)
    col.rotation.z = (Math.random() - 0.5) * 0.4
    col.rotation.x = (Math.random() - 0.5) * 0.2
    col.castShadow = true
    g.add(col)
  }
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat)
  crystal.position.set(0, 1.6, 0)
  g.add(crystal)
  const light = new THREE.PointLight(0xba68c8, 1.0, 12)
  light.position.set(0, 2, 0)
  g.add(light)
}

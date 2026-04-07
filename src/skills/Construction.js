/**
 * Construction — place structures in the world using gathered materials.
 * Placement mode: ghost follows ground cursor; left-click confirms; Escape cancels.
 * OWNED BY: skills-agent
 */
import * as THREE          from 'three'
import { bus }             from '../utils/EventBus.js'
import { BLUEPRINT_MAP }   from '../world/BlueprintDefs.js'
import { Structure }       from '../world/Structure.js'

const MIN_SPACING = 3.0  // minimum distance between placed structures

export class Construction {
  /**
   * @param {import('../player/Player.js').Player}      player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {import('../engine/Engine.js').Engine}      engine
   * @param {THREE.Scene}                               scene
   */
  constructor(player, inventory, engine, scene) {
    this._player    = player
    this._inventory = inventory
    this._engine    = engine
    this._scene     = scene

    /** @type {Map<string, Structure>} */
    this.structures = new Map()

    this._placing   = null   // blueprintId | null
    this._ghost     = null
    this._ghostOk   = false

    const canvas = engine.renderer.domElement
    canvas.addEventListener('pointermove', e => this._onMove(e))
    canvas.addEventListener('pointerdown', e => this._onDown(e), { capture: true })
    window.addEventListener('keydown',     e => { if (e.key === 'Escape') this.cancelPlacement() })

    bus.on('construction:start-placement', ({ blueprintId }) => this._enterPlacement(blueprintId))
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  /** @param {number} delta */
  update(delta) {
    for (const s of this.structures.values()) s.update(delta, this._player)
  }

  // ── Placement mode ────────────────────────────────────────────────────────

  _enterPlacement(blueprintId) {
    this.cancelPlacement()
    const bp = BLUEPRINT_MAP.get(blueprintId)
    if (!bp) return

    this._placing = blueprintId
    this._ghost   = this._buildGhost(bp)
    this._scene.add(this._ghost)
    this._setStatus(`Placing ${bp.name} — click to place, Escape to cancel`)
  }

  _onMove(e) {
    if (!this._placing || !this._ghost) return
    const pos = this._engine.raycastGround(e.clientX, e.clientY)
    if (!pos) { this._ghost.visible = false; return }
    this._ghost.visible = true
    this._ghost.position.set(pos.x, 0, pos.z)
    const tooClose = [...this.structures.values()].some(s => s.position.distanceTo(pos) < MIN_SPACING)
    this._ghostOk  = !tooClose
    const hex = this._ghostOk ? 0x00e676 : 0xff5252
    this._ghost.children.forEach(c => { if (c.material) c.material.color.setHex(hex) })
  }

  _onDown(e) {
    if (!this._placing || e.button !== 0) return
    e.stopPropagation()
    if (!this._ghost?.visible || !this._ghostOk) return
    this._confirmPlacement(this._ghost.position.clone())
  }

  _confirmPlacement(pos) {
    const blueprintId = this._placing
    const bp = BLUEPRINT_MAP.get(blueprintId)
    this.cancelPlacement()

    const level = this._player.stats?.skills?.construction?.level ?? 1
    if (level < bp.level) {
      this._setStatus(`Requires level ${bp.level} Construction.`)
      return
    }

    for (const { itemId, qty } of bp.cost) {
      if (this._inventory.countItem(itemId) < qty) {
        this._setStatus(`Not enough materials to build ${bp.name}.`)
        return
      }
    }

    for (const { itemId, qty } of bp.cost) {
      this._inventory.removeItemsByDefId(itemId, qty)
    }

    const struct = new Structure(bp, pos)
    this._scene.add(struct.object)
    this.structures.set(struct.id, struct)

    bus.emit('skill:award-xp',          { skillId: 'construction', amount: bp.xp })
    bus.emit('construction:built',       { blueprintId, structureId: struct.id, position: pos })
    this._setStatus(`${bp.name} built!`)
  }

  cancelPlacement() {
    if (!this._placing) return
    if (this._ghost) {
      this._scene.remove(this._ghost)
      this._ghost = null
    }
    this._placing = null
    this._ghostOk = false
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _buildGhost(bp) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00e676, transparent: true, opacity: 0.35, depthWrite: false,
    })
    const box    = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 1.4), mat.clone())
    box.position.y = 1.0

    const ringGeo = new THREE.RingGeometry(bp.effectRadius - 0.06, bp.effectRadius, 36)
    ringGeo.rotateX(-Math.PI / 2)
    const ring    = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0x00e676, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
    }))

    const g = new THREE.Group()
    g.add(box, ring)
    return g
  }

  _setStatus(text) {
    const el = document.getElementById('status')
    if (el) {
      el.textContent = text
      clearTimeout(el._conTimer)
      el._conTimer = setTimeout(() => { el.textContent = '' }, 5000)
    }
  }
}

/**
 * SaveSystem — ties each FrankStation account to its own character.
 *
 * Reads fs_token from localStorage, calls FrankStation's /api/verdant/save
 * to load on boot and save periodically + on key events.
 *
 * OWNED BY: save-agent
 */

const API = 'https://frankstation.org/api/verdant'
const AUTOSAVE_INTERVAL_MS = 60_000   // autosave every 60 seconds

export class SaveSystem {
  /**
   * @param {import('../player/Player.js').Player} player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {import('../inventory/Equipment.js').Equipment} equipment
   * @param {import('../utils/EventBus.js').EventBus} bus
   */
  constructor(player, inventory, equipment, bus) {
    this.player    = player
    this.inventory = inventory
    this.equipment = equipment
    this.bus       = bus
    this._token        = localStorage.getItem('fs_token')
    this._dirty        = false
    this._autosaveTimer = null
    this._saveDebounce = null
    this._saving       = false   // prevent overlapping saves
    this.userId        = null
  }

  /** Load character from server. Creates a new one if first visit. */
  async load() {
    if (!this._token) {
      console.warn('[SaveSystem] No fs_token — not logged in, skipping load')
      return false
    }

    try {
      const res = await fetch(`${API}/save`, {
        headers: { Authorization: `Bearer ${this._token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      this.userId = data.player.userId
      this._apply(data)
      console.log(`[SaveSystem] Loaded character for ${data.player.displayName}`)
      this._startAutosave()
      return true
    } catch (err) {
      console.error('[SaveSystem] Load failed:', err)
      return false
    }
  }

  /** Trigger a save immediately. No-ops if not logged in or already saving. */
  async save() {
    if (!this._token || !this.userId) return
    if (this._saving) { this._dirty = true; return }  // re-queue after current save
    this._saving = true
    clearTimeout(this._saveDebounce)
    try {
      const payload = this._snapshot()
      const res = await fetch(`${API}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this._token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      this._dirty = false
    } catch (err) {
      console.error('[SaveSystem] Save failed:', err)
    } finally {
      this._saving = false
      // If something dirtied during our save, schedule another pass
      if (this._dirty) this.markDirty()
    }
  }

  /** Mark as dirty and schedule a save in 5 seconds (debounced). */
  markDirty() {
    this._dirty = true
    clearTimeout(this._saveDebounce)
    this._saveDebounce = setTimeout(() => { if (this._dirty) this.save() }, 5000)
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Apply loaded data onto live game objects. */
  _apply(data) {
    const { player: p, skills, inventory } = data

    // Player stats
    this.player.stats.hp          = p.hp
    this.player.stats.maxHp       = p.maxHp
    this.player.stats.attack      = p.attack
    this.player.stats.defense     = p.defense
    this.player.stats.faction     = p.faction
    this.player.stats.combatStyle = p.combatStyle

    // Position
    this.player.object.position.set(p.posX, 0, p.posZ)

    // Skills
    for (const [id, val] of Object.entries(skills)) {
      if (!this.player.stats.skills[id]) {
        this.player.stats.skills[id] = { xp: 0, level: 1 }
      }
      this.player.stats.skills[id].xp    = val.xp
      this.player.stats.skills[id].level = val.level
    }
    // Notify UI to re-render all skill levels
    this.bus.emit('skills:loaded', {})

    // Inventory — rebuild from saved state
    // Clear existing items first
    for (const item of this.inventory.slots.filter(Boolean)) {
      this.inventory.removeItem(item.instanceId)
    }
    for (const saved of inventory) {
      if (saved.slot) continue  // equipped items handled below
      if (window._vp?._createItem) {
        const item = window._vp._createItem(saved.defId, saved.quantity)
        if (item) this.inventory.addItem(item)
      }
    }

    this.bus.emit('inventory:changed', {})
    this.bus.emit('hud:refresh', {})
  }

  /** Snapshot current game state into a plain object for the API. */
  _snapshot() {
    const p = this.player
    const pos = p.object.position

    const skills = {}
    for (const [id, val] of Object.entries(p.stats.skills)) {
      skills[id] = { xp: val.xp, level: val.level }
    }

    const inventory = []
    for (const item of this.inventory.slots.filter(Boolean)) {
      inventory.push({
        defId:    item.defId,
        quantity: item.quantity ?? 1,
        slot:     null,
      })
    }
    // Equipped items
    for (const [slot, item] of Object.entries(this.equipment.slots)) {
      if (item) {
        inventory.push({ defId: item.defId, quantity: 1, slot })
      }
    }

    return {
      player: {
        hp:          p.stats.hp,
        maxHp:       p.stats.maxHp,
        attack:      p.stats.attack,
        defense:     p.stats.defense,
        faction:     p.stats.faction ?? null,
        combatStyle: p.stats.combatStyle,
        posX:        pos.x,
        posZ:        pos.z,
      },
      skills,
      inventory,
    }
  }

  _startAutosave() {
    this._autosaveTimer = setInterval(async () => {
      if (this._dirty) await this.save()
    }, AUTOSAVE_INTERVAL_MS)
  }
}

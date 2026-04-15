/**
 * Chemistry — brewing, compounds, extracts, and elixirs.
 * Listens for chemistry:craft { recipeId } and item:use { instanceId, defId }.
 * OWNED BY: skills-agent
 */
import { bus }             from '../utils/EventBus.js'
import { createItem }      from '../inventory/ItemDefs.js'
import { CHEM_RECIPE_MAP } from '../world/ChemistryDefs.js'

const BENCH_REACH = 4.5

/** Direct consumable effects. Return a status string. */
const EFFECTS = {
  healthSalve: (player) => {
    const gained = Math.min(player.stats.maxHp - player.stats.hp, 30)
    player.stats.hp += gained
    return `You drink the salve. +${gained} HP.`
  },
  attunementTincture: (player) => {
    bus.emit('attunement:restore', { amount: 30 })
    return 'You drink the tincture. Attunement restored.'
  },
  fermentedBrew: () => {
    bus.emit('player:xp-buff', { factor: 1.15, durationMs: 300_000 })
    return 'Fermented brew. +15% XP for 5 minutes.'
  },
  corrosivePaste: () => {
    bus.emit('player:weapon-coat', { type: 'corrosive', bonus: 15, charges: 8 })
    return 'Weapon coated. +15 dmg for 8 hits.'
  },
  sporeGrenade: () => {
    bus.emit('combat:aoe-effect', { type: 'spore', radius: 4, durationMs: 5_000 })
    return 'Spore grenade thrown!'
  },
  droneAcid: () => {
    bus.emit('player:weapon-coat', { type: 'acid', bonus: 25, charges: 10, targetType: 'drone' })
    return 'Weapon coated with drone acid. +25 vs drones, 10 hits.'
  },
  solariteAccelerant: () => {
    bus.emit('player:xp-buff', { factor: 1.5, durationMs: 600_000 })
    return 'Solarite accelerant. +50% XP for 10 minutes.'
  },
  heartstoneElixir: (player) => {
    const gained = Math.min(player.stats.maxHp - player.stats.hp, 80)
    player.stats.hp += gained
    bus.emit('attunement:restore', { amount: 60 })
    return `Heartstone elixir. +${gained} HP, +60 attunement.`
  },
}

export class Chemistry {
  /**
   * @param {import('../player/Player.js').Player} player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {Map<string, import('../world/ChemBench.js').ChemBench>} benches
   */
  constructor(player, inventory, benches) {
    this._player    = player
    this._inventory = inventory
    this._benches   = benches
    this._busy      = false
    this._activeBench = null

    bus.on('ui:open-chemistry', ({ benchId }) => {
      this._activeBench = this._benches.get(benchId) ?? null
    })
    bus.on('chemistry:craft', ({ recipeId }) => this._craft(recipeId))
    bus.on('item:use', ({ instanceId, defId }) => this._useItem(instanceId, defId))
  }

  // ── Craft ─────────────────────────────────────────────────────────────────

  _craft(recipeId) {
    if (this._busy) {
      bus.emit('chemistry:craft-failed', { reason: 'Already brewing.' })
      return
    }
    const recipe = CHEM_RECIPE_MAP.get(recipeId)
    if (!recipe) return

    const level = this._player.stats?.skills?.chemistry?.level ?? 1
    if (level < recipe.level) {
      bus.emit('chemistry:craft-failed', { reason: `Requires level ${recipe.level} Chemistry.` })
      return
    }

    if (this._activeBench) {
      const dist = this._player.position.distanceTo(this._activeBench.position)
      if (dist > BENCH_REACH) {
        bus.emit('chemistry:craft-failed', { reason: 'Move closer to the bench.' })
        return
      }
    }

    for (const { itemId, qty } of recipe.inputs) {
      if (this._inventory.countItem(itemId) < qty) {
        bus.emit('chemistry:craft-failed', { reason: `Need ${qty}× ${itemId}.` })
        return
      }
    }

    for (const { itemId, qty } of recipe.inputs) {
      this._inventory.removeItemsByDefId(itemId, qty)
    }

    this._busy = true

    setTimeout(() => {
      const output = createItem(recipe.outputId, 1)
      const added  = this._inventory.addItem(output)
      if (added) bus.emit('inventory:item-received', { item: output })
      bus.emit('skill:award-xp', { skillId: 'chemistry', amount: Math.floor(recipe.xp) })
      bus.emit('chemistry:craft-complete', { recipeId, outputItem: output })
      this._busy = false
    }, recipe.brewMs)
  }

  // ── Use consumable ────────────────────────────────────────────────────────

  _useItem(instanceId, defId) {
    const fn = EFFECTS[defId]
    if (!fn) return
    const removed = this._inventory.removeItem(instanceId)
    if (!removed) return
    const msg = fn(this._player)
    if (msg) this._setStatus(msg)
  }

  _setStatus(text) {
    bus.emit('ui:examine', { text })
  }
}

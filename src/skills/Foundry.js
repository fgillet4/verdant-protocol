/**
 * Foundry — smelting skill. Consumes ores/bars → refined bars/ingots.
 * Listens for foundry:smelt { recipeId }.
 * OWNED BY: skills-agent
 */
import { bus }              from '../utils/EventBus.js'
import { createItem }       from '../inventory/ItemDefs.js'
import { SMELT_RECIPE_MAP } from '../world/FoundryDefs.js'

const FOUNDRY_REACH = 4.5  // world units

export class Foundry {
  /**
   * @param {import('../player/Player.js').Player} player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {Map<string, import('../world/FoundryStation.js').FoundryStation>} stations
   */
  constructor(player, inventory, stations) {
    this._player    = player
    this._inventory = inventory
    this._stations  = stations
    this._busy      = false
    this._activeStation = null

    bus.on('ui:open-foundry', ({ stationId }) => {
      this._activeStation = this._stations.get(stationId) ?? null
    })

    bus.on('foundry:smelt', ({ recipeId, runs }) => this._smelt(recipeId, runs ?? 1))
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _smelt(recipeId, runs = 1) {
    if (this._busy) {
      bus.emit('foundry:smelt-failed', { reason: 'Already smelting.' })
      return
    }

    const recipe = SMELT_RECIPE_MAP.get(recipeId)
    if (!recipe) return

    const level = this._player.stats?.skills?.foundry?.level ?? 1
    if (level < recipe.level) {
      bus.emit('foundry:smelt-failed', { reason: `Requires level ${recipe.level} Foundry.` })
      return
    }

    if (this._activeStation) {
      const dist = this._player.position.distanceTo(this._activeStation.position)
      if (dist > FOUNDRY_REACH) {
        bus.emit('foundry:smelt-failed', { reason: 'Move closer to the forge.' })
        return
      }
    }

    // Clamp runs to what inventory can support
    for (const { itemId, qty } of recipe.inputs) {
      const maxRuns = Math.floor(this._inventory.countItem(itemId) / qty)
      if (maxRuns < 1) {
        bus.emit('foundry:smelt-failed', { reason: `Need ${qty}× ${itemId}.` })
        return
      }
      runs = Math.min(runs, maxRuns)
    }

    // Consume all inputs upfront
    for (const { itemId, qty } of recipe.inputs) {
      this._inventory.removeItemsByDefId(itemId, qty * runs)
    }

    this._busy = true
    bus.emit('foundry:smelt-started', { recipeId: recipe.id, runs })
    this._smeltNext(recipe, runs)
  }

  /** Process one bar from the queue, then chain the next if any remain. */
  _smeltNext(recipe, remaining) {
    setTimeout(() => {
      try {
        const output = createItem(recipe.outputId, 1)
        const added  = this._inventory.addItem(output)
        if (added) bus.emit('inventory:item-received', { item: output })
        bus.emit('skill:award-xp', { skillId: 'foundry', amount: Math.floor(recipe.xp) })

        const left = remaining - 1
        bus.emit('foundry:smelt-complete', { recipeId: recipe.id, remaining: left })

        if (left > 0) {
          this._smeltNext(recipe, left)
        } else {
          this._busy = false
        }
      } catch (err) {
        console.error('[Foundry] smeltNext error:', err)
        this._busy = false
        bus.emit('foundry:smelt-failed', { reason: 'Smelting error.' })
      }
    }, recipe.smeltMs)
  }
}

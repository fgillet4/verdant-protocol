/**
 * Technology — fabrication skill. Crafts gadgets, devices, and systems from
 * bars and salvage at a Tech Bench. Also handles item:use for tech devices.
 * OWNED BY: skills-agent
 */
import { bus }            from '../utils/EventBus.js'
import { createItem }     from '../inventory/ItemDefs.js'
import { TECH_RECIPE_MAP } from '../world/TechDefs.js'

const BENCH_REACH = 4.5

/** Consumable/deployable effects keyed by defId */
const TECH_EFFECTS = {
  oreScanner: () => {
    bus.emit('tech:ore-scan', { durationMs: 60_000 })
    return 'Ore Scanner active — nearby veins revealed for 60 seconds.'
  },
  signalJammer: () => {
    bus.emit('tech:signal-jam', { radius: 12, durationMs: 30_000 })
    return 'Signal Jammer active — drones ignore you for 30 seconds.'
  },
  proxMine: () => {
    bus.emit('tech:place-mine', { damage: 45, radius: 4 })
    return 'Proximity mine armed. Approach an enemy to place it.'
  },
  solarCapacitor: () => {
    bus.emit('attunement:restore', { amount: 50 })
    return 'Solar Capacitor discharged. +50 attunement.'
  },
  sentryTurret: () => {
    bus.emit('tech:deploy-turret', { range: 10, shots: 20 })
    return 'Sentry Turret deploying…'
  },
  recodedDroneCore: (player) => {
    bus.emit('tech:activate-companion', { type: 'drone' })
    return 'Drone companion activated.'
  },
  gridweaveNode: () => {
    bus.emit('tech:place-gridweave', { attunementBoost: 0.1 })
    return 'Gridweave Node placed. Zone attunement recharge boosted.'
  },
}

export class Technology {
  /**
   * @param {import('../player/Player.js').Player}          player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {Map<string, import('../world/TechBench.js').TechBench>} benches
   */
  constructor(player, inventory, benches) {
    this._player    = player
    this._inventory = inventory
    this._benches   = benches
    this._busy      = false
    this._activeBench = null

    bus.on('ui:open-tech',    ({ benchId }) => {
      this._activeBench = this._benches.get(benchId) ?? null
    })
    bus.on('tech:fabricate',  ({ recipeId, runs }) => this._fabricate(recipeId, runs ?? 1))
    bus.on('item:use',        ({ instanceId, defId }) => this._useItem(instanceId, defId))
  }

  // ── Fabricate ─────────────────────────────────────────────────────────────

  _fabricate(recipeId, runs = 1) {
    if (this._busy) {
      bus.emit('tech:fabricate-failed', { reason: 'Already fabricating.' })
      return
    }
    const recipe = TECH_RECIPE_MAP.get(recipeId)
    if (!recipe) return

    const level = this._player.stats?.skills?.technology?.level ?? 1
    if (level < recipe.level) {
      bus.emit('tech:fabricate-failed', { reason: `Requires level ${recipe.level} Technology.` })
      return
    }

    if (this._activeBench) {
      const dist = this._player.position.distanceTo(this._activeBench.position)
      if (dist > BENCH_REACH) {
        bus.emit('tech:fabricate-failed', { reason: 'Move closer to the bench.' })
        return
      }
    }

    // Verify we have enough ingredients for all runs
    for (const { itemId, qty } of recipe.inputs) {
      if (this._inventory.countItem(itemId) < qty * runs) {
        runs = Math.floor(this._inventory.countItem(itemId) / qty)
        if (runs < 1) {
          bus.emit('tech:fabricate-failed', { reason: `Need ${qty}× ${itemId}.` })
          return
        }
      }
    }

    // Consume all ingredients upfront
    for (const { itemId, qty } of recipe.inputs) {
      this._inventory.removeItemsByDefId(itemId, qty * runs)
    }

    this._busy = true

    setTimeout(() => {
      const outQty = (recipe.qty ?? 1) * runs
      for (let i = 0; i < outQty; i++) {
        const output = createItem(recipe.outputId, 1)
        const added  = this._inventory.addItem(output)
        if (added) bus.emit('inventory:item-received', { item: output })
      }
      bus.emit('skill:award-xp',         { skillId: 'technology', amount: Math.floor(recipe.xp) * runs })
      bus.emit('tech:fabricate-complete', { recipeId })
      this._busy = false
    }, recipe.fabricateMs * runs)
  }

  // ── Use tech item ─────────────────────────────────────────────────────────

  _useItem(instanceId, defId) {
    const fn = TECH_EFFECTS[defId]
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

import { bus }          from '../utils/EventBus.js'
import { ATTUNEMENTS }  from './Attunements.js'
import { COMBAT_TICK_MS } from '../combat/CombatManager.js'

const MAX_POINTS  = 100
const MAX_ACTIVE  = 3

/** Points/sec gained per 1 point of biome health (linear scale) */
const RECHARGE_RATE = 0.12   // 100-health biome → 12 pts/sec
const ECOLOGY_XP_RATE    = 0.4  // XP/sec while in healthy biome (health ≥ 50)
const ECOLOGY_FLUSH_SECS = 5    // emit accumulated ecology XP as one batch every N seconds

/**
 * AttunementSystem — manages attunement points and active effects.
 * Points drain while effects are active, recharge in healthy biomes.
 *
 * CombatManager reads this via:
 *   getDamageMultiplier()   — ≥1.0 multiplier on outgoing damage
 *   getDefenseBonus(base)   — flat addition to defense
 *   getTickMs()             — effective tick duration in ms
 *   getHpRegenPerTick()     — HP restored each tick
 *   getOnHitDoT()           — { damage, ticks } | null
 *   getEchoChance()         — 0-1 double-hit chance
 *   isRevealingHp()         — boolean
 *
 * OWNED BY: attunement-agent
 */
export class AttunementSystem {
  /**
   * @param {object} player — entity with stats.skills for Ecology XP
   * @param {import('../world/BiomeState.js').BiomeState} biomeState
   */
  constructor(player, biomeState) {
    this._player    = player
    this._biome     = biomeState
    this._points    = MAX_POINTS   // start full
    this._active    = new Set()    // Set<string> attunement ids
    this._lastBiomeHealth = 0
    this._ecologyAccum  = 0        // XP banked until next flush
    this._ecologyTimer  = 0        // seconds since last flush

    // A key opens the selection panel (handled in AttunementBar)
  }

  // ── Public API ──────────────────────────────────────────────────────────

  get points()    { return this._points }
  get maxPoints() { return MAX_POINTS }

  /** @returns {Set<string>} */
  get active()    { return this._active }

  /**
   * Restore attunement points (e.g. from a Chemistry tincture).
   * @param {number} amount
   */
  restore(amount) {
    this._points = Math.min(MAX_POINTS, this._points + amount)
    bus.emit('attunement:changed', { points: this._points })
  }

  /**
   * Toggle an attunement on/off.
   * @param {string} id
   * @returns {'activated'|'deactivated'|'full'|'unknown'}
   */
  toggle(id) {
    if (!ATTUNEMENTS[id]) return 'unknown'

    if (this._active.has(id)) {
      this._active.delete(id)
      bus.emit('attunement:changed', { id, active: false, points: this._points })
      return 'deactivated'
    }

    if (this._active.size >= MAX_ACTIVE) return 'full'
    if (this._points <= 0)              return 'full'

    this._active.add(id)
    bus.emit('attunement:changed', { id, active: true, points: this._points })
    return 'activated'
  }

  isActive(id) { return this._active.has(id) }

  // ── Getters for CombatManager ──────────────────────────────────────────

  getDamageMultiplier() {
    let mult = 1.0
    for (const id of this._active) {
      mult *= ATTUNEMENTS[id].damageMultiplier ?? 1.0
    }
    return mult
  }

  /** @param {number} baseDefense */
  getDefenseBonus(baseDefense) {
    let bonus = 0
    for (const id of this._active) {
      bonus += (ATTUNEMENTS[id].defenseBonus ?? 0) * baseDefense
    }
    return Math.floor(bonus)
  }

  getTickMs() {
    let reduction = 0
    for (const id of this._active) {
      reduction += ATTUNEMENTS[id].tickReduction ?? 0
    }
    return Math.max(200, COMBAT_TICK_MS - reduction)
  }

  getHpRegenPerTick() {
    let regen = 0
    for (const id of this._active) {
      regen += ATTUNEMENTS[id].hpRegenPerTick ?? 0
    }
    return regen
  }

  /** @returns {{ damage: number, ticks: number } | null} */
  getOnHitDoT() {
    for (const id of this._active) {
      const dot = ATTUNEMENTS[id].onHitDoT
      if (dot) return dot
    }
    return null
  }

  getEchoChance() {
    let chance = 0
    for (const id of this._active) {
      chance = Math.max(chance, ATTUNEMENTS[id].echoChance ?? 0)
    }
    return chance
  }

  isRevealingHp() {
    for (const id of this._active) {
      if (ATTUNEMENTS[id].revealHp) return true
    }
    return false
  }

  // ── Update (called from GameLoop each frame) ───────────────────────────

  /**
   * @param {number} delta — seconds
   * @param {{ x: number, z: number }} playerPos — world position
   */
  update(delta, playerPos) {
    const biomeHealth = this._biome.healthAt(playerPos)
    this._lastBiomeHealth = biomeHealth

    // Drain from active attunements
    let totalDrain = 0
    for (const id of this._active) {
      totalDrain += ATTUNEMENTS[id].drainRate
    }

    if (totalDrain > 0) {
      this._points = Math.max(0, this._points - totalDrain * delta)

      // Auto-deactivate all if points hit 0
      if (this._points <= 0) {
        const deactivated = [...this._active]
        this._active.clear()
        for (const id of deactivated) {
          bus.emit('attunement:changed', { id, active: false, points: 0 })
        }
        bus.emit('attunement:depleted')
      }
    } else if (biomeHealth > 0) {
      // Recharge when not using attunements and in a living biome
      const rechargeRate = biomeHealth * RECHARGE_RATE
      this._points = Math.min(MAX_POINTS, this._points + rechargeRate * delta)
    }

    // Ecology XP — accumulate every frame, flush as one batch every ECOLOGY_FLUSH_SECS
    if (biomeHealth >= 50 && this._player?.stats?.skills?.ecology) {
      this._ecologyAccum += ECOLOGY_XP_RATE * delta * (biomeHealth / 100)
      this._ecologyTimer += delta
      if (this._ecologyTimer >= ECOLOGY_FLUSH_SECS) {
        bus.emit('skill:award-xp', { skillId: 'ecology', amount: this._ecologyAccum })
        this._ecologyAccum = 0
        this._ecologyTimer = 0
      }
    } else {
      this._ecologyTimer = 0  // reset timer when out of healthy biome
    }

    bus.emit('attunement:update', { points: this._points, biomeHealth })
  }
}

/**
 * Ability definitions — special moves with cooldowns.
 * Each ability is activated manually (future: keybind / action bar).
 * OWNED BY: combat-agent
 */
export const ABILITIES = {
  crushingBlow: {
    id: 'crushingBlow',
    name: 'Crushing Blow',
    style: 'biomech',
    cooldownMs: 6000,
    damageMultiplier: 2.2,
    description: 'A powerful melee strike dealing 220% damage.',
  },
  sporeBurst: {
    id: 'sporeBurst',
    name: 'Spore Burst',
    style: 'mycelial',
    cooldownMs: 8000,
    damageMultiplier: 1.5,
    dotDamage: 5,
    dotTicks: 3,
    description: 'Releases a spore cloud — 150% damage + 3 ticks of poison.',
  },
  solarFlare: {
    id: 'solarFlare',
    name: 'Solar Flare',
    style: 'solarcasting',
    cooldownMs: 7000,
    damageMultiplier: 1.8,
    description: 'An electromagnetic surge dealing 180% damage.',
  },
  piercingShot: {
    id: 'piercingShot',
    name: 'Piercing Shot',
    style: 'marksmanship',
    cooldownMs: 5000,
    damageMultiplier: 1.6,
    ignoresDefense: true,
    description: 'A precise shot ignoring all defense.',
  },
}

/**
 * Track cooldowns for a single entity.
 */
export class AbilityCooldowns {
  constructor() {
    /** @type {Map<string, number>} abilityId → timestamp when ready */
    this._ready = new Map()
  }

  isReady(abilityId) {
    return Date.now() >= (this._ready.get(abilityId) ?? 0)
  }

  use(abilityId) {
    const ability = ABILITIES[abilityId]
    if (!ability) return false
    if (!this.isReady(abilityId)) return false
    this._ready.set(abilityId, Date.now() + ability.cooldownMs)
    return true
  }

  /** @returns {number} ms remaining, 0 if ready */
  remaining(abilityId) {
    return Math.max(0, (this._ready.get(abilityId) ?? 0) - Date.now())
  }
}

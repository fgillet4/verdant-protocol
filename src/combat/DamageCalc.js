/**
 * OSRS-style probability damage formula.
 *
 * Every hit:
 *   1. Roll attack vs defense (accuracy check) — miss = 0 damage
 *   2. If hit, roll 0..maxHit
 *   3. Apply combat triangle modifier
 *
 * Max hit and accuracy both scale with character level AND equipment bonuses,
 * so gear upgrades have a meaningful impact at every level.
 *
 * Scaling note: maxHit divides by 128 (vs OSRS's 640) so numbers are
 * gameplay-sized for our drone HP values.
 */

const TRIANGLE = {
  biomech:      { mycelial: 1.25, solarcasting: 0.75, biomech: 1.0, marksmanship: 1.0 },
  mycelial:     { solarcasting: 1.25, biomech: 0.75, mycelial: 1.0, marksmanship: 1.0 },
  solarcasting: { biomech: 1.25, mycelial: 0.75, solarcasting: 1.0, marksmanship: 1.0 },
  marksmanship: { biomech: 1.0, mycelial: 1.0, solarcasting: 1.0, marksmanship: 1.0 },
}

export class DamageCalc {
  /**
   * Roll one auto-attack hit.
   *
   * Entities must have:
   *   .stats.attack   {number}
   *   .stats.defense  {number}
   *   .stats.combatStyle {string}
   *
   * Optionally:
   *   .equipment.getBonuses() → { attackBonus, strengthBonus, defenseBonus }
   *   .equipment.weaponStyle  → string  (overrides stats.combatStyle)
   *
   * @param {object} attacker
   * @param {object} defender
   * @returns {number} damage dealt (0 = miss)
   */
  /**
   * @param {object} attacker
   * @param {object} defender
   * @param {{ ignoreDefense?: boolean, damageMultiplier?: number }} [opts]
   * @returns {number}
   */
  static roll(attacker, defender, opts = {}) {
    const atkLvl  = attacker.stats.attack  ?? 1
    const defLvl  = defender.stats.defense ?? 1

    const atkBon  = attacker.equipment?.getBonuses() ?? { attackBonus: 0, strengthBonus: 0 }
    const defBon  = defender.equipment?.getBonuses() ?? { defenseBonus: 0 }

    const atkStyle = attacker.equipment?.weaponStyle
                  ?? attacker.stats.combatStyle
                  ?? 'biomech'
    const defStyle = defender.stats.combatStyle ?? 'biomech'

    // ── Accuracy check ──────────────────────────────────────────────────
    const maxAtkRoll = (atkLvl + 8) * (atkBon.attackBonus + 64)
    const maxDefRoll = opts.ignoreDefense ? 0 : (defLvl + 8) * (defBon.defenseBonus + 64)

    const atkRoll = Math.floor(Math.random() * (maxAtkRoll + 1))
    const defRoll = Math.floor(Math.random() * (maxDefRoll + 1))

    if (atkRoll <= defRoll) return 0   // miss / blocked

    // ── Damage roll ─────────────────────────────────────────────────────
    const maxHit = Math.max(1, Math.floor(0.5 + atkLvl * (atkBon.strengthBonus + 64) / 128))
    const raw    = Math.floor(Math.random() * (maxHit + 1))

    // ── Combat triangle ─────────────────────────────────────────────────
    const mod = TRIANGLE[atkStyle]?.[defStyle] ?? 1.0

    const base = Math.max(0, Math.floor(raw * mod))
    return opts.damageMultiplier ? Math.floor(base * opts.damageMultiplier) : base
  }

  /**
   * Hit-chance as a 0–1 probability (used by tooltips / UI, not the roll itself).
   * @param {object} attacker
   * @param {object} defender
   * @returns {number}
   */
  static hitChance(attacker, defender) {
    const atkLvl = attacker.stats.attack  ?? 1
    const defLvl = defender.stats.defense ?? 1
    const atkBon = attacker.equipment?.getBonuses() ?? { attackBonus: 0 }
    const defBon = defender.equipment?.getBonuses() ?? { defenseBonus: 0 }

    const A = (atkLvl + 8) * (atkBon.attackBonus + 64)
    const D = (defLvl + 8) * (defBon.defenseBonus + 64)

    // OSRS exact formula
    return A > D
      ? 1 - (D + 2) / (2 * (A + 1))
      : A / (2 * (D + 1))
  }

  /**
   * Max hit value for display purposes.
   * @param {object} attacker
   * @returns {number}
   */
  static maxHit(attacker) {
    const atkLvl = attacker.stats.attack ?? 1
    const strBon = attacker.equipment?.getBonuses()?.strengthBonus ?? 0
    return Math.max(1, Math.floor(0.5 + atkLvl * (strBon + 64) / 128))
  }
}

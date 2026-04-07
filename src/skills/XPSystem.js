import { bus } from '../utils/EventBus.js'
import { SKILLS, levelForXP } from './SkillRegistry.js'

// How much each level of a stat-linked skill affects the stat
const BIOMECH_ATTACK_PER_LEVEL    = 1    // +1 attack per biomech level
const TENACITY_DEFENSE_PER_LEVEL  = 1    // +1 defense per tenacity level
const VITALITY_HP_PER_LEVEL       = 5    // +5 maxHp per vitality level
const BASE_HP                     = 100

// XP multipliers
const XP_ATTACK_PER_DAMAGE  = 4     // XP in attack skill per damage dealt
const XP_VITALITY_PER_HIT   = 1.33  // XP in vitality per damage dealt
const XP_TENACITY_PER_HIT   = 1.33  // XP in tenacity per damage taken
const XP_KILL_BONUS         = 50    // flat bonus on kill in active style
const XP_VITALITY_KILL      = 25    // flat vitality bonus on kill

/**
 * XPSystem — grants XP from combat events and handles level-ups.
 * Subscribes to EventBus; call no external update loop needed.
 * OWNED BY: skills-agent
 */
export class XPSystem {
  /**
   * @param {import('../player/Player.js').Player} player
   */
  constructor(player) {
    this.player = player

    // Ensure all universal skills are initialized on the player
    for (const [id, def] of Object.entries(SKILLS)) {
      if (def.faction) continue  // faction skills start locked
      if (!player.stats.skills[id]) {
        player.stats.skills[id] = { xp: 0, level: 1 }
      }
    }

    // ── XP from hit dealt / received ────────────────────────────────────
    bus.on('combat:tick', ({ attackerId, targetId, damage, type }) => {
      if (damage === 0) return

      if (attackerId === 'player') {
        // XP in the combat style used
        const skillId = this._styleToSkill(type)
        this.gainXP(skillId, damage * XP_ATTACK_PER_DAMAGE)
        this.gainXP('vitality', damage * XP_VITALITY_PER_HIT)
      }

      if (targetId === 'player') {
        this.gainXP('tenacity', damage * XP_TENACITY_PER_HIT)
      }
    })

    // ── Passive XP (e.g. Ecology from biome time) ───────────────────────
    bus.on('skill:award-xp', ({ skillId, amount }) => {
      if (!player.stats.skills[skillId]) {
        player.stats.skills[skillId] = { xp: 0, level: 1 }
      }
      this.gainXP(skillId, amount)
    })

    // ── Bonus XP on kill ────────────────────────────────────────────────
    bus.on('combat:death', ({ entityId }) => {
      if (entityId === 'player') return
      const style = player.stats.combatStyle ?? 'biomech'
      this.gainXP(this._styleToSkill(style), XP_KILL_BONUS)
      this.gainXP('vitality', XP_VITALITY_KILL)
    })
  }

  /**
   * Add XP to a skill. Handles level-up side-effects.
   * @param {string} skillId
   * @param {number} amount — raw XP (will be floored)
   */
  gainXP(skillId, amount) {
    const skill = this.player.stats.skills[skillId]
    if (!skill) return

    const floored  = Math.max(1, Math.floor(amount))
    const oldLevel = skill.level

    skill.xp   += floored
    skill.level = levelForXP(skill.xp)

    bus.emit('skill:xp-gained', {
      skillId,
      amount: floored,
      newTotal: skill.xp,
      newLevel: skill.level,
      levelUp: skill.level > oldLevel,
    })

    if (skill.level > oldLevel) {
      this._applyLevelUp(skillId, skill.level)
      bus.emit('skill:level-up', { skillId, newLevel: skill.level })
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _styleToSkill(type) {
    const map = { biomech: 'biomech', mycelial: 'mycelial', solarcasting: 'solarcasting', marksmanship: 'marksmanship' }
    return map[type] ?? 'biomech'
  }

  /** Apply stat bonuses on level-up. */
  _applyLevelUp(skillId, newLevel) {
    const s = this.player.stats

    if (skillId === 'biomech') {
      s.attack = 20 + (newLevel - 1) * BIOMECH_ATTACK_PER_LEVEL
    }
    if (skillId === 'tenacity') {
      s.defense = 15 + (newLevel - 1) * TENACITY_DEFENSE_PER_LEVEL
    }
    if (skillId === 'vitality') {
      const newMax = BASE_HP + (newLevel - 1) * VITALITY_HP_PER_LEVEL
      s.maxHp = newMax
      // Heal a portion on level-up (feels good)
      s.hp = Math.min(s.hp + 10, newMax)
    }
  }
}

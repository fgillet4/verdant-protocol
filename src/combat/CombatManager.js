import { bus } from '../utils/EventBus.js'
import { DamageCalc } from './DamageCalc.js'

export const COMBAT_TICK_MS = 600

/**
 * CombatManager — owns the 600ms combat tick (OSRS-style).
 * Entities register with it. Combat starts via events or direct API.
 * Optional attunementSystem modifies tick speed, damage, regen, DoTs, echo.
 * OWNED BY: combat-agent
 */
export class CombatManager {
  /** @param {import('../attunement/AttunementSystem.js').AttunementSystem} [attunementSystem] */
  constructor(attunementSystem = null) {
    this._attu = attunementSystem
    /** @type {Map<string, object>} id → entity */
    this._entities = new Map()

    /**
     * Active attack pairs. Each pair is one direction:
     * { attackerId, defenderId }
     * Mutual combat = two entries (A→B and B→A).
     * @type {Array<{attackerId: string, defenderId: string}>}
     */
    this._pairs = []

    /** DoT effects: { entityId, damage, ticksRemaining } */
    this._dots = []

    this._tickAccum = 0

    // Player clicks an enemy → start mutual combat
    bus.on('player:attack-target', ({ targetId }) => {
      if (this._entities.has('player') && this._entities.has(targetId)) {
        this.startCombat('player', targetId)
      }
    })

    // Enemy aggroes the player → start mutual combat
    bus.on('enemy:engage', ({ enemyId }) => {
      if (this._entities.has('player') && this._entities.has(enemyId)) {
        this.startCombat(enemyId, 'player')
      }
    })

    // Remove dead entities from all pairs
    bus.on('combat:death', ({ entityId }) => {
      this._removeFromAllPairs(entityId)
    })
  }

  /** @param {string} id @param {object} entity — must have { stats: { hp, maxHp, attack, defense, combatStyle } } */
  registerEntity(id, entity) {
    this._entities.set(id, entity)
  }

  unregisterEntity(id) {
    this._entities.delete(id)
    this._removeFromAllPairs(id)
  }

  /**
   * Start mutual combat between two entities.
   * Safe to call multiple times — won't duplicate pairs.
   */
  startCombat(idA, idB) {
    this._addPair(idA, idB)
    this._addPair(idB, idA)
  }

  stopCombat(idA, idB) {
    this._pairs = this._pairs.filter(p =>
      !((p.attackerId === idA && p.defenderId === idB) ||
        (p.attackerId === idB && p.defenderId === idA))
    )
  }

  /**
   * Remove only one direction of an attack pair.
   * Used by Marksmanship to take over player's outgoing damage.
   * @param {string} attackerId
   * @param {string} defenderId
   */
  removeAttackPair(attackerId, defenderId) {
    this._pairs = this._pairs.filter(
      p => !(p.attackerId === attackerId && p.defenderId === defenderId)
    )
  }

  /** @param {string} id @returns {object|undefined} */
  getEntity(id) { return this._entities.get(id) }

  /**
   * Apply a damage-over-time effect to an entity.
   * @param {string} entityId @param {number} damage @param {number} ticks
   */
  addDoT(entityId, damage, ticks) {
    this._dots.push({ entityId, damage, ticksRemaining: ticks })
  }

  /**
   * Called every frame from GameLoop.
   * @param {number} delta — seconds
   */
  update(delta) {
    const tickMs = this._attu?.getTickMs() ?? COMBAT_TICK_MS
    this._tickAccum += delta * 1000
    if (this._tickAccum < tickMs) return
    this._tickAccum -= tickMs
    this._processTick()
  }

  _processTick() {
    // Auto-attacks
    for (const pair of [...this._pairs]) {
      const attacker = this._entities.get(pair.attackerId)
      const defender = this._entities.get(pair.defenderId)
      if (!attacker || !defender) continue
      if (defender.stats.hp <= 0) continue

      let damage = DamageCalc.roll(attacker, defender)

      // Attunement: damage multiplier (player-only)
      const isPlayer = pair.attackerId === 'player'
      if (isPlayer && this._attu && damage > 0) {
        damage = Math.floor(damage * this._attu.getDamageMultiplier())
      }

      // Attunement: echo strike
      if (isPlayer && this._attu && damage > 0) {
        const echo = this._attu.getEchoChance()
        if (echo > 0 && Math.random() < echo) damage *= 2
      }

      defender.stats.hp = Math.max(0, defender.stats.hp - damage)

      // Attunement: on-hit DoT (sporeCloud)
      if (isPlayer && this._attu && damage > 0) {
        const dot = this._attu.getOnHitDoT()
        if (dot) this.addDoT(pair.defenderId, dot.damage, dot.ticks)
      }

      // Resolve actual style used (equipment weapon overrides base style)
      const atkStyle = attacker.equipment?.weaponStyle
                    ?? attacker.stats.combatStyle
                    ?? 'biomech'

      bus.emit('combat:tick', {
        attackerId: pair.attackerId,
        targetId: pair.defenderId,
        damage,
        type: atkStyle,
        targetPos: defender.object?.position,
      })

      if (defender.stats.hp <= 0) {
        bus.emit('combat:death', { entityId: pair.defenderId })
      }
    }

    // DoTs
    const expired = []
    for (const dot of this._dots) {
      const entity = this._entities.get(dot.entityId)
      if (!entity) { expired.push(dot); continue }

      entity.stats.hp = Math.max(0, entity.stats.hp - dot.damage)
      bus.emit('combat:tick', {
        attackerId: 'dot',
        targetId: dot.entityId,
        damage: dot.damage,
        type: 'dot',
        targetPos: entity.object?.position,
      })

      dot.ticksRemaining--
      if (dot.ticksRemaining <= 0) expired.push(dot)

      if (entity.stats.hp <= 0) {
        bus.emit('combat:death', { entityId: dot.entityId })
        expired.push(dot)
      }
    }
    this._dots = this._dots.filter(d => !expired.includes(d))

    // Attunement: HP regen per tick (rewildPulse)
    if (this._attu) {
      const regen = this._attu.getHpRegenPerTick()
      if (regen > 0) {
        const player = this._entities.get('player')
        if (player && player.stats.hp > 0) {
          player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + regen)
        }
      }
    }
  }

  _addPair(attackerId, defenderId) {
    const exists = this._pairs.some(
      p => p.attackerId === attackerId && p.defenderId === defenderId
    )
    if (!exists) this._pairs.push({ attackerId, defenderId })
  }

  _removeFromAllPairs(id) {
    this._pairs = this._pairs.filter(p => p.attackerId !== id && p.defenderId !== id)
    this._dots  = this._dots.filter(d => d.entityId !== id)
  }
}

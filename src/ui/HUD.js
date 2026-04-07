import { bus }          from '../utils/EventBus.js'
import { DamageNumbers } from './DamageNumbers.js'
import { LootLog }       from './LootLog.js'
import { XPDrops }       from './XPDrops.js'
import { ChatLog }       from './ChatLog.js'
import { PlayerSpeech }  from './PlayerSpeech.js'
import { DebugPanel }    from './DebugPanel.js'
import { Minimap }       from './Minimap.js'

/**
 * HUD — coordinator for all DOM-based UI panels.
 * Owns HP bars directly; delegates skill rows, damage numbers, loot log to sub-modules.
 * OWNED BY: ui-agent
 */
export class HUD {
  /** @param {import('../engine/Engine.js').Engine} engine */
  constructor(engine) {
    this.engine    = engine
    this._entities = new Map()
    this._targetId = null

    // HP bar DOM refs
    this._playerHPFill = document.getElementById('hp-fill')
    this._playerHPText = document.getElementById('hp-text')
    this._targetPanel  = document.getElementById('target-panel')
    this._targetName   = document.getElementById('target-name')
    this._targetHPFill = document.getElementById('target-hp-fill')
    this._targetHPText = document.getElementById('target-hp-text')
    // Sub-modules
    this._dmg     = new DamageNumbers(engine)
    this._lootLog = new LootLog()
    this._xpDrops  = new XPDrops()
    this._chat     = new ChatLog()
    this._speech   = new PlayerSpeech(engine)
    this._debug    = new DebugPanel()
    this._minimap  = new Minimap(null)   // player set via setPlayer()

    // ── Event listeners ────────────────────────────────────────────────────
    bus.on('player:attack-target', ({ targetId }) => {
      this._targetId = targetId
      if (this._targetPanel) this._targetPanel.style.display = 'flex'
      if (this._targetName)  this._targetName.textContent = 'Forest Drone'
    })

    bus.on('combat:death', ({ entityId }) => {
      if (entityId === this._targetId) {
        this._targetId = null
        if (this._targetPanel) this._targetPanel.style.display = 'none'
      }
      if (entityId === 'player') {
        document.getElementById('status').textContent = 'You have fallen...'
      }
    })

    bus.on('combat:tick', ({ targetPos, damage, type }) => {
      if (targetPos) this._dmg.spawn(damage, targetPos, type)
    })

    bus.on('inventory:item-received', ({ item }) => {
      this._lootLog.show(item)
    })

    // skill:xp-gained and skill:level-up are now handled by GamePanel
  }

  /** @param {string} id @param {object} entity */
  registerEntity(id, entity) {
    this._entities.set(id, entity)
    if (id === 'player') {
      this._minimap._player = entity
    }
    this._speech.registerEntity(id, entity.object ?? entity)
  }

  /** Expose minimap so main.js can add world layers. */
  get minimap() { return this._minimap }

  /** Called every frame from GameLoop. */
  update(_delta) {
    this._speech.update()
    this._minimap.setCamTheta(this.engine.camTheta)
    this._minimap.update()
    const player = this._entities.get('player')
    if (player && this._playerHPFill) {
      const pct = player.stats.hp / player.stats.maxHp
      this._playerHPFill.style.width = Math.max(0, pct * 100) + '%'
      if (this._playerHPText) {
        this._playerHPText.textContent = `${Math.ceil(player.stats.hp)} / ${player.stats.maxHp}`
      }
    }

    if (this._targetId && this._targetHPFill) {
      const target = this._entities.get(this._targetId)
      if (target) {
        const pct = target.stats.hp / target.stats.maxHp
        this._targetHPFill.style.width = Math.max(0, pct * 100) + '%'
        if (this._targetHPText) {
          this._targetHPText.textContent = `${Math.ceil(target.stats.hp)} / ${target.stats.maxHp}`
        }
      }
    }
  }
}

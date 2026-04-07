/**
 * Woodcutting — OSRS-style tree chopping skill.
 * Listen for skill:action {type:'woodcutting'}, walk player to tree,
 * roll success every tick, award XP, drop logs, deplete trees.
 * OWNED BY: skills-agent
 */
import { bus }        from '../utils/EventBus.js'
import { createItem } from '../inventory/ItemDefs.js'

const CHOP_TICK_MS = 2400   // base interval between success rolls
const CHOP_REACH   = 4.5    // max distance to start chopping

export class Woodcutting {
  /**
   * @param {import('../player/Player.js').Player} player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {Map<string, import('../world/Tree.js').Tree>} trees  id → Tree
   */
  constructor(player, inventory, trees) {
    this._player    = player
    this._inventory = inventory
    this._trees     = trees

    this._activeTree  = null   // Tree currently targeted
    this._chopping    = false  // are we in the chop loop?
    this._chopTimer   = 0      // accumulator in seconds
    this._walking     = false  // walking toward tree

    bus.on('skill:action', ({ type, target }) => {
      if (type !== 'woodcutting') return
      this._startTarget(target.entityId)
    })

    // Any manual (non-internal) click-move cancels woodcutting
    bus.on('player:click-move', ({ _internal }) => { if (!_internal) this._cancel() })
  }

  // ── Public update (called every frame from GameLoop) ───────────────────────

  /** @param {number} delta seconds */
  update(delta) {
    if (!this._activeTree) return

    const tree = this._activeTree
    if (!tree.isStanding) { this._cancel(); return }

    const dist = this._player.position.distanceTo(tree.position)

    if (dist > CHOP_REACH) {
      // Still walking — nothing to do here, Player handles movement
      return
    }

    // In range — start/continue chopping
    this._walking = false
    this._chopTimer += delta

    if (this._chopTimer >= CHOP_TICK_MS / 1000) {
      this._chopTimer = 0
      this._rollChop(tree)
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _startTarget(treeId) {
    const tree = this._trees.get(treeId)
    if (!tree || !tree.isStanding) return

    // Level gate — check tier requirement before walking
    const level   = this._player.stats?.skills?.woodcutting?.level ?? 1
    const minLvl  = tree.tier?.minLevel ?? 1
    if (level < minLvl) {
      this._setStatus(`You need level ${minLvl} Woodcutting to chop this tree.`)
      return
    }

    this._activeTree = tree
    this._chopTimer  = 0
    this._walking    = true

    bus.emit('player:click-move', { worldPos: tree.position.clone(), _internal: true })
    this._setStatus(`Walking to ${tree.tier?.name ?? 'tree'}...`)
  }

  _rollChop(tree) {
    const level  = this._player.stats?.skills?.woodcutting?.level ?? 1
    const tier   = tree.tier
    const logId  = tier?.logId ?? 'normalLog'
    const xp     = tier?.xp   ?? 25

    // Success chance: 50% base + 0.5% per level (50%–99.5%)
    const chance = Math.min(0.995, 0.50 + level * 0.005)
    if (Math.random() > chance) return   // miss swing

    const fell = tree.chop()

    const log   = createItem(logId, 1)
    const added = this._inventory.addItem(log)
    if (added) bus.emit('inventory:item-received', { item: log })
    bus.emit('skill:award-xp', { skillId: 'woodcutting', amount: xp })

    this._setStatus(`You get some ${log.name.toLowerCase()}.`)

    if (fell) {
      this._setStatus('The tree falls.')
      this._cancel()
    }
  }

  _cancel() {
    this._activeTree = null
    this._chopTimer  = 0
    this._walking    = false
  }

  _setStatus(text) {
    const el = document.getElementById('status')
    if (!el) return
    el.textContent = text
  }
}

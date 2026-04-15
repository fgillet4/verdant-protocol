/**
 * Woodcutting — OSRS-style tree chopping skill.
 * Listen for skill:action {type:'woodcutting'}, walk player to tree,
 * roll success every tick, award XP, drop logs, deplete trees.
 * OWNED BY: skills-agent
 */
import { bus }        from '../utils/EventBus.js'
import { createItem } from '../inventory/ItemDefs.js'

const CHOP_TICK_MS = 2400   // base interval between success rolls
const CHOP_REACH   = 3.5    // covers diagonal navmesh cell (cellSize×√2 ≈ 2.83)

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
    this._chopTimer   = 0      // accumulator in seconds
    this._started     = false  // whether "You begin chopping..." has shown

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

    if (dist > CHOP_REACH) return  // still walking

    // First tick in range — show begin message
    if (!this._started) {
      this._started = true
      this._setStatus(`You begin chopping the ${tree.tier?.name ?? 'tree'}.`)
    }

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
    const treeName = tree.tier?.name ?? 'tree'
    if (level < minLvl) {
      this._setStatus(`You need level ${minLvl} Woodcutting to chop the ${treeName}.`)
      return
    }

    this._activeTree = tree
    this._chopTimer  = 0
    this._started    = false

    bus.emit('player:click-move', { worldPos: tree.position.clone(), _internal: true })
    this._setStatus(`Walking to ${treeName}...`)
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
    this._started    = false
  }

  _setStatus(text) {
    bus.emit('ui:examine', { text })
  }
}

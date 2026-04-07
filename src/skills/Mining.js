/**
 * Mining — OSRS-style ore mining skill.
 * Listens for skill:action {type:'mining'}, walks player to ore node,
 * rolls success every tick, awards XP, drops ore, depletes veins.
 * OWNED BY: skills-agent
 */
import { bus }        from '../utils/EventBus.js'
import { createItem } from '../inventory/ItemDefs.js'

const MINE_TICK_MS = 1800   // base interval between success rolls (3 OSRS ticks)
const MINE_REACH   = 4.5    // max distance to start mining

export class Mining {
  /**
   * @param {import('../player/Player.js').Player} player
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {Map<string, import('../world/OreNode.js').OreNode>} oreNodes  id → OreNode
   */
  constructor(player, inventory, oreNodes) {
    this._player   = player
    this._inventory = inventory
    this._oreNodes  = oreNodes

    this._activeNode = null
    this._mineTimer  = 0

    bus.on('skill:action', ({ type, target }) => {
      if (type !== 'mining') return
      this._startTarget(target.entityId)
    })

    bus.on('player:click-move', ({ _internal }) => { if (!_internal) this._cancel() })
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /** @param {number} delta seconds */
  update(delta) {
    if (!this._activeNode) return

    const node = this._activeNode
    if (!node.isIntact) { this._cancel(); return }

    const dist = this._player.position.distanceTo(node.position)
    if (dist > MINE_REACH) return   // still walking

    this._mineTimer += delta
    if (this._mineTimer >= MINE_TICK_MS / 1000) {
      this._mineTimer = 0
      this._rollMine(node)
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _startTarget(nodeId) {
    const node = this._oreNodes.get(nodeId)
    if (!node || !node.isIntact) return

    const level  = this._player.stats?.skills?.mining?.level ?? 1
    const minLvl = node.tier?.minLevel ?? 1
    if (level < minLvl) {
      this._setStatus(`You need level ${minLvl} Mining to mine this.`)
      return
    }

    this._activeNode = node
    this._mineTimer  = 0

    bus.emit('player:click-move', { worldPos: node.position.clone(), _internal: true })
    this._setStatus(`Walking to ${node.tier?.name ?? 'ore'}...`)
  }

  _rollMine(node) {
    const level  = this._player.stats?.skills?.mining?.level ?? 1
    const tier   = node.tier
    const oreId  = tier?.oreId ?? 'copperOre'
    const xp     = tier?.xp   ?? 17.5

    // Success chance: 45% base + 0.5% per level (45%–99.5%)
    const chance = Math.min(0.995, 0.45 + level * 0.005)
    if (Math.random() > chance) return

    const depleted = node.mine()

    const ore   = createItem(oreId, 1)
    const added = this._inventory.addItem(ore)
    if (added) bus.emit('inventory:item-received', { item: ore })
    bus.emit('skill:award-xp', { skillId: 'mining', amount: Math.floor(xp) })

    this._setStatus(`You mine some ${ore.name.toLowerCase()}.`)

    if (depleted) {
      this._setStatus('The vein is depleted.')
      this._cancel()
    }
  }

  _cancel() {
    this._activeNode = null
    this._mineTimer  = 0
  }

  _setStatus(text) {
    const el = document.getElementById('status')
    if (el) el.textContent = text
  }
}

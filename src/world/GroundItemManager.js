/**
 * GroundItemManager — handles items dropped on the ground.
 * - Listens for item:drop, removes from inventory, spawns a 3D DroppedItem
 * - Left-click → walk player to item → add to inventory
 * - Auto-despawns items after 30 seconds
 * OWNED BY: world-agent
 */
import { bus }         from '../utils/EventBus.js'
import { DroppedItem } from './DroppedItem.js'

const PICKUP_REACH = 2.5

let _dropSeq = 0

export class GroundItemManager {
  /**
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {import('../player/Player.js').Player} player
   * @param {import('../engine/Engine.js').Engine} engine
   */
  constructor(inventory, player, engine) {
    this._inventory = inventory
    this._player    = player
    this._engine    = engine
    /** @type {Map<string, DroppedItem>} dropId → DroppedItem */
    this._drops     = new Map()

    bus.on('item:drop', ({ instanceId }) => {
      const item = inventory.removeItem(instanceId)
      if (!item) return
      bus.emit('inventory:changed', {})
      this._spawn(item)
    })

    bus.on('world:interact', ({ entityId, type }) => {
      if (type !== 'groundItem') return
      this._attemptPickup(entityId)
    })
  }

  update(delta) {
    for (const [id, drop] of this._drops) {
      const alive = drop.update(delta)
      if (!alive) {
        this._engine.removeInteractableMesh(id)
        this._drops.delete(id)
      }
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _spawn(item) {
    const id  = `drop_${++_dropSeq}`
    const pos = this._player.object.position.clone()
    const drop = new DroppedItem(id, item, pos, this._engine.scene)
    this._drops.set(id, drop)

    // Register with engine so raycaster can hit it
    this._engine.addInteractableMesh(
      drop.object, id, 'groundItem',
      item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
    )

    bus.emit('ui:examine', { text: `You drop the ${item.name}.` })
  }

  _attemptPickup(dropId) {
    const drop = this._drops.get(dropId)
    if (!drop?.isAlive) return

    const itemName = drop.item.name
    this._player.walkTo(drop.position.clone(), () => {
      // Re-check after walk — might have despawned
      const d = this._drops.get(dropId)
      if (!d?.isAlive) return
      const added = this._inventory.addItem(d.item)
      if (added) {
        bus.emit('inventory:item-received', { item: d.item })
        bus.emit('ui:examine', { text: `You pick up the ${itemName}.` })
        this._engine.removeInteractableMesh(dropId)
        d.destroy()
        this._drops.delete(dropId)
      } else {
        bus.emit('ui:examine', { text: 'Your inventory is full.' })
      }
    }, PICKUP_REACH)
  }
}

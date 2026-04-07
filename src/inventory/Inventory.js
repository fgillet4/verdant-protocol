import { bus } from '../utils/EventBus.js'

export const MAX_SLOTS = 28

/**
 * Inventory — a 28-slot item bag (OSRS-style).
 * Auto-collects loot via enemy:loot events.
 */
export class Inventory {
  constructor() {
    /** @type {(object|null)[]} */
    this.slots = new Array(MAX_SLOTS).fill(null)

    bus.on('enemy:loot', ({ items }) => {
      for (const item of items) {
        const added = this.addItem(item)
        if (added) {
          bus.emit('inventory:item-received', { item })
        }
      }
    })
  }

  /**
   * Add an item. Stacks if stackable and already present.
   * @param {object} item — item instance
   * @returns {boolean} true if added
   */
  addItem(item) {
    if (item.stackable) {
      const existing = this.slots.find(s => s?.defId === item.defId)
      if (existing) {
        existing.quantity += item.quantity
        bus.emit('inventory:changed', {})
        return true
      }
    }
    const idx = this.slots.findIndex(s => s === null)
    if (idx === -1) return false
    this.slots[idx] = item
    bus.emit('inventory:changed', {})
    return true
  }

  /**
   * Remove an item by instanceId. Returns the item or null.
   * @param {string} instanceId
   */
  removeItem(instanceId) {
    const idx = this.slots.findIndex(s => s?.instanceId === instanceId)
    if (idx === -1) return null
    const item = this.slots[idx]
    this.slots[idx] = null
    bus.emit('inventory:changed', {})
    return item
  }

  /**
   * Count how many of a given defId are in the inventory (non-stackable = 1 per slot).
   * @param {string} defId
   * @returns {number}
   */
  countItem(defId) {
    return this.slots.reduce((n, s) => {
      if (!s || s.defId !== defId) return n
      return n + (s.stackable ? s.quantity : 1)
    }, 0)
  }

  /**
   * Remove up to qty instances of defId. Returns how many were removed.
   * @param {string} defId
   * @param {number} qty
   * @returns {number}
   */
  removeItemsByDefId(defId, qty) {
    let remaining = qty
    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      const s = this.slots[i]
      if (!s || s.defId !== defId) continue
      if (s.stackable) {
        const take = Math.min(s.quantity, remaining)
        s.quantity -= take
        remaining  -= take
        if (s.quantity === 0) this.slots[i] = null
      } else {
        this.slots[i] = null
        remaining--
      }
    }
    bus.emit('inventory:changed', {})
    return qty - remaining
  }

  get usedSlots() { return this.slots.filter(Boolean).length }
}

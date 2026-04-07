import { bus } from '../utils/EventBus.js'

export const EQUIP_SLOTS = [
  'weapon', 'offhand',
  'helmet', 'chest', 'legs',
  'feet',   'hands',
  'amulet', 'ring',
  'relic',
]

/**
 * Paper-doll layout for the UI — 3-column grid.
 * null = empty spacer cell.
 *   Col:  left     centre   right
 */
export const EQUIP_LAYOUT = [
  [null,     'helmet',  null     ],   // row 0
  ['weapon', 'chest',   'offhand'],   // row 1
  ['hands',  'legs',    'ring'   ],   // row 2
  [null,     'feet',    null     ],   // row 3
  ['amulet', null,      'relic'  ],   // row 4
]

export const SLOT_LABEL = {
  weapon:  'Weapon',  offhand: 'Off-hand',
  helmet:  'Head',    chest:   'Chest',    legs: 'Legs',
  feet:    'Feet',    hands:   'Hands',
  amulet:  'Amulet',  ring:    'Ring',
  relic:   'Relic',
}

/**
 * Equipment — manages 10 equipped item slots.
 * getBonuses() sums all slot contributions for DamageCalc.
 */
export class Equipment {
  /** @param {import('./Inventory.js').Inventory} inventory */
  constructor(inventory) {
    this.inventory = inventory
    /** @type {Record<string, object|null>} */
    this.slots = Object.fromEntries(EQUIP_SLOTS.map(s => [s, null]))
  }

  /**
   * Equip an item from the inventory into its slot.
   * Displaces any previously equipped item back to the bag.
   * @param {object} item
   */
  equip(item) {
    if (!item?.slot || !EQUIP_SLOTS.includes(item.slot)) return
    this.inventory.removeItem(item.instanceId)
    const displaced = this.slots[item.slot]
    if (displaced) this.inventory.addItem(displaced)
    this.slots[item.slot] = item
    bus.emit('equipment:changed', { slot: item.slot, item })
  }

  /** @param {string} slot */
  unequip(slot) {
    const item = this.slots[slot]
    if (!item) return
    this.slots[slot] = null
    this.inventory.addItem(item)
    bus.emit('equipment:changed', { slot, item: null })
  }

  /**
   * Sum of all stat bonuses from every equipped item.
   * DamageCalc reads this — adding more slots here is all that's needed.
   * @returns {{ attackBonus: number, strengthBonus: number, defenseBonus: number, speedBonus: number }}
   */
  getBonuses() {
    let attackBonus = 0, strengthBonus = 0, defenseBonus = 0, speedBonus = 0
    for (const item of Object.values(this.slots)) {
      if (!item) continue
      attackBonus   += item.bonuses.attackBonus   ?? 0
      strengthBonus += item.bonuses.strengthBonus ?? 0
      defenseBonus  += item.bonuses.defenseBonus  ?? 0
      speedBonus    += item.bonuses.speedBonus    ?? 0
    }
    return { attackBonus, strengthBonus, defenseBonus, speedBonus }
  }

  /** Active relic's special effect string (for UI tooltip). */
  get relicEffect() { return this.slots.relic?.effect ?? null }

  /** Combat style from equipped weapon, null if bare-handed. */
  get weaponStyle() { return this.slots.weapon?.style ?? null }
}

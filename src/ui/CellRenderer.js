/**
 * CellRenderer — shared helpers for inventory and equipment grid cells.
 * Used by EquipGrid.js and BagGrid.js.
 */
import { RARITY_COLOR } from '../inventory/ItemDefs.js'

export const ECELL = 50   // equipment cell px
export const BCELL = 48   // bag cell px
export const BGAP  = 3
export const EGAP  = 4

/**
 * Create a blank styled grid cell.
 * @param {number} size — px
 * @returns {HTMLDivElement}
 */
export function makeCell(size) {
  const c = document.createElement('div')
  c.style.cssText = [
    `width:${size}px;height:${size}px;`,
    'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.14);',
    'border-radius:5px;box-sizing:border-box;overflow:hidden;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'cursor:default;transition:border-color 0.12s;',
  ].join('')
  return c
}

/**
 * Paint an item into a cell (or clear it if item is null).
 * Preserves .eq-slot-lbl child if present.
 * @param {HTMLDivElement} cell
 * @param {object|null} item
 * @param {boolean} isEquipSlot
 */
export function paintCell(cell, item, isEquipSlot) {
  const lbl = cell.querySelector('.eq-slot-lbl')
  cell.innerHTML = ''
  if (lbl) cell.appendChild(lbl)

  if (!item) {
    cell.style.borderColor = 'rgba(255,255,255,0.14)'
    cell.style.cursor = 'default'
    return
  }

  cell.style.borderColor = RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common
  cell.style.cursor = 'pointer'

  const swatch = document.createElement('div')
  swatch.style.cssText = [
    'width:100%;flex:1;',
    `background:${item.color}18;`,
    'display:flex;align-items:center;justify-content:center;',
    `font-size:${isEquipSlot ? 10 : 9}px;font-weight:bold;letter-spacing:0.04em;`,
    `color:${item.color};`,
  ].join('')
  swatch.textContent = item.abbr

  const nameEl = document.createElement('div')
  nameEl.style.cssText = 'font-size:7px;text-align:center;opacity:0.85;padding:0 2px 2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;width:100%;'
  nameEl.textContent = item.stackable && item.quantity > 1
    ? `×${item.quantity}` : item.name.split(' ')[0]

  cell.appendChild(swatch)
  cell.appendChild(nameEl)
}

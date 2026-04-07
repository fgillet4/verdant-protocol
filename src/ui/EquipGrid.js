/**
 * EquipGrid — builds and renders the paper-doll equipment column (3×5 CSS grid).
 * Used by InventoryPanel.
 */
import { EQUIP_LAYOUT, SLOT_LABEL } from '../inventory/Equipment.js'
import { makeCell, paintCell, ECELL, EGAP } from './CellRenderer.js'

export class EquipGrid {
  /**
   * @param {object} equipment
   * @param {(slot: string) => void} onClickSlot
   * @param {(e: MouseEvent, slot: string) => void} onEnterSlot
   * @param {() => void} onLeaveSlot
   */
  constructor(equipment, onClickSlot, onEnterSlot, onLeaveSlot) {
    this._equipment  = equipment
    this._cells      = {}
    this._statsEl    = null
    this._onClickSlot = onClickSlot
    this._onEnterSlot = onEnterSlot
    this._onLeaveSlot = onLeaveSlot
  }

  /** Build the column DOM element. Call once; returns root element. */
  buildEl() {
    const col = document.createElement('div')
    col.style.cssText = 'display:flex;flex-direction:column;gap:8px;'

    const lbl = document.createElement('div')
    lbl.textContent = 'Equipment'
    lbl.style.cssText = 'font-size:9px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.38;'
    col.appendChild(lbl)

    const gridW = 3 * ECELL + 2 * EGAP
    const grid  = document.createElement('div')
    grid.style.cssText = `display:grid;grid-template-columns:repeat(3,${ECELL}px);grid-template-rows:repeat(5,${ECELL}px);gap:${EGAP}px;width:${gridW}px;`

    for (const row of EQUIP_LAYOUT) {
      for (const slot of row) {
        if (!slot) { grid.appendChild(document.createElement('div')); continue }

        const cell = makeCell(ECELL)
        cell.dataset.equipSlot = slot
        cell.style.position = 'relative'

        const slotLbl = document.createElement('div')
        slotLbl.className = 'eq-slot-lbl'
        slotLbl.textContent = SLOT_LABEL[slot]
        slotLbl.style.cssText = 'font-size:8px;opacity:0.55;text-align:center;position:absolute;bottom:3px;left:0;right:0;pointer-events:none;'
        cell.appendChild(slotLbl)

        cell.addEventListener('click',      () => this._onClickSlot(slot))
        cell.addEventListener('mouseenter', e  => this._onEnterSlot(e, slot))
        cell.addEventListener('mouseleave', ()  => this._onLeaveSlot())

        this._cells[slot] = cell
        grid.appendChild(cell)
      }
    }
    col.appendChild(grid)

    const stats = document.createElement('div')
    stats.style.cssText = 'font-size:10px;opacity:0.85;line-height:1.9;margin-top:2px;'
    col.appendChild(stats)
    this._statsEl = stats

    return col
  }

  /**
   * Repaint all equipment cells and update stats block.
   * @param {object} player — entity with stats
   */
  render(player) {
    for (const [slot, cell] of Object.entries(this._cells)) {
      paintCell(cell, this._equipment.slots[slot], true)
    }

    if (!this._statsEl || !player) return
    const bon = this._equipment.getBonuses()
    const s   = player.stats
    this._statsEl.innerHTML = [
      `<span style="opacity:.65">Atk lv</span> ${s.attack} <span style="opacity:.65">+equip</span> +${bon.attackBonus}`,
      `<span style="opacity:.65">Str   </span> <span style="opacity:.65">+equip</span> +${bon.strengthBonus}`,
      `<span style="opacity:.65">Def lv</span> ${s.defense} <span style="opacity:.65">+equip</span> +${bon.defenseBonus}`,
      bon.speedBonus ? `<span style="opacity:.65">Speed </span> +${bon.speedBonus.toFixed(1)}` : '',
      `<span style="opacity:.65">Max HP</span> ${s.maxHp}`,
      this._equipment.relicEffect
        ? `<br><span style="opacity:.6;font-size:9px">${this._equipment.relicEffect}</span>`
        : '',
    ].filter(Boolean).join('<br>')
  }
}

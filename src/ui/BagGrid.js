/**
 * BagGrid — builds and renders the 28-slot bag column (4×7 CSS grid).
 * Used by InventoryPanel.
 */
import { makeCell, paintCell, BCELL, BGAP } from './CellRenderer.js'
import { bus } from '../utils/EventBus.js'

const BAG_SIZE = 28

export class BagGrid {
  /**
   * @param {object} inventory
   * @param {(idx: number) => void} onClickIdx
   * @param {(e: MouseEvent, idx: number) => void} onEnterIdx
   * @param {() => void} onLeaveIdx
   */
  constructor(inventory, onClickIdx, onEnterIdx, onLeaveIdx) {
    this._inventory  = inventory
    this._cells      = []
    this._onClickIdx = onClickIdx
    this._onEnterIdx = onEnterIdx
    this._onLeaveIdx = onLeaveIdx
  }

  /** Build the column DOM element. Call once; returns root element. */
  buildEl() {
    const col = document.createElement('div')
    col.style.cssText = 'display:flex;flex-direction:column;gap:8px;'

    const lbl = document.createElement('div')
    lbl.textContent = 'Bag'
    lbl.style.cssText = 'font-size:9px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.38;'
    col.appendChild(lbl)

    const bagW = 4 * BCELL + 3 * BGAP
    const grid = document.createElement('div')
    grid.style.cssText = `display:grid;grid-template-columns:repeat(4,${BCELL}px);gap:${BGAP}px;width:${bagW}px;`

    for (let i = 0; i < BAG_SIZE; i++) {
      const cell = makeCell(BCELL)
      cell.dataset.bagIdx = i
      cell.addEventListener('click',      () => this._onClickIdx(i))
      cell.addEventListener('mouseenter', e  => this._onEnterIdx(e, i))
      cell.addEventListener('mouseleave', ()  => this._onLeaveIdx())
      cell.addEventListener('contextmenu', e => {
        e.preventDefault()
        e.stopPropagation()
        const item = this._inventory.slots[i]
        if (!item) return
        bus.emit('ui:right-click', {
          x: e.clientX, y: e.clientY,
          target: { type: 'item', item, label: item.name },
        })
      })
      grid.appendChild(cell)
      this._cells.push(cell)
    }
    col.appendChild(grid)
    return col
  }

  /** Repaint all bag cells. */
  render() {
    for (let i = 0; i < BAG_SIZE; i++) {
      paintCell(this._cells[i], this._inventory.slots[i], false)
    }
  }
}

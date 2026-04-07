import { bus }         from '../utils/EventBus.js'
import { EquipGrid }   from './EquipGrid.js'
import { BagGrid }     from './BagGrid.js'
import { ItemTooltip } from './ItemTooltip.js'

/**
 * InventoryPanel — coordinator for equipment + bag UI.
 * Delegates grid rendering to EquipGrid and BagGrid.
 * Toggle with I key.
 * OWNED BY: ui-agent
 */
export class InventoryPanel {
  constructor(inventory, equipment, player) {
    this.inventory = inventory
    this.equipment = equipment
    this.player    = player
    this._visible  = false

    const tip  = new ItemTooltip()
    const hide = () => tip.hide()

    this._equipGrid = new EquipGrid(
      equipment,
      slot => { if (equipment.slots[slot]) equipment.unequip(slot) },
      (e, slot) => tip.show(e, equipment.slots[slot]),
      hide,
    )
    this._bagGrid = new BagGrid(
      inventory,
      idx  => { const item = inventory.slots[idx]; if (item?.slot) equipment.equip(item) },
      (e, idx)  => tip.show(e, inventory.slots[idx]),
      hide,
    )

    this._build()

    bus.on('inventory:changed', () => this._render())
    bus.on('equipment:changed', () => this._render())

    window.addEventListener('keydown', e => {
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); this.toggle() }
    })
  }

  toggle() {
    this._visible = !this._visible
    this._panel.style.display = this._visible ? 'flex' : 'none'
    if (this._visible) this._render()
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.id = 'inv-panel'
    Object.assign(panel.style, {
      display: 'none', position: 'absolute',
      bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      flexDirection: 'column', gap: '10px',
      background: 'rgba(5,12,5,0.94)', border: '1px solid rgba(76,175,80,0.28)',
      borderRadius: '10px', padding: '14px 16px',
      fontFamily: "'Courier New',monospace", color: '#c8e6c9',
      pointerEvents: 'auto', zIndex: '100', userSelect: 'none',
      backdropFilter: 'blur(8px)',
    })

    // Title row
    const titleRow = document.createElement('div')
    titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;'
    const titleText = document.createElement('span')
    titleText.style.cssText = 'font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.55;'
    titleText.textContent = 'Inventory'
    const slotsUsed = document.createElement('span')
    slotsUsed.id = 'inv-slots-used'
    slotsUsed.style.cssText = 'font-size:10px;opacity:0.35;'
    const closeBtn = document.createElement('span')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'cursor:pointer;opacity:0.4;font-size:13px;padding:2px 6px;margin-left:8px;'
    closeBtn.onclick = () => this.toggle()
    titleRow.append(titleText, slotsUsed, closeBtn)

    // Body with both grids
    const body = document.createElement('div')
    body.style.cssText = 'display:flex;gap:14px;align-items:flex-start;'
    body.appendChild(this._equipGrid.buildEl())
    body.appendChild(this._bagGrid.buildEl())

    panel.appendChild(titleRow)
    panel.appendChild(body)
    document.body.appendChild(panel)
    this._panel     = panel
    this._slotsUsed = slotsUsed
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    if (!this._visible) return
    this._equipGrid.render(this.player)
    this._bagGrid.render()
    if (this._slotsUsed) {
      this._slotsUsed.textContent = `${this.inventory.usedSlots}/28`
    }
  }
}

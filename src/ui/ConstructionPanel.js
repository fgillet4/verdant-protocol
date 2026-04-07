/**
 * ConstructionPanel — blueprint browser. Toggle with B key.
 * Click a blueprint to enter placement mode.
 * OWNED BY: ui-agent
 */
import { bus }                                       from '../utils/EventBus.js'
import { BLUEPRINTS, BLUEPRINT_ITEM_NAMES }          from '../world/BlueprintDefs.js'

const STRUCT_COLORS = {
  campfire:    '#ff8a65',
  leanTo:      '#a5d6a7',
  barricade:   '#90a4ae',
  watchtower:  '#80cbc4',
  solarRelay:  '#ffd54f',
  rootNexus:   '#ce93d8',
}

export class ConstructionPanel {
  /**
   * @param {import('../inventory/Inventory.js').Inventory} inventory
   * @param {import('../player/Player.js').Player} player
   */
  constructor(inventory, player) {
    this._inventory = inventory
    this._player    = player
    this._visible   = false
    this._rows      = {}
    this._el        = this._build()
    document.body.appendChild(this._el)

    bus.on('inventory:changed', () => this._refresh())
    window.addEventListener('keydown', e => {
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); this.toggle() }
      if (e.key === 'Escape') this.hide()
    })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.style.cssText = [
      'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:rgba(4,10,4,0.97);border:1px solid rgba(120,144,156,0.35);',
      'border-radius:10px;padding:18px 22px;width:420px;max-height:80vh;overflow-y:auto;',
      'font-family:"Courier New",monospace;color:#c8e6c9;z-index:700;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);',
    ].join('')

    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'
    const title = document.createElement('span')
    title.style.cssText = 'font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#90a4ae;'
    title.textContent = 'Construction'
    const hint = document.createElement('span')
    hint.style.cssText = 'font-size:9px;color:#555;'
    hint.textContent = '[B] to toggle'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('click', () => this.hide())
    hdr.append(title, hint, closeBtn)
    panel.appendChild(hdr)

    for (const bp of BLUEPRINTS) {
      panel.appendChild(this._buildRow(bp))
    }

    this._statusEl = document.createElement('div')
    this._statusEl.style.cssText = 'margin-top:10px;font-size:9px;opacity:0.4;text-align:right;min-height:12px;'
    panel.appendChild(this._statusEl)
    return panel
  }

  _buildRow(bp) {
    const col = STRUCT_COLORS[bp.id] ?? '#aaa'
    const row = document.createElement('div')
    row.style.cssText = [
      'border:1px solid rgba(255,255,255,0.07);border-radius:6px;',
      'padding:9px 12px;margin-bottom:7px;',
    ].join('')

    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;'
    const nameEl = document.createElement('span')
    nameEl.style.cssText = `font-size:12px;font-weight:bold;color:${col};`
    nameEl.textContent = bp.name
    const meta = document.createElement('span')
    meta.style.cssText = 'font-size:9px;color:#888;'
    meta.textContent = `Lv ${bp.level} · ${bp.xp} XP · r=${bp.effectRadius}`
    top.append(nameEl, meta)
    row.appendChild(top)

    const desc = document.createElement('div')
    desc.style.cssText = 'font-size:10px;color:#78909c;margin-bottom:5px;font-style:italic;'
    desc.textContent = bp.description
    row.appendChild(desc)

    const costEl = document.createElement('div')
    costEl.style.cssText = 'font-size:10px;color:#aaa;margin-bottom:7px;'
    row.appendChild(costEl)

    const btn = document.createElement('button')
    btn.textContent = 'Place'
    btn.style.cssText = [
      `background:rgba(${_hexToRgb(col)},0.1);border:1px solid rgba(${_hexToRgb(col)},0.4);`,
      `color:${col};font-family:inherit;font-size:11px;padding:3px 12px;`,
      'border-radius:4px;cursor:pointer;transition:background 0.1s;',
    ].join('')
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.opacity = '0.8' })
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1' })
    btn.addEventListener('click', () => {
      bus.emit('construction:start-placement', { blueprintId: bp.id })
      this.hide()
    })
    row.appendChild(btn)

    this._rows[bp.id] = { costEl, btn }
    return row
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  _refresh() {
    const playerLevel = this._player.stats?.skills?.construction?.level ?? 1
    for (const bp of BLUEPRINTS) {
      const { costEl, btn } = this._rows[bp.id]
      let canAfford = true
      const parts = bp.cost.map(({ itemId, qty }) => {
        const have = this._inventory.countItem(itemId)
        if (have < qty) canAfford = false
        const color = have >= qty ? '#c8e6c9' : '#ef9a9a'
        return `<span style="color:${color}">${qty}× ${BLUEPRINT_ITEM_NAMES[itemId] ?? itemId} (${have})</span>`
      })
      costEl.innerHTML = parts.join('<span style="color:#555"> · </span>')

      const locked = playerLevel < bp.level
      btn.disabled    = locked || !canAfford
      btn.style.opacity = (locked || !canAfford) ? '0.35' : '1'
      btn.style.cursor  = (locked || !canAfford) ? 'not-allowed' : 'pointer'
      if (locked) btn.title = `Requires level ${bp.level} Construction`
    }
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  toggle() { this._visible ? this.hide() : this.show() }

  show() {
    if (this._visible) return
    this._el.style.display = 'block'
    this._visible = true
    this._refresh()
  }

  hide() {
    if (!this._visible) return
    this._el.style.display = 'none'
    this._visible = false
  }
}

function _hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

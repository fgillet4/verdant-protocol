/**
 * MiningModal — shows all ore tiers, level requirements, ore items, XP, and respawn time.
 * Opened by right-clicking Mining in the skill panel.
 * OWNED BY: ui-agent
 */
import { ORE_TIERS }   from '../../../world/OreNodeDefs.js'
import { RARITY_COLOR } from '../../../inventory/ItemDefs.js'

const ORE_NAMES = {
  copperOre:    'Copper Ore',
  ironOre:      'Iron Ore',
  coal:         'Coal',
  solariteOre:  'Solarite Ore',
  heartstoneOre:'Heartstone Ore',
}
const ORE_COLORS = {
  copperOre:    '#b87333',
  ironOre:      '#78909c',
  coal:         '#616161',
  solariteOre:  '#ffd740',
  heartstoneOre:'#ce93d8',
}

export class MiningModal {
  constructor() {
    this._el      = null
    this._visible = false
    this._build()
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const backdrop = document.createElement('div')
    backdrop.style.cssText = [
      'display:none;position:fixed;inset:0;z-index:800;',
      'background:rgba(0,0,0,0.55);backdrop-filter:blur(2px);',
    ].join('')
    backdrop.addEventListener('pointerdown', e => {
      if (e.target === backdrop) this.hide()
    })

    const panel = document.createElement('div')
    panel.style.cssText = [
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:rgba(4,10,4,0.97);border:1px solid rgba(144,164,174,0.4);',
      'border-radius:10px;padding:20px 24px;min-width:460px;',
      'font-family:"Courier New",monospace;color:#c8e6c9;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);',
    ].join('')

    // Header
    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'
    const title = document.createElement('span')
    title.style.cssText = 'font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#90a4ae;'
    title.textContent = 'Mining — Ore Tiers'
    const close = document.createElement('button')
    close.textContent = '✕'
    close.style.cssText = [
      'background:none;border:none;color:#888;font-size:14px;',
      'cursor:pointer;padding:0 2px;line-height:1;',
    ].join('')
    close.addEventListener('click', () => this.hide())
    hdr.appendChild(title)
    hdr.appendChild(close)
    panel.appendChild(hdr)

    // Tier table
    const table = document.createElement('table')
    table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;'

    const thead = document.createElement('thead')
    thead.innerHTML = `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:#888;text-transform:uppercase;letter-spacing:0.12em;font-size:9px;">
        <th style="text-align:left;padding:4px 8px;">Vein</th>
        <th style="text-align:center;padding:4px 8px;">Level</th>
        <th style="text-align:left;padding:4px 8px;">Ore</th>
        <th style="text-align:center;padding:4px 8px;">XP</th>
        <th style="text-align:left;padding:4px 8px;">Respawn</th>
      </tr>
    `
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    for (const tier of ORE_TIERS) {
      const oreColor  = ORE_COLORS[tier.oreId] ?? '#aaa'
      const oreName   = ORE_NAMES[tier.oreId]  ?? tier.oreId
      const veinHex   = '#' + tier.veinColor.toString(16).padStart(6, '0')
      const respawnSec = tier.respawnMs / 1000

      const tr = document.createElement('tr')
      tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.08s;'
      tr.addEventListener('mouseenter', () => { tr.style.background = 'rgba(144,164,174,0.07)' })
      tr.addEventListener('mouseleave', () => { tr.style.background = '' })

      tr.innerHTML = `
        <td style="padding:7px 8px;">
          <span style="display:inline-block;width:8px;height:8px;background:${veinHex};transform:rotate(45deg);margin-right:7px;vertical-align:middle;"></span>
          <span style="color:${veinHex}">${tier.name}</span>
        </td>
        <td style="text-align:center;padding:7px 8px;">
          <span style="color:${tier.minLevel === 1 ? '#66bb6a' : '#ffd54f'};font-weight:bold;">${tier.minLevel}</span>
        </td>
        <td style="padding:7px 8px;">
          <span style="color:${oreColor}">${oreName}</span>
        </td>
        <td style="text-align:center;padding:7px 8px;color:#a5d6a7;">${tier.xp}</td>
        <td style="padding:7px 8px;font-size:10px;opacity:0.55;">${respawnSec}s · ${tier.minesMin}–${tier.minesMax} swings</td>
      `
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    panel.appendChild(table)

    // Footnote
    const note = document.createElement('div')
    note.style.cssText = 'margin-top:12px;font-size:9px;opacity:0.3;text-align:right;'
    note.textContent = 'Success chance scales with level (45%–99.5%). Solarite and Heartstone veins glow.'
    panel.appendChild(note)

    backdrop.appendChild(panel)
    document.body.appendChild(backdrop)
    this._el = backdrop
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  show() {
    if (this._visible) return
    this._el.style.display = 'block'
    this._visible = true
    this._onKey = e => { if (e.key === 'Escape') this.hide() }
    window.addEventListener('keydown', this._onKey, { once: true })
  }

  hide() {
    if (!this._visible) return
    this._el.style.display = 'none'
    this._visible = false
    window.removeEventListener('keydown', this._onKey)
  }
}

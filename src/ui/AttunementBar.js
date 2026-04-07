import { bus }            from '../utils/EventBus.js'
import { ATTUNEMENT_LIST } from '../attunement/Attunements.js'

function _esc(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

/**
 * AttunementBar — HUD element for attunement points + active slot display.
 * Lives bottom-centre-right. Press A to open/close selection panel.
 * OWNED BY: ui-agent
 */
export class AttunementBar {
  /**
   * @param {import('../attunement/AttunementSystem.js').AttunementSystem} attunementSystem
   */
  constructor(attunementSystem) {
    this._system  = attunementSystem
    this._panelOpen = false
    this._build()

    bus.on('attunement:changed', () => this._render())
    bus.on('attunement:update',  ({ points, biomeHealth }) => {
      this._updateOrb(points, biomeHealth)
    })
    bus.on('attunement:depleted', () => {
      this._orbEl.style.animation = 'attu-depleted 0.4s ease-out'
      setTimeout(() => { this._orbEl.style.animation = '' }, 400)
    })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    // ── Wrapper ──
    const wrap = document.createElement('div')
    wrap.id = 'attu-wrap'
    Object.assign(wrap.style, {
      position: 'absolute', bottom: '20px', right: '16px',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px',
      pointerEvents: 'auto', userSelect: 'none',
      fontFamily: "'Courier New',monospace",
    })

    // ── Orb row (orb + 3 active slots) ──
    const orbRow = document.createElement('div')
    orbRow.style.cssText = 'display:flex;align-items:center;gap:6px;'

    // Orb
    const orb = document.createElement('div')
    orb.id = 'attu-orb'
    orb.title = 'Attunement — press A'
    orb.style.cssText = [
      'width:36px;height:36px;border-radius:50%;',
      'background:conic-gradient(#69f0ae 0%, rgba(255,255,255,0.06) 0%);',
      'border:2px solid rgba(105,240,174,0.35);',
      'cursor:pointer;transition:border-color 0.2s;position:relative;',
      'display:flex;align-items:center;justify-content:center;',
    ].join('')
    // Clicking the orb opens the GamePanel attunements tab (via bus)
    orb.onclick = () => bus.emit('ui:open-attunements', {})
    orb.addEventListener('mouseenter', () => bus.emit('ui:tooltip', {
      html: '<span style="color:#69f0ae;font-weight:bold">Attunement</span>' +
            '<br><span style="opacity:0.55;font-size:9px">Click to manage</span>',
    }))
    orb.addEventListener('mouseleave', () => bus.emit('ui:tooltip-hide'))

    const orbText = document.createElement('span')
    orbText.id = 'attu-orb-text'
    orbText.style.cssText = 'font-size:9px;color:#69f0ae;font-weight:bold;'
    orbText.textContent = '100'
    orb.appendChild(orbText)
    this._orbEl = orb

    // 3 active slots
    this._slotEls = []
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement('div')
      slot.style.cssText = [
        'width:28px;height:28px;border-radius:4px;',
        'border:1px solid rgba(255,255,255,0.1);',
        'background:rgba(255,255,255,0.03);',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:8px;color:#aaa;',
      ].join('')
      slot.textContent = '—'
      this._slotEls.push(slot)
      orbRow.appendChild(slot)

      // Tooltip on hover — capture i for closure
      const idx = i
      slot.addEventListener('mouseenter', () => {
        const id = [...this._system.active][idx]
        if (!id) return
        const def = ATTUNEMENT_LIST.find(a => a.id === id)
        if (!def) return
        bus.emit('ui:tooltip', {
          html: `<span style="color:${def.color};font-weight:bold">${_esc(def.name)}</span>` +
                `<br><span style="opacity:0.75;font-size:9px">${_esc(def.description)}</span>` +
                `<br><span style="opacity:0.5;font-size:9px">Drain: ${def.drainRate}/s</span>`,
        })
      })
      slot.addEventListener('mouseleave', () => bus.emit('ui:tooltip-hide'))
    }
    orbRow.prepend(orb)

    // Biome health label
    const biomeLbl = document.createElement('div')
    biomeLbl.id = 'attu-biome'
    biomeLbl.style.cssText = 'font-size:8px;opacity:0.35;text-align:right;color:#a5d6a7;'
    biomeLbl.textContent = 'biome: —'
    this._biomeLbl = biomeLbl

    wrap.appendChild(orbRow)
    wrap.appendChild(biomeLbl)
    document.body.appendChild(wrap)
    this._wrap = wrap
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _render() {
    // Update active slot display
    const activeArr = [...this._system.active]
    for (let i = 0; i < 3; i++) {
      const id  = activeArr[i]
      const el  = this._slotEls[i]
      if (id) {
        const def = ATTUNEMENT_LIST.find(a => a.id === id)
        el.textContent = def.name.slice(0, 2).toUpperCase()
        el.style.borderColor = def.color
        el.style.color = def.color
        el.style.background = def.color + '18'
      } else {
        el.textContent = '—'
        el.style.borderColor = 'rgba(255,255,255,0.1)'
        el.style.color = '#aaa'
        el.style.background = 'rgba(255,255,255,0.03)'
      }
    }

    // Update panel row highlights
    for (const def of ATTUNEMENT_LIST) {
      const row = document.getElementById(`attu-row-${def.id}`)
      if (!row) continue
      const on = this._system.isActive(def.id)
      row.style.background = on ? def.color + '18' : ''
      row.style.borderColor = on ? def.color + '55' : 'transparent'
    }
  }

  _updateOrb(points, biomeHealth) {
    const pct = points / 100
    const deg = Math.round(pct * 360)
    const color = biomeHealth >= 50 ? '#69f0ae' : biomeHealth > 0 ? '#ffd740' : '#ef5350'
    this._orbEl.style.background =
      `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)`
    this._orbEl.style.borderColor = color + '55'

    const textEl = document.getElementById('attu-orb-text')
    if (textEl) textEl.textContent = Math.ceil(points)

    this._biomeLbl.textContent = biomeHealth > 0
      ? `biome ${Math.round(biomeHealth)}%`
      : 'biome: dead zone'
    this._biomeLbl.style.color = biomeHealth >= 50 ? '#a5d6a7'
                                : biomeHealth >  0  ? '#ffd740'
                                : '#ef5350'
  }

}

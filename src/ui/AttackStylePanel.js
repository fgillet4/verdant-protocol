/**
 * AttackStylePanel — OSRS-style attack style selector + special attack bar.
 * Opened/closed with Q. Style options vary by equipped weapon type.
 * Special attack energy recharges at 10%/30s (same rate as OSRS).
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

// Attack styles by weapon category
const STYLES = {
  melee: [
    { id: 'accurate',    label: 'Accurate',    bonus: '+3 Attack',    icon: '⊕' },
    { id: 'aggressive',  label: 'Aggressive',  bonus: '+3 Strength',  icon: '⚔' },
    { id: 'defensive',   label: 'Defensive',   bonus: '+3 Defense',   icon: '⛨' },
    { id: 'controlled',  label: 'Controlled',  bonus: '+1 All',       icon: '◎' },
  ],
  marksmanship: [
    { id: 'accurate',    label: 'Accurate',    bonus: '+3 Attack',    icon: '⊕' },
    { id: 'rapid',       label: 'Rapid',       bonus: 'Faster speed', icon: '⚡' },
    { id: 'longrange',   label: 'Longrange',   bonus: '+3 Defense',   icon: '⛨' },
  ],
  biomech: [
    { id: 'accurate',    label: 'Accurate',    bonus: '+3 Attack',    icon: '⊕' },
    { id: 'aggressive',  label: 'Aggressive',  bonus: '+3 Strength',  icon: '⚔' },
    { id: 'defensive',   label: 'Defensive',   bonus: '+3 Defense',   icon: '⛨' },
  ],
}

const SPEC_ENERGY_REGEN_MS = 30000   // full bar in 5 mins (10%/30s)
const SPEC_COST = 50                  // % energy cost to use special

export class AttackStylePanel {
  constructor(player) {
    this._player      = player
    this._visible     = false
    this._specEnergy  = 100           // 0–100
    this._specTimer   = 0
    this._activeStyle = 'accurate'

    this._build()
    this._bindKeys()

    bus.on('equipment:changed', ({ slot, item }) => {
      if (slot === 'weapon') this._refresh(item?.style ?? 'biomech')
    })
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.id = 'attack-style-panel'
    Object.assign(panel.style, {
      display:        'none',
      flexDirection:  'column',
      position:       'fixed',
      bottom:         '70px',
      right:          '252px',      // left of GamePanel
      width:          '168px',
      background:     'rgba(5,12,5,0.96)',
      border:         '1px solid rgba(76,175,80,0.28)',
      borderRadius:   '8px',
      fontFamily:     "'Courier New',monospace",
      color:          '#c8e6c9',
      pointerEvents:  'auto',
      zIndex:         '200',
      userSelect:     'none',
      backdropFilter: 'blur(6px)',
      padding:        '10px',
      gap:            '8px',
    })

    // Header
    const header = document.createElement('div')
    header.style.cssText = 'font-size:9px;letter-spacing:0.12em;color:#76ff03;opacity:0.7;border-bottom:1px solid rgba(76,175,80,0.18);padding-bottom:6px;margin-bottom:4px;'
    header.textContent = 'ATTACK STYLE  [Q]'
    panel.appendChild(header)

    // Style buttons container
    const styleWrap = document.createElement('div')
    styleWrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;'
    this._styleWrap = styleWrap
    panel.appendChild(styleWrap)

    // Divider
    const div = document.createElement('div')
    div.style.cssText = 'height:1px;background:rgba(76,175,80,0.12);margin:4px 0;'
    panel.appendChild(div)

    // Special attack section
    const specLabel = document.createElement('div')
    specLabel.style.cssText = 'font-size:9px;letter-spacing:0.1em;color:#ffd740;opacity:0.65;margin-bottom:3px;'
    specLabel.textContent = 'SPECIAL ATTACK'
    panel.appendChild(specLabel)

    // Energy bar
    const barBg = document.createElement('div')
    barBg.style.cssText = 'height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:5px;'
    const barFill = document.createElement('div')
    barFill.style.cssText = 'height:100%;width:100%;background:#ffd740;border-radius:3px;transition:width 0.3s;'
    barBg.appendChild(barFill)
    this._specBar = barFill
    panel.appendChild(barBg)

    // Energy % label
    const energyText = document.createElement('div')
    energyText.style.cssText = 'font-size:9px;color:#ffd740;text-align:right;opacity:0.55;margin-bottom:4px;'
    energyText.textContent = '100%'
    this._energyText = energyText
    panel.appendChild(energyText)

    // Use special button
    const specBtn = document.createElement('div')
    specBtn.style.cssText = [
      'text-align:center;padding:5px 0;border-radius:4px;cursor:pointer;font-size:10px;',
      'background:rgba(255,215,64,0.12);border:1px solid rgba(255,215,64,0.35);',
      'color:#ffd740;letter-spacing:0.08em;transition:background 0.1s;',
    ].join('')
    specBtn.textContent = 'USE SPECIAL'
    specBtn.addEventListener('click', () => this._useSpec())
    specBtn.addEventListener('mouseenter', () => { specBtn.style.background = 'rgba(255,215,64,0.22)' })
    specBtn.addEventListener('mouseleave', () => { specBtn.style.background = 'rgba(255,215,64,0.12)' })
    this._specBtn = specBtn
    panel.appendChild(specBtn)

    document.body.appendChild(panel)
    this._panel = panel

    // Render initial styles for default weapon type
    this._refresh('biomech')
  }

  _makeStyleBtn(s) {
    const btn = document.createElement('div')
    btn.style.cssText = [
      'display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:4px;',
      'cursor:pointer;border:1px solid transparent;font-size:10px;',
      'transition:background 0.1s,border-color 0.1s;',
    ].join('')
    const icon = document.createElement('span')
    icon.style.cssText = 'font-size:11px;width:14px;text-align:center;opacity:0.7;'
    icon.textContent = s.icon
    const text = document.createElement('div')
    text.style.cssText = 'flex:1;'
    text.innerHTML = `<div style="color:#c8e6c9">${s.label}</div><div style="font-size:8px;opacity:0.45">${s.bonus}</div>`
    btn.append(icon, text)

    btn.addEventListener('click', () => {
      this._activeStyle = s.id
      this._applyStyle(s.id)
      this._renderStyleBtns()
    })
    btn.dataset.styleId = s.id
    return btn
  }

  // ── Logic ──────────────────────────────────────────────────────────────────

  _refresh(weaponStyle) {
    const list = STYLES[weaponStyle] ?? STYLES.biomech
    this._styleList = list
    // Reset to first style in list if current isn't valid
    if (!list.find(s => s.id === this._activeStyle)) {
      this._activeStyle = list[0].id
      this._applyStyle(this._activeStyle)
    }
    this._styleWrap.innerHTML = ''
    list.forEach(s => this._styleWrap.appendChild(this._makeStyleBtn(s)))
    this._renderStyleBtns()
  }

  _renderStyleBtns() {
    for (const btn of this._styleWrap.children) {
      const active = btn.dataset.styleId === this._activeStyle
      btn.style.background   = active ? 'rgba(76,175,80,0.15)' : ''
      btn.style.borderColor  = active ? 'rgba(76,175,80,0.4)' : 'transparent'
      btn.style.color        = active ? '#76ff03' : '#c8e6c9'
    }
  }

  _applyStyle(id) {
    if (this._player) this._player.stats.attackStyle = id
    bus.emit('combat:style-changed', { style: id })
  }

  _useSpec() {
    if (this._specEnergy < SPEC_COST) return
    this._specEnergy -= SPEC_COST
    this._updateSpecBar()
    bus.emit('combat:special-attack', { style: this._activeStyle })
  }

  _updateSpecBar() {
    const pct = Math.min(100, Math.round(this._specEnergy))
    this._specBar.style.width = pct + '%'
    this._energyText.textContent = pct + '%'
    const charged = this._specEnergy >= SPEC_COST
    this._specBtn.style.opacity = charged ? '1' : '0.4'
    this._specBtn.style.cursor  = charged ? 'pointer' : 'default'
  }

  /** Call from GameLoop if you want energy regen. Or tick independently. */
  update(delta) {
    if (this._specEnergy < 100) {
      this._specEnergy = Math.min(100, this._specEnergy + (100 / (SPEC_ENERGY_REGEN_MS / 1000)) * delta)
      this._updateSpecBar()
    }
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  toggle() {
    this._visible ? this._hide() : this._show()
  }

  _show() {
    this._panel.style.display = 'flex'
    this._visible = true
  }

  _hide() {
    this._panel.style.display = 'none'
    this._visible = false
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); this.toggle() }
    })
  }
}

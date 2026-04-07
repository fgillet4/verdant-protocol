/**
 * MarksmanshipBar — ability bar that appears when combatStyle = 'marksmanship'.
 * Shows 4 abilities with cooldown overlays and keybinds (1–4).
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

const ABILITIES = [
  { id: 'piercingShot', name: 'Piercing Shot', key: '1', color: '#ffffff',
    desc: 'Ignores defense · 160% dmg · 5s cd' },
  { id: 'volley',       name: 'Volley',        key: '2', color: '#ffcc02',
    desc: '3 rapid shots · 70% each · 8s cd' },
  { id: 'eagleEye',     name: 'Eagle Eye',     key: '3', color: '#00e5ff',
    desc: 'Next shot: guaranteed crit · 300% · 12s cd' },
  { id: 'snipe',        name: 'Snipe',         key: '4', color: '#ff4444',
    desc: '20u range · 250% dmg · bleed DoT · 15s cd' },
]

export class MarksmanshipBar {
  /** @param {import('../combat/Marksmanship.js').Marksmanship} marksmanship */
  constructor(marksmanship) {
    this._mrk     = marksmanship
    this._visible = false
    this._btns    = {}
    this._el      = this._build()
    document.body.appendChild(this._el)

    bus.on('equipment:changed', ({ slot }) => { if (slot === 'weapon') this._checkVisibility() })
    bus.on('marksmanship:ability-used', ({ id, cdMs }) => this._startCooldown(id, cdMs))

    window.addEventListener('keydown', e => {
      if (!this._visible) return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < ABILITIES.length) {
        e.preventDefault()
        bus.emit('marksmanship:ability', { id: ABILITIES[idx].id })
      }
    })

    // Poll for cooldown updates at 10fps
    setInterval(() => { if (this._visible) this._updateCooldowns() }, 100)
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const bar = document.createElement('div')
    bar.style.cssText = [
      'display:none;position:fixed;bottom:88px;left:50%;transform:translateX(-50%);',
      'display:none;flex-direction:row;gap:6px;z-index:200;',
      'font-family:"Courier New",monospace;',
    ].join('')

    for (const ab of ABILITIES) {
      const btn = document.createElement('div')
      btn.style.cssText = [
        `border:1px solid ${ab.color}44;border-radius:6px;`,
        'position:relative;width:56px;height:56px;cursor:pointer;',
        'background:rgba(4,10,4,0.92);overflow:hidden;',
        'transition:border-color 0.1s;',
      ].join('')
      btn.title = `${ab.name}\n${ab.desc}`

      // Icon area — colored glyph
      const icon = document.createElement('div')
      icon.style.cssText = [
        `color:${ab.color};font-size:18px;line-height:56px;text-align:center;`,
        'position:relative;z-index:2;user-select:none;',
      ].join('')
      icon.textContent = ab.key === '1' ? '◎' : ab.key === '2' ? '⋯' : ab.key === '3' ? '◈' : '⬥'

      // Keybind label
      const keybind = document.createElement('div')
      keybind.style.cssText = [
        'position:absolute;bottom:3px;right:5px;font-size:9px;',
        `color:${ab.color};opacity:0.6;z-index:3;`,
      ].join('')
      keybind.textContent = ab.key

      // Cooldown overlay (darkens over the button)
      const cdOverlay = document.createElement('div')
      cdOverlay.style.cssText = [
        'position:absolute;bottom:0;left:0;right:0;height:0%;',
        'background:rgba(0,0,0,0.72);z-index:1;transition:none;',
      ].join('')

      // Cooldown text
      const cdText = document.createElement('div')
      cdText.style.cssText = [
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
        'font-size:11px;color:#fff;z-index:4;display:none;',
      ].join('')

      btn.append(icon, keybind, cdOverlay, cdText)
      btn.addEventListener('click', () => bus.emit('marksmanship:ability', { id: ab.id }))
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = ab.color })
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = `${ab.color}44` })

      this._btns[ab.id] = { btn, cdOverlay, cdText, cdEnd: 0, cdTotal: 0 }
      bar.appendChild(btn)
    }

    return bar
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  _checkVisibility() {
    // Delay one frame so player.stats.combatStyle is updated
    setTimeout(() => {
      const isRanged = document.querySelector && true  // always check mrk style via event
      // Visibility controlled externally by main.js listening to equipment:changed
    }, 0)
  }

  show() {
    if (this._visible) return
    this._el.style.display = 'flex'
    this._visible = true
  }

  hide() {
    if (!this._visible) return
    this._el.style.display = 'none'
    this._visible = false
  }

  _startCooldown(id, cdMs) {
    const entry = this._btns[id]
    if (!entry) return
    entry.cdEnd   = Date.now() + cdMs
    entry.cdTotal = cdMs
  }

  _updateCooldowns() {
    const now = Date.now()
    for (const [, entry] of Object.entries(this._btns)) {
      const remaining = Math.max(0, entry.cdEnd - now)
      if (remaining === 0) {
        entry.cdOverlay.style.height = '0%'
        entry.cdText.style.display   = 'none'
      } else {
        const frac = remaining / entry.cdTotal
        entry.cdOverlay.style.height = `${frac * 100}%`
        entry.cdText.style.display   = 'block'
        entry.cdText.textContent     = (remaining / 1000).toFixed(1)
      }
    }
  }
}

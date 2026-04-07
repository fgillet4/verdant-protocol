/**
 * SettingsPanel — DOM-based pause / settings screen.
 * Replaces the Phaser SettingsScene with native HTML/CSS for crisp rendering.
 * Opened by UILayer on Escape. Persists settings to localStorage.
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

const LS_KEY = 'vp_settings'

export const DEFAULTS = {
  masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8, ambientVolume: 0.5,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  shadows: true, antialiasing: true, showFPS: false, showCoords: true,
  minimapSize: 160, chatOpacity: 0.82, uiScale: 1.0,
}

const KEYBINDS = [
  ['Move',              'Left Click ground'],
  ['Attack / Interact', 'Left Click object'],
  ['Context Menu',      'Right Click'],
  ['Orbit Camera',      'Middle Mouse drag'],
  ['Zoom',              'Scroll wheel'],
  ['Inventory',         'E'],
  ['Attack Style',      'Q'],
  ['Attunements',       '1'],
  ['Spells',            '2'],
  ['Skills',            '3'],
  ['Equipment',         '4'],
  ['Camera Pan',        'WASD / Arrows'],
  ['Chat',              'Enter'],
  ['Settings',          'Escape'],
  ['Debug Panel',       '`'],
]

export class SettingsPanel {
  constructor(onClose) {
    this._cfg    = { ...DEFAULTS, ...this._load() }
    this._tab    = 'audio'
    this._onClose = onClose
    this._build()
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    // ── Backdrop ──────────────────────────────────────────────────────────────
    const backdrop = document.createElement('div')
    backdrop.style.cssText = [
      'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:950;',
      'display:none;align-items:center;justify-content:center;',
      'font-family:"Courier New",monospace;',
    ].join('')
    backdrop.addEventListener('click', e => { if (e.target === backdrop) this._onClose?.() })
    document.body.appendChild(backdrop)
    this._backdrop = backdrop

    // ── Dialog ────────────────────────────────────────────────────────────────
    const dialog = document.createElement('div')
    dialog.style.cssText = [
      'display:flex;gap:0;border-radius:10px;overflow:hidden;',
      'border:1px solid rgba(46,125,50,0.4);',
      'box-shadow:0 8px 40px rgba(0,0,0,0.8);',
      'width:680px;height:500px;',
    ].join('')
    backdrop.appendChild(dialog)

    dialog.appendChild(this._buildSidebar())
    dialog.appendChild(this._buildContent())
    this._switchTab('audio')
  }

  _buildSidebar() {
    const side = document.createElement('div')
    side.style.cssText = [
      'width:190px;flex-shrink:0;background:#030d03;',
      'border-right:1px solid rgba(46,125,50,0.25);',
      'display:flex;flex-direction:column;padding:24px 12px 16px;gap:0;',
    ].join('')

    // Logo block
    const logo = document.createElement('div')
    logo.style.cssText = 'text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(46,125,50,0.2);'
    logo.innerHTML = `
      <div style="font-size:9px;letter-spacing:5px;color:#76ff03;margin-bottom:4px;">PAUSED</div>
      <div style="font-size:14px;color:#4caf50;">Verdant Protocol</div>
    `
    side.appendChild(logo)

    // Nav buttons
    this._navBtns = {}
    const navItems = [
      { id: 'resume',    label: 'Resume',      action: () => this._onClose?.() },
      { id: 'audio',     label: 'Audio',        tab: true },
      { id: 'graphics',  label: 'Graphics',     tab: true },
      { id: 'keybinds',  label: 'Keybinds',     tab: true },
      { id: 'interface', label: 'Interface',    tab: true },
    ]

    navItems.forEach(item => {
      const btn = document.createElement('button')
      btn.textContent = item.label
      btn.style.cssText = [
        'width:100%;padding:9px 14px;margin-bottom:4px;',
        'background:transparent;border:1px solid transparent;',
        'border-radius:5px;color:#81c784;font-family:"Courier New",monospace;',
        'font-size:11px;text-align:left;cursor:pointer;letter-spacing:0.05em;',
        'transition:background 0.15s,color 0.15s,border-color 0.15s;',
      ].join('')
      btn.addEventListener('mouseenter', () => {
        if (!btn.dataset.active) btn.style.background = 'rgba(76,175,80,0.08)'
      })
      btn.addEventListener('mouseleave', () => {
        if (!btn.dataset.active) btn.style.background = 'transparent'
      })
      btn.addEventListener('click', () => {
        if (item.action) { item.action(); return }
        if (item.tab) this._switchTab(item.id)
      })
      if (item.tab) this._navBtns[item.id] = btn
      side.appendChild(btn)
    })

    // Spacer
    const spacer = document.createElement('div')
    spacer.style.flex = '1'
    side.appendChild(spacer)

    // Exit button
    const exitBtn = document.createElement('button')
    exitBtn.textContent = 'Exit to Menu'
    exitBtn.style.cssText = [
      'width:100%;padding:9px 14px;',
      'background:transparent;border:1px solid rgba(239,83,80,0.3);',
      'border-radius:5px;color:#ef5350;font-family:"Courier New",monospace;',
      'font-size:11px;text-align:left;cursor:pointer;letter-spacing:0.05em;',
      'transition:background 0.15s;',
    ].join('')
    exitBtn.addEventListener('mouseenter', () => { exitBtn.style.background = 'rgba(239,83,80,0.1)' })
    exitBtn.addEventListener('mouseleave', () => { exitBtn.style.background = 'transparent' })
    exitBtn.addEventListener('click', () => {
      if (confirm('Return to menu? Unsaved progress may be lost.')) location.reload()
    })
    side.appendChild(exitBtn)

    const ver = document.createElement('div')
    ver.style.cssText = 'text-align:center;font-size:8px;color:#4caf50;opacity:0.3;margin-top:10px;'
    ver.textContent = 'v0.1.0-alpha'
    side.appendChild(ver)

    return side
  }

  _buildContent() {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'flex:1;background:#060f06;display:flex;flex-direction:column;overflow:hidden;'

    // Tab strip
    const strip = document.createElement('div')
    strip.style.cssText = [
      'display:flex;border-bottom:1px solid rgba(46,125,50,0.2);',
      'background:#040c04;flex-shrink:0;',
    ].join('')
    this._tabBtns = {}
    const tabs = ['audio', 'graphics', 'keybinds', 'interface']
    tabs.forEach(id => {
      const btn = document.createElement('button')
      btn.textContent = id.charAt(0).toUpperCase() + id.slice(1)
      btn.dataset.tabId = id
      btn.style.cssText = [
        'padding:10px 22px;background:transparent;border:none;border-bottom:2px solid transparent;',
        'color:#81c784;font-family:"Courier New",monospace;font-size:10px;',
        'cursor:pointer;letter-spacing:0.08em;transition:color 0.15s,border-color 0.15s;',
      ].join('')
      btn.addEventListener('click', () => this._switchTab(id))
      this._tabBtns[id] = btn
      strip.appendChild(btn)
    })
    wrap.appendChild(strip)

    // Content area
    const content = document.createElement('div')
    content.style.cssText = 'flex:1;overflow-y:auto;padding:24px 28px;scrollbar-width:thin;scrollbar-color:rgba(76,175,80,0.3) transparent;'
    this._content = content
    wrap.appendChild(content)

    return wrap
  }

  // ── Tab switching ──────────────────────────────────────────────────────────

  _switchTab(id) {
    this._tab = id

    // Update nav sidebar
    Object.entries(this._navBtns).forEach(([t, btn]) => {
      const active = t === id
      btn.dataset.active = active ? '1' : ''
      btn.style.background   = active ? 'rgba(76,175,80,0.14)' : 'transparent'
      btn.style.borderColor  = active ? 'rgba(76,175,80,0.35)' : 'transparent'
      btn.style.color        = active ? '#76ff03' : '#81c784'
    })

    // Update tab strip
    Object.entries(this._tabBtns).forEach(([t, btn]) => {
      const active = t === id
      btn.style.color       = active ? '#76ff03' : '#81c784'
      btn.style.borderBottomColor = active ? '#76ff03' : 'transparent'
    })

    // Render content
    this._content.innerHTML = ''
    if (id === 'audio')     this._buildAudio()
    if (id === 'graphics')  this._buildGraphics()
    if (id === 'keybinds')  this._buildKeybinds()
    if (id === 'interface') this._buildInterface()
  }

  // ── Section builders ──────────────────────────────────────────────────────

  _sectionTitle(text) {
    const el = document.createElement('div')
    el.style.cssText = 'font-size:8px;letter-spacing:3px;color:#4caf50;opacity:0.6;text-transform:uppercase;margin-bottom:12px;margin-top:4px;'
    el.textContent = text
    this._content.appendChild(el)
  }

  _divider() {
    const el = document.createElement('hr')
    el.style.cssText = 'border:none;border-top:1px solid rgba(46,125,50,0.15);margin:16px 0;'
    this._content.appendChild(el)
  }

  _sliderRow(label, key, min, max, step, fmt) {
    const val = this._cfg[key]
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:16px;'

    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;'
    const lbl = document.createElement('span')
    lbl.style.cssText = 'font-size:11px;color:#c8e6c9;'
    lbl.textContent = label
    const valEl = document.createElement('span')
    valEl.style.cssText = 'font-size:11px;color:#76ff03;'
    valEl.textContent = fmt(val)
    top.append(lbl, valEl)

    const input = document.createElement('input')
    input.type  = 'range'
    input.min   = min; input.max = max; input.step = step
    input.value = val
    input.style.cssText = [
      'width:100%;height:4px;appearance:none;-webkit-appearance:none;',
      'background:rgba(76,175,80,0.2);border-radius:2px;outline:none;cursor:pointer;',
    ].join('')
    input.addEventListener('input', () => {
      const v = parseFloat(input.value)
      valEl.textContent = fmt(v)
      this._cfg[key] = v
      this._save(); this._apply()
    })

    row.append(top, input)
    this._content.appendChild(row)
    return row
  }

  _toggleRow(label, key) {
    const row = document.createElement('label')
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;cursor:pointer;'

    const lbl = document.createElement('span')
    lbl.style.cssText = 'font-size:11px;color:#c8e6c9;'
    lbl.textContent = label

    const track = document.createElement('div')
    track.style.cssText = [
      'width:38px;height:20px;border-radius:10px;position:relative;',
      'transition:background 0.2s;flex-shrink:0;',
      `background:${this._cfg[key] ? '#2e7d32' : 'rgba(255,255,255,0.12)'};`,
    ].join('')
    const knob = document.createElement('div')
    knob.style.cssText = [
      'width:14px;height:14px;border-radius:50%;background:#fff;',
      'position:absolute;top:3px;transition:left 0.2s;',
      `left:${this._cfg[key] ? '21px' : '3px'};`,
    ].join('')
    track.appendChild(knob)

    const cb = document.createElement('input')
    cb.type    = 'checkbox'
    cb.checked = this._cfg[key]
    cb.style.display = 'none'
    cb.addEventListener('change', () => {
      const v = cb.checked
      track.style.background = v ? '#2e7d32' : 'rgba(255,255,255,0.12)'
      knob.style.left = v ? '21px' : '3px'
      this._cfg[key] = v
      this._save(); this._apply()
    })
    track.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')) })

    row.append(lbl, track, cb)
    this._content.appendChild(row)
    return row
  }

  _button(label, onClick, danger = false) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = [
      'padding:8px 18px;border-radius:5px;font-family:"Courier New",monospace;',
      'font-size:10px;cursor:pointer;letter-spacing:0.06em;transition:background 0.15s;',
      danger
        ? 'background:transparent;border:1px solid rgba(239,83,80,0.4);color:#ef5350;'
        : 'background:rgba(76,175,80,0.12);border:1px solid rgba(76,175,80,0.3);color:#76ff03;',
    ].join('')
    btn.addEventListener('mouseenter', () => { btn.style.background = danger ? 'rgba(239,83,80,0.12)' : 'rgba(76,175,80,0.22)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = danger ? 'transparent' : 'rgba(76,175,80,0.12)' })
    btn.addEventListener('click', onClick)
    this._content.appendChild(btn)
    return btn
  }

  // ── Tab content ────────────────────────────────────────────────────────────

  _buildAudio() {
    this._sectionTitle('Volume')
    this._sliderRow('Master',  'masterVolume',  0, 1, 0.01, x => Math.round(x*100)+'%')
    this._sliderRow('Music',   'musicVolume',   0, 1, 0.01, x => Math.round(x*100)+'%')
    this._sliderRow('SFX',     'sfxVolume',     0, 1, 0.01, x => Math.round(x*100)+'%')
    this._sliderRow('Ambient', 'ambientVolume', 0, 1, 0.01, x => Math.round(x*100)+'%')
    this._divider()
    const note = document.createElement('p')
    note.style.cssText = 'font-size:10px;color:#4caf50;opacity:0.5;margin:0;'
    note.textContent = 'Music and spatial SFX will use these values once the audio system is active.'
    this._content.appendChild(note)
  }

  _buildGraphics() {
    this._sectionTitle('Render Quality')
    this._sliderRow('Pixel Ratio', 'pixelRatio', 0.5, 2, 0.25, x => x.toFixed(2)+'×')
    this._divider()
    this._sectionTitle('Features')
    this._toggleRow('Shadows',                   'shadows')
    this._toggleRow('Antialiasing (needs reload)','antialiasing')
    this._toggleRow('Show FPS Counter',           'showFPS')
    this._toggleRow('Show Coordinates',           'showCoords')
    this._divider()
    this._button(document.fullscreenElement ? 'Exit Fullscreen' : 'Go Fullscreen', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen()
      else document.exitFullscreen()
    })
  }

  _buildKeybinds() {
    this._sectionTitle('Mouse')
    const mouse = KEYBINDS.filter(([,k]) => k.includes('Click') || k.includes('Mouse') || k.includes('Scroll'))
    const keys  = KEYBINDS.filter(([,k]) => !k.includes('Click') && !k.includes('Mouse') && !k.includes('Scroll'))

    this._kbTable(mouse)
    this._divider()
    this._sectionTitle('Keyboard')
    this._kbTable(keys)
  }

  _kbTable(rows) {
    const table = document.createElement('div')
    table.style.cssText = 'display:flex;flex-direction:column;gap:0;margin-bottom:4px;'
    rows.forEach(([action, key]) => {
      const row = document.createElement('div')
      row.style.cssText = [
        'display:flex;justify-content:space-between;align-items:center;',
        'padding:7px 0;border-bottom:1px solid rgba(46,125,50,0.1);',
      ].join('')
      const a = document.createElement('span')
      a.style.cssText = 'font-size:11px;color:#90a4ae;'
      a.textContent = action
      const k = document.createElement('span')
      k.style.cssText = [
        'font-size:10px;color:#76ff03;background:rgba(76,175,80,0.1);',
        'border:1px solid rgba(76,175,80,0.25);border-radius:3px;padding:2px 7px;',
      ].join('')
      k.textContent = key
      row.append(a, k)
      table.appendChild(row)
    })
    this._content.appendChild(table)
  }

  _buildInterface() {
    this._sectionTitle('HUD')
    this._sliderRow('UI Scale',     'uiScale',      0.7, 1.4, 0.05, x => Math.round(x*100)+'%')
    this._sliderRow('Minimap Size', 'minimapSize',  80, 220,  10,   x => x+'px')
    this._sliderRow('Chat Opacity', 'chatOpacity',  0.2, 1,   0.05, x => Math.round(x*100)+'%')
    this._divider()
    this._toggleRow('Show Coordinates', 'showCoords')
    this._toggleRow('Show FPS Counter', 'showFPS')
    this._divider()
    this._button('Reset to Defaults', () => {
      this._cfg = { ...DEFAULTS }
      this._save(); this._apply()
      this._switchTab('interface')
    }, true)
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  show() { this._backdrop.style.display = 'flex' }
  hide() { this._backdrop.style.display = 'none' }

  // ── Persistence + apply ────────────────────────────────────────────────────

  _load()  { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
  _save()  { localStorage.setItem(LS_KEY, JSON.stringify(this._cfg)) }

  _apply() {
    const s = this._cfg
    const r = document.querySelector('canvas:not(#phaser-ui-canvas)')
    if (r?.__three) r.__three.setPixelRatio(s.pixelRatio)

    const coords = document.getElementById('coords')
    if (coords) coords.style.display = s.showCoords ? '' : 'none'

    let fpsEl = document.getElementById('fps-counter')
    if (s.showFPS && !fpsEl) {
      fpsEl = Object.assign(document.createElement('div'), { id: 'fps-counter' })
      fpsEl.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);font-size:9px;opacity:0.4;font-family:"Courier New",monospace;pointer-events:none;z-index:900;color:#76ff03;'
      document.body.appendChild(fpsEl)
      let fr = 0, last = performance.now()
      const tick = () => { fr++; const n = performance.now(); if (n-last >= 1000) { fpsEl.textContent = fr+' fps'; fr=0; last=n }; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    } else if (!s.showFPS) fpsEl?.remove()

    const sz = s.minimapSize
    document.getElementById('minimap-canvas')?.setAttribute('style', `width:${sz}px;height:${sz}px`)
    const mmw = document.getElementById('minimap-wrap')
    if (mmw) { mmw.style.width = sz+'px'; mmw.style.height = sz+'px' }

    const cb = document.getElementById('chat-box')
    if (cb) cb.style.background = `rgba(3,8,3,${s.chatOpacity})`

    const hud = document.getElementById('hud')
    if (hud) hud.style.transform = `scale(${s.uiScale})`

    bus.emit('settings:changed', { ...s })
  }
}

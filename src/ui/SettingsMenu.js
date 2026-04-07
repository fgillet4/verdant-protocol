/**
 * SettingsMenu — Escape-key pause screen with Audio / Graphics / Controls tabs.
 * Persists settings to localStorage. Pauses the GameLoop while open.
 * Inspired by Phaser's pause-scene pattern: full overlay, tabbed panel.
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

const LS_KEY = 'vp_settings'

const DEFAULTS = {
  masterVolume: 0.8,
  musicVolume:  0.6,
  sfxVolume:    0.8,
  ambientVolume:0.5,
  pixelRatio:   Math.min(window.devicePixelRatio, 2),
  shadows:      true,
  antialiasing: true,
  showFPS:      false,
  showCoords:   true,
  minimapSize:  160,
  chatOpacity:  0.82,
  uiScale:      1.0,
}

const KEYBINDS = [
  { action: 'Move (click)',       key: 'Left Click' },
  { action: 'Attack',             key: 'Left Click (enemy)' },
  { action: 'Toggle Skills',      key: 'Tab' },
  { action: 'Toggle Inventory',   key: 'I' },
  { action: 'Toggle Map',         key: 'M' },
  { action: 'Toggle Attunements', key: 'Z' },
  { action: 'Toggle Debug',       key: '`' },
  { action: 'Ability 1',          key: '1' },
  { action: 'Ability 2',          key: '2' },
  { action: 'Ability 3',          key: '3' },
  { action: 'Ability 4',          key: '4' },
  { action: 'Camera Pan',         key: 'WASD' },
  { action: 'Zoom',               key: 'Scroll' },
  { action: 'Chat',               key: 'Enter' },
  { action: 'Context Menu',       key: 'Right Click' },
]

export class SettingsMenu {
  /**
   * @param {import('../engine/GameLoop.js').GameLoop} gameLoop
   * @param {import('../engine/Engine.js').Engine} engine
   */
  constructor(gameLoop, engine) {
    this._gameLoop   = gameLoop
    this._engine     = engine
    this._open       = false
    this._activeTab  = 'audio'
    this._settings   = this._load()

    this._el = this._build()
    document.body.appendChild(this._el)

    this._apply()

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        // don't fire while typing
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'range') return
        this.toggle()
      }
    })
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  toggle() {
    this._open ? this.close() : this.open()
  }

  open() {
    this._open = true
    this._el.classList.add('open')
    this._gameLoop.stop()
    bus.emit('ui:paused', {})
  }

  close() {
    this._open = false
    this._el.classList.remove('open')
    this._gameLoop.start()
    bus.emit('ui:resumed', {})
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build() {
    const overlay = document.createElement('div')
    overlay.id = 'settings-overlay'

    // Click backdrop to close (but not the panel itself)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) this.close()
    })

    // ── Left: pause menu buttons ────────────────────────────────────────────
    const menu = document.createElement('div')
    menu.id = 'settings-menu'

    const logo = document.createElement('div')
    logo.id = 'settings-logo'
    logo.innerHTML = `
      <div id="settings-paused-text">PAUSED</div>
      <div id="settings-subtitle">Verdant Protocol</div>
    `

    const navBtns = [
      { id: 'btn-resume',   label: 'Resume',      action: () => this.close() },
      { id: 'btn-audio',    label: 'Audio',        action: () => this._openTab('audio') },
      { id: 'btn-graphics', label: 'Graphics',     action: () => this._openTab('graphics') },
      { id: 'btn-controls', label: 'Controls',     action: () => this._openTab('controls') },
      { id: 'btn-game',     label: 'Interface',    action: () => this._openTab('interface') },
    ]

    const nav = document.createElement('div')
    nav.id = 'settings-nav'

    navBtns.forEach(b => {
      const el = document.createElement('div')
      el.className = 'smenu-btn' + (b.id === 'btn-resume' ? ' primary' : '')
      el.id = b.id
      el.textContent = b.label
      el.addEventListener('click', b.action)
      nav.appendChild(el)
    })

    const exitBtn = document.createElement('div')
    exitBtn.className = 'smenu-btn danger'
    exitBtn.textContent = 'Exit to Menu'
    exitBtn.addEventListener('click', () => {
      if (confirm('Return to the main menu? Unsaved progress may be lost.')) {
        location.reload()
      }
    })

    const ver = document.createElement('div')
    ver.id = 'settings-version'
    ver.textContent = 'v0.1.0-alpha'

    menu.append(logo, nav, exitBtn, ver)

    // ── Right: settings panel ───────────────────────────────────────────────
    const panel = document.createElement('div')
    panel.id = 'settings-panel'

    const panelHeader = document.createElement('div')
    panelHeader.id = 'settings-panel-header'

    const tabs = ['audio', 'graphics', 'controls', 'interface']
    tabs.forEach(t => {
      const tab = document.createElement('div')
      tab.className = 'spanel-tab'
      tab.dataset.tab = t
      tab.textContent = t.charAt(0).toUpperCase() + t.slice(1)
      tab.addEventListener('click', () => this._openTab(t))
      panelHeader.appendChild(tab)
    })

    const panelBody = document.createElement('div')
    panelBody.id = 'settings-panel-body'
    this._panelBody = panelBody

    panel.append(panelHeader, panelBody)

    overlay.append(menu, panel)

    this._overlay   = overlay
    this._nav       = nav
    this._panelHeader = panelHeader

    this._openTab('audio')
    return overlay
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  _openTab(tab) {
    this._activeTab = tab

    // Highlight nav button
    this._nav.querySelectorAll('.smenu-btn').forEach(b => b.classList.remove('active'))
    const map = { audio:'btn-audio', graphics:'btn-graphics', controls:'btn-controls', interface:'btn-game' }
    document.getElementById(map[tab])?.classList.add('active')

    // Highlight panel tab
    this._panelHeader.querySelectorAll('.spanel-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab)
    })

    const body = this._panelBody
    body.innerHTML = ''

    if (tab === 'audio')     this._buildAudio(body)
    if (tab === 'graphics')  this._buildGraphics(body)
    if (tab === 'controls')  this._buildControls(body)
    if (tab === 'interface') this._buildInterface(body)
  }

  // ── Audio tab ──────────────────────────────────────────────────────────────

  _buildAudio(body) {
    body.appendChild(this._sectionTitle('Volume'))

    const sliders = [
      { key: 'masterVolume',  label: 'Master',  color: '#76ff03' },
      { key: 'musicVolume',   label: 'Music',   color: '#80cbc4' },
      { key: 'sfxVolume',     label: 'SFX',     color: '#ffd54f' },
      { key: 'ambientVolume', label: 'Ambient', color: '#a5d6a7' },
    ]

    sliders.forEach(s => {
      body.appendChild(this._slider(s.label, s.key, 0, 1, 0.01, s.color, v => {
        this._settings[s.key] = v
        this._save()
        this._apply()
      }))
    })

    body.appendChild(this._divider())
    body.appendChild(this._sectionTitle('Output'))
    body.appendChild(this._note('Music and spatial SFX will use these values when the audio system is initialised.'))
  }

  // ── Graphics tab ───────────────────────────────────────────────────────────

  _buildGraphics(body) {
    body.appendChild(this._sectionTitle('Render Quality'))

    body.appendChild(this._slider('Pixel Ratio', 'pixelRatio', 0.5, 2, 0.25, '#76ff03', v => {
      this._settings.pixelRatio = v
      this._save()
      this._apply()
    }, x => x.toFixed(2) + '×'))

    body.appendChild(this._divider())
    body.appendChild(this._sectionTitle('Features'))

    body.appendChild(this._toggle('Shadows', 'shadows', v => {
      this._settings.shadows = v
      this._save()
      this._apply()
    }))

    body.appendChild(this._toggle('Antialiasing', 'antialiasing', v => {
      this._settings.antialiasing = v
      this._save()
      body.innerHTML = ''
      this._buildGraphics(body)
      this._note2(body, 'Antialiasing change takes effect on next reload.')
    }))

    body.appendChild(this._toggle('Show FPS Counter', 'showFPS', v => {
      this._settings.showFPS = v
      this._save()
      this._apply()
    }))

    body.appendChild(this._toggle('Show Coordinates', 'showCoords', v => {
      this._settings.showCoords = v
      this._save()
      this._apply()
    }))

    body.appendChild(this._divider())

    const fullBtn = document.createElement('div')
    fullBtn.className = 'ssetting-btn'
    fullBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Go Fullscreen'
    fullBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen()
      else document.exitFullscreen()
      fullBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Go Fullscreen'
    })
    body.appendChild(fullBtn)
  }

  // ── Controls tab ───────────────────────────────────────────────────────────

  _buildControls(body) {
    body.appendChild(this._sectionTitle('Keybinds'))
    body.appendChild(this._note('Rebinding coming in a future update. Current bindings:'))

    const table = document.createElement('div')
    table.id = 'keybind-table'

    KEYBINDS.forEach(kb => {
      const row = document.createElement('div')
      row.className = 'keybind-row'
      row.innerHTML = `
        <span class="kb-action">${kb.action}</span>
        <span class="kb-key">${kb.key}</span>
      `
      table.appendChild(row)
    })

    body.appendChild(table)
  }

  // ── Interface tab ──────────────────────────────────────────────────────────

  _buildInterface(body) {
    body.appendChild(this._sectionTitle('HUD'))

    body.appendChild(this._slider('UI Scale', 'uiScale', 0.7, 1.4, 0.05, '#76ff03', v => {
      this._settings.uiScale = v
      this._save()
      this._apply()
    }, x => (x * 100).toFixed(0) + '%'))

    body.appendChild(this._slider('Minimap Size', 'minimapSize', 80, 220, 10, '#80cbc4', v => {
      this._settings.minimapSize = v
      this._save()
      this._apply()
    }, x => x + 'px'))

    body.appendChild(this._slider('Chat Opacity', 'chatOpacity', 0.2, 1, 0.05, '#a5d6a7', v => {
      this._settings.chatOpacity = v
      this._save()
      this._apply()
    }, x => (x * 100).toFixed(0) + '%'))

    body.appendChild(this._divider())
    body.appendChild(this._sectionTitle('Info'))
    body.appendChild(this._toggle('Show Coordinates', 'showCoords', v => {
      this._settings.showCoords = v
      this._save()
      this._apply()
    }))
    body.appendChild(this._toggle('Show FPS Counter', 'showFPS', v => {
      this._settings.showFPS = v
      this._save()
      this._apply()
    }))

    body.appendChild(this._divider())
    const resetBtn = document.createElement('div')
    resetBtn.className = 'ssetting-btn danger'
    resetBtn.textContent = 'Reset to Defaults'
    resetBtn.addEventListener('click', () => {
      this._settings = { ...DEFAULTS }
      this._save()
      this._apply()
      body.innerHTML = ''
      this._buildInterface(body)
    })
    body.appendChild(resetBtn)
  }

  // ── Apply settings to engine ───────────────────────────────────────────────

  _apply() {
    const s = this._settings
    const r = this._engine?.renderer

    // Renderer quality
    if (r) {
      r.setPixelRatio(s.pixelRatio ?? DEFAULTS.pixelRatio)
      r.shadowMap.enabled = s.shadows ?? DEFAULTS.shadows
    }

    // Coordinates HUD
    const coords = document.getElementById('coords')
    if (coords) coords.style.display = (s.showCoords ?? DEFAULTS.showCoords) ? '' : 'none'

    // FPS counter
    let fpsEl = document.getElementById('fps-counter')
    if (s.showFPS ?? DEFAULTS.showFPS) {
      if (!fpsEl) {
        fpsEl = document.createElement('div')
        fpsEl.id = 'fps-counter'
        fpsEl.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);font-size:9px;opacity:0.4;font-family:"Courier New",monospace;pointer-events:none;z-index:900;'
        document.body.appendChild(fpsEl)
        let frames = 0, last = performance.now()
        const tick = () => {
          frames++
          const now = performance.now()
          if (now - last >= 1000) {
            fpsEl.textContent = `${frames} fps`
            frames = 0; last = now
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    } else {
      fpsEl?.remove()
    }

    // Minimap size
    const mmCanvas = document.getElementById('minimap-canvas')
    const mmWrap   = document.getElementById('minimap-wrap')
    const sz = s.minimapSize ?? DEFAULTS.minimapSize
    if (mmCanvas) { mmCanvas.style.width = sz + 'px'; mmCanvas.style.height = sz + 'px' }
    if (mmWrap)   { mmWrap.style.width = sz + 'px';   mmWrap.style.height  = sz + 'px' }

    // Chat opacity
    const chatBox = document.getElementById('chat-box')
    if (chatBox) chatBox.style.background = `rgba(3,8,3,${s.chatOpacity ?? DEFAULTS.chatOpacity})`

    // UI scale (scale the HUD)
    const hud = document.getElementById('hud')
    if (hud) hud.style.transform = `scale(${s.uiScale ?? DEFAULTS.uiScale})`

    // Emit so audio system can pick this up later
    bus.emit('settings:changed', { ...s })
  }

  // ── Persist ────────────────────────────────────────────────────────────────

  _load() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }
    } catch {
      return { ...DEFAULTS }
    }
  }

  _save() {
    localStorage.setItem(LS_KEY, JSON.stringify(this._settings))
  }

  // ── Widget helpers ─────────────────────────────────────────────────────────

  _sectionTitle(text) {
    const el = document.createElement('div')
    el.className = 'ssection-title'
    el.textContent = text
    return el
  }

  _divider() {
    const el = document.createElement('div')
    el.className = 'sdivider'
    return el
  }

  _note(text) {
    const el = document.createElement('div')
    el.className = 'snote'
    el.textContent = text
    return el
  }

  _note2(body, text) {
    const el = this._note(text)
    body.appendChild(el)
  }

  _slider(label, key, min, max, step, color, onChange, fmt = x => (x * 100).toFixed(0) + '%') {
    const val   = this._settings[key] ?? DEFAULTS[key]
    const wrap  = document.createElement('div')
    wrap.className = 'ssetting-row'

    const valEl = document.createElement('span')
    valEl.className = 'ssetting-value'
    valEl.textContent = fmt(val)

    const input = document.createElement('input')
    input.type  = 'range'
    input.min   = min; input.max = max; input.step = step
    input.value = val
    input.style.setProperty('--track-color', color)
    input.addEventListener('input', () => {
      valEl.textContent = fmt(+input.value)
      onChange(+input.value)
    })

    wrap.innerHTML = `<span class="ssetting-label">${label}</span>`
    wrap.append(valEl, input)
    return wrap
  }

  _toggle(label, key, onChange) {
    const val  = this._settings[key] ?? DEFAULTS[key]
    const wrap = document.createElement('div')
    wrap.className = 'ssetting-row'

    const toggle = document.createElement('label')
    toggle.className = 'stoggle'
    const cb = document.createElement('input')
    cb.type    = 'checkbox'
    cb.checked = val
    cb.addEventListener('change', () => onChange(cb.checked))
    const knob = document.createElement('span')
    knob.className = 'stoggle-knob'
    toggle.append(cb, knob)

    wrap.innerHTML = `<span class="ssetting-label">${label}</span>`
    wrap.appendChild(toggle)
    return wrap
  }
}

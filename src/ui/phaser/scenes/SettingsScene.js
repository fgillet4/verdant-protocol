/**
 * SettingsScene — Phaser scene for the escape-key pause / settings screen.
 * Sleeps by default; woken by UILayer.open(). Persists to localStorage.
 * OWNED BY: ui-agent
 */
import Phaser from 'phaser'
import { bus } from '../../../utils/EventBus.js'
import { makeNavButton } from './SettingsWidgets.js'
import { buildAudioTab, buildGraphicsTab, buildControlsTab, buildInterfaceTab } from './SettingsSceneTabs.js'

const LS_KEY  = 'vp_settings'
export const DEFAULTS = {
  masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8, ambientVolume: 0.5,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  shadows: true, antialiasing: true, dynamicSky: true, showFPS: false, showCoords: true,
  minimapSize: 160, chatOpacity: 0.82, uiScale: 1.0,
}

const MENU_W = 200, PANEL_W = 440, GAP = 16, TOTAL_H = 540

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene', active: true })
    this._cfg  = { ...DEFAULTS, ...this._load() }
    this._tab  = 'audio'
    this._w    = []   // widget objects (have .destroy())
    this._o    = []   // plain phaser game objects
    this._navBtns = {}
    this._tabBtns = {}
    // Bound so tab builders can call it
    this._onSet = (key, val) => { this._cfg[key] = val; this._save(); this._apply() }
  }

  create() {
    const W = this.scale.width, H = this.scale.height
    const lx = (W - MENU_W - GAP - PANEL_W) / 2
    const ty = (H - TOTAL_H) / 2

    // Semi-transparent backdrop — click outside to close
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.78).setInteractive()
      .on('pointerdown', () => this.reg('uiLayer')?.close())

    this._buildLeftMenu(lx, ty, MENU_W, TOTAL_H)
    this._buildRightPanel(lx + MENU_W + GAP, ty, PANEL_W, TOTAL_H)
    this.openTab(this._tab)
    this.scene.sleep()
  }

  reg(key) { return this.sys.game.registry.get(key) }

  // ── Panels ─────────────────────────────────────────────────────────────────

  _buildLeftMenu(x, y, w, h) {
    this._panel(x, y, w, h)
    this.add.text(x + w / 2, y + 20, 'PAUSED',
      { fontFamily: '"Courier New",monospace', fontSize: '10px', color: '#76ff03', letterSpacing: 5 }).setOrigin(0.5, 0)
    this.add.text(x + w / 2, y + 38, 'Verdant Protocol',
      { fontFamily: '"Courier New",monospace', fontSize: '13px', color: '#4caf50' }).setOrigin(0.5, 0)
    this._hline(x + 10, y + 62, w - 20)

    makeNavButton(this, x + 8, y + 74, w - 16, 32, 'Resume',
      () => this.reg('uiLayer')?.close())

    const tabs = ['audio', 'graphics', 'controls', 'interface']
    const NAV_LABELS = { controls: 'Keybinds' }
    tabs.forEach((t, i) => {
      const label = NAV_LABELS[t] ?? (t.charAt(0).toUpperCase() + t.slice(1))
      const btn   = makeNavButton(this, x + 8, y + 118 + i * 38, w - 16, 30, label, () => this.openTab(t))
      this._navBtns[t] = btn
    })

    makeNavButton(this, x + 8, y + h - 46, w - 16, 30, 'Exit to Menu',
      () => { if (confirm('Return to menu? Unsaved progress may be lost.')) location.reload() },
      { danger: true })

    this.add.text(x + w / 2, y + h - 8, 'v0.1.0-alpha',
      { fontFamily: '"Courier New",monospace', fontSize: '8px', color: '#4caf50', alpha: 0.3 }).setOrigin(0.5, 1)
  }

  _buildRightPanel(x, y, w, h) {
    this._panel(x, y, w, h)
    this._rpX = x; this._rpY = y; this._rpW = w; this._rpH = h

    const tabs = ['audio', 'graphics', 'controls', 'interface']
    const tabW = (w - 8) / tabs.length

    const TAB_LABELS = { controls: 'Keys' }
    tabs.forEach((t, i) => {
      const tx  = x + 4 + i * tabW
      const ty  = y + 4
      const bg  = this.add.graphics()
      const txt = this.add.text(tx + tabW / 2, ty + 14, TAB_LABELS[t] ?? (t.charAt(0).toUpperCase() + t.slice(1)),
        { fontFamily: '"Courier New",monospace', fontSize: '10px', color: '#81c784' }).setOrigin(0.5)
      const zone = this.add.zone(tx + tabW / 2, ty + 14, tabW - 4, 26).setInteractive({ useHandCursor: true })
      zone.on('pointerdown', () => this.openTab(t))
      zone.on('pointerover',  () => { if (this._tab !== t) { bg.clear(); bg.fillStyle(0x1a2f1a); bg.fillRoundedRect(tx, ty, tabW - 4, 26, 4) } })
      zone.on('pointerout',   () => { if (this._tab !== t) bg.clear() })
      this._tabBtns[t] = { bg, txt, tx, ty, tabW }
    })
  }

  // ── Tab management ─────────────────────────────────────────────────────────

  openTab(tab) {
    this._tab = tab

    // Update nav button active states
    Object.entries(this._navBtns).forEach(([t, btn]) => btn.setActive(t === tab))

    // Update tab header styles
    Object.entries(this._tabBtns).forEach(([t, { bg, txt, tx, ty, tabW }]) => {
      bg.clear()
      if (t === tab) {
        bg.fillStyle(0x1b5e20); bg.fillRoundedRect(tx, ty, tabW - 4, 26, 4)
        bg.lineStyle(1, 0x76ff03, 0.4); bg.strokeRoundedRect(tx, ty, tabW - 4, 26, 4)
        txt.setColor('#76ff03')
      } else txt.setColor('#81c784')
    })

    // Destroy previous content
    this._w.forEach(w => w.destroy?.())
    this._o.forEach(o => o.destroy?.())
    this._w = []; this._o = []

    const cx = this._rpX + 16, cw = this._rpW - 32
    const cy = this._rpY + 44

    if (tab === 'audio')     buildAudioTab(this, cx, cy, cw)
    if (tab === 'graphics')  buildGraphicsTab(this, cx, cy, cw)
    if (tab === 'controls')  buildControlsTab(this, cx, cy, cw)
    if (tab === 'interface') buildInterfaceTab(this, cx, cy, cw)
  }

  resetDefaults() {
    this._cfg = { ...DEFAULTS }; this._save(); this._apply()
  }

  // ── Draw helpers ───────────────────────────────────────────────────────────

  _panel(x, y, w, h) {
    const g = this.add.graphics()
    g.fillStyle(0x030d03, 0.97); g.fillRoundedRect(x, y, w, h, 8)
    g.lineStyle(1, 0x2e7d32, 0.35); g.strokeRoundedRect(x, y, w, h, 8)
  }
  _hline(x, y, w) {
    const g = this.add.graphics()
    g.lineStyle(1, 0x2e7d32, 0.22); g.lineBetween(x, y, x + w, y)
  }

  // ── Settings persistence + apply ──────────────────────────────────────────

  _load()  { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
  _save()  { localStorage.setItem(LS_KEY, JSON.stringify(this._cfg)) }

  _apply() {
    const s = this._cfg, engine = this.reg('engine'), r = engine?.renderer
    if (r) { r.setPixelRatio(s.pixelRatio); r.shadowMap.enabled = s.shadows }

    const dayCycle = this.reg('dayCycle')
    if (engine?.skySystem) engine.skySystem.setDynamic(s.dynamicSky)
    if (dayCycle) dayCycle.paused = !s.dynamicSky

    const coords  = document.getElementById('coords')
    if (coords) coords.style.display = s.showCoords ? '' : 'none'

    let fpsEl = document.getElementById('fps-counter')
    if (s.showFPS && !fpsEl) {
      fpsEl = Object.assign(document.createElement('div'), { id: 'fps-counter' })
      fpsEl.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);font-size:9px;opacity:0.4;font-family:"Courier New",monospace;pointer-events:none;z-index:900;'
      document.body.appendChild(fpsEl)
      let fr = 0, last = performance.now()
      const tick = () => { fr++; const n = performance.now(); if (n - last >= 1000) { fpsEl.textContent = fr + ' fps'; fr = 0; last = n }; requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    } else if (!s.showFPS) fpsEl?.remove()

    const sz = s.minimapSize
    document.getElementById('minimap-canvas')?.setAttribute('style', `width:${sz}px;height:${sz}px`)
    const mmw = document.getElementById('minimap-wrap')
    if (mmw) { mmw.style.width = sz + 'px'; mmw.style.height = sz + 'px' }

    const cb = document.getElementById('chat-box')
    if (cb) cb.style.background = `rgba(3,8,3,${s.chatOpacity})`

    const hud = document.getElementById('hud')
    if (hud) hud.style.transform = `scale(${s.uiScale})`

    bus.emit('settings:changed', { ...s })
  }
}

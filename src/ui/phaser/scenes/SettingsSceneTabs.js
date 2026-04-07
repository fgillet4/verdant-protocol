/**
 * SettingsSceneTabs — tab content builders for SettingsScene.
 * Each exported function fills a content region with Phaser objects.
 * scene._w (widgets) and scene._o (other game objects) are tracked for cleanup.
 * OWNED BY: ui-agent
 */
import { makeSlider, makeToggle, makeNavButton } from './SettingsWidgets.js'

const TS = { fontFamily: '"Courier New",monospace', color: '#c8e6c9' }
const DIM = '#81c784'

const KEYBINDS = [
  ['Move',          'Left Click'],
  ['Attack',        'Left Click enemy'],
  ['Chop / Mine',   'Left Click resource'],
  ['Inventory',     'E'],
  ['Attack Style',  'Q'],
  ['Attunements',   '1'],
  ['Spells',        '2'],
  ['Skills',        '3'],
  ['Equipment',     '4'],
  ['Camera Pan',    'WASD / Arrows'],
  ['Zoom',          'Scroll'],
  ['Chat',          'Enter'],
  ['Context Menu',  'Right Click'],
  ['Settings',      'Escape'],
  ['Debug Panel',   '`'],
  ['Map',           'M'],
]

// ── Row helpers ──────────────────────────────────────────────────────────────

function sliderRow(sc, cx, cy, cw, label, key, min, max, step, color, fmt, onSet) {
  const val  = sc._cfg[key]
  const lbl  = sc.add.text(cx, cy, label, { ...TS, fontSize: '10px' })
  const valT = sc.add.text(cx + cw, cy, fmt(val), { ...TS, fontSize: '10px', color: '#76ff03' }).setOrigin(1, 0)
  sc._o.push(lbl, valT)

  const sy = cy + 18
  const slider = makeSlider(sc, cx, sy, cw, color, { min, max, value: val }, v => {
    sc._cfg[key] = v
    valT.setText(fmt(v))
    onSet(key, v)
  })
  sc._w.push(slider)
  return sy + 14
}

function toggleRow(sc, cx, cy, cw, label, key, onSet) {
  const lbl = sc.add.text(cx, cy + 9, label, { ...TS, fontSize: '10px' }).setOrigin(0, 0.5)
  sc._o.push(lbl)
  const tgl = makeToggle(sc, cx + cw - 36, cy + 9, sc._cfg[key], v => onSet(key, v))
  sc._w.push(tgl)
  return cy + 26
}

function sectionTitle(sc, cx, cy, text) {
  const t = sc.add.text(cx, cy, text.toUpperCase(), { ...TS, fontSize: '8px', color: DIM, letterSpacing: 3, alpha: 0.65 })
  sc._o.push(t)
  return cy + 14
}

function divider(sc, cx, cy, cw) {
  const g = sc.add.graphics()
  g.lineStyle(1, 0x1a3d1a, 0.5)
  g.lineBetween(cx, cy, cx + cw, cy)
  sc._o.push(g)
  return cy + 8
}

function note(sc, cx, cy, cw, text) {
  const t = sc.add.text(cx, cy, text, { ...TS, fontSize: '9px', color: DIM, alpha: 0.6, wordWrap: { width: cw } })
  sc._o.push(t)
  return cy + t.height + 4
}

// ── Tab builders ─────────────────────────────────────────────────────────────

export function buildAudioTab(sc, cx, cy, cw) {
  cy = sectionTitle(sc, cx, cy, 'Volume') + 4

  const vols = [
    { key: 'masterVolume',  label: 'Master',  color: 0x76ff03 },
    { key: 'musicVolume',   label: 'Music',   color: 0x80cbc4 },
    { key: 'sfxVolume',     label: 'SFX',     color: 0xffd54f },
    { key: 'ambientVolume', label: 'Ambient', color: 0xa5d6a7 },
  ]
  vols.forEach(v => {
    cy = sliderRow(sc, cx, cy, cw, v.label, v.key, 0, 1, 0.01, v.color,
      x => (x * 100).toFixed(0) + '%', sc._onSet) + 8
  })
  cy = divider(sc, cx, cy, cw)
  cy = note(sc, cx, cy, cw, 'Music and spatial SFX will use these values once the audio system is active.')
}

export function buildGraphicsTab(sc, cx, cy, cw) {
  cy = sectionTitle(sc, cx, cy, 'Render Quality') + 4
  cy = sliderRow(sc, cx, cy, cw, 'Pixel Ratio', 'pixelRatio', 0.5, 2, 0.25, 0x76ff03,
    x => x.toFixed(2) + '×', sc._onSet) + 8
  cy = divider(sc, cx, cy, cw)
  cy = sectionTitle(sc, cx, cy, 'Features') + 4
  cy = toggleRow(sc, cx, cy, cw, 'Shadows', 'shadows', sc._onSet) + 4
  cy = toggleRow(sc, cx, cy, cw, 'Antialiasing (needs reload)', 'antialiasing', sc._onSet) + 4
  cy = toggleRow(sc, cx, cy, cw, 'Show FPS Counter', 'showFPS', sc._onSet) + 4
  cy = toggleRow(sc, cx, cy, cw, 'Show Coordinates', 'showCoords', sc._onSet) + 4
  cy = divider(sc, cx, cy, cw)

  const btn = makeNavButton(sc, cx, cy, cw, 28,
    document.fullscreenElement ? 'Exit Fullscreen' : 'Go Fullscreen',
    () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen()
      else document.exitFullscreen()
      btn.setLabel(document.fullscreenElement ? 'Exit Fullscreen' : 'Go Fullscreen')
    })
  sc._w.push(btn)
}

export function buildControlsTab(sc, cx, cy, cw) {
  cy = sectionTitle(sc, cx, cy, 'Mouse') + 4
  const mouse = [
    ['Move', 'Left Click ground'],
    ['Attack / Interact', 'Left Click object'],
    ['Context Menu', 'Right Click'],
    ['Orbit Camera', 'Middle Mouse drag'],
    ['Zoom', 'Scroll wheel'],
  ]
  mouse.forEach(([action, key]) => {
    const at = sc.add.text(cx, cy, action, { ...TS, fontSize: '10px', color: DIM })
    const kt = sc.add.text(cx + cw, cy, key, { ...TS, fontSize: '10px', color: '#76ff03' }).setOrigin(1, 0)
    const ln = sc.add.graphics(); ln.lineStyle(1, 0x1a3d1a, 0.4); ln.lineBetween(cx, cy + 17, cx + cw, cy + 17)
    sc._o.push(at, kt, ln); cy += 20
  })
  cy = divider(sc, cx, cy + 4, cw)
  cy = sectionTitle(sc, cx, cy, 'Keyboard') + 4
  const keys = KEYBINDS.filter(([,k]) => !k.includes('Click') && k !== 'Scroll wheel')
  keys.forEach(([action, key]) => {
    const at = sc.add.text(cx, cy, action, { ...TS, fontSize: '10px', color: DIM })
    const kt = sc.add.text(cx + cw, cy, key, { ...TS, fontSize: '10px', color: '#76ff03' }).setOrigin(1, 0)
    const ln = sc.add.graphics(); ln.lineStyle(1, 0x1a3d1a, 0.4); ln.lineBetween(cx, cy + 17, cx + cw, cy + 17)
    sc._o.push(at, kt, ln); cy += 20
  })
}

export function buildInterfaceTab(sc, cx, cy, cw) {
  cy = sectionTitle(sc, cx, cy, 'HUD') + 4
  cy = sliderRow(sc, cx, cy, cw, 'UI Scale', 'uiScale', 0.7, 1.4, 0.05, 0x76ff03,
    x => (x * 100).toFixed(0) + '%', sc._onSet) + 8
  cy = sliderRow(sc, cx, cy, cw, 'Minimap Size', 'minimapSize', 80, 220, 10, 0x80cbc4,
    x => x + 'px', sc._onSet) + 8
  cy = sliderRow(sc, cx, cy, cw, 'Chat Opacity', 'chatOpacity', 0.2, 1, 0.05, 0xa5d6a7,
    x => (x * 100).toFixed(0) + '%', sc._onSet) + 8
  cy = divider(sc, cx, cy, cw)
  cy = toggleRow(sc, cx, cy, cw, 'Show Coordinates', 'showCoords', sc._onSet) + 4
  cy = toggleRow(sc, cx, cy, cw, 'Show FPS Counter', 'showFPS', sc._onSet) + 4
  cy = divider(sc, cx, cy, cw)

  const resetBtn = makeNavButton(sc, cx, cy, cw, 28, 'Reset to Defaults', () => {
    sc.resetDefaults()
    sc.openTab('interface')
  }, { danger: true })
  sc._w.push(resetBtn)
}

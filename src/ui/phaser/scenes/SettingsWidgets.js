/**
 * SettingsWidgets — reusable Phaser widget factory functions for the settings scene.
 * All return { destroy() } objects. Widgets render via Phaser graphics/gameobjects.
 * OWNED BY: ui-agent
 */

const TRACK_BG   = 0x0d1f0d
const KNOB_OFF   = 0x1a3d1a
const KNOB_ON    = 0x2e7d32
const TEXT_STYLE = { fontFamily: '"Courier New",monospace', color: '#c8e6c9' }

/**
 * Draggable horizontal slider.
 * @param {Phaser.Scene} scene
 * @param {number} x  track left x
 * @param {number} y  centre y
 * @param {number} w  track width
 * @param {number} color  fill colour (0xRRGGBB)
 * @param {object} opts  { min, max, value }
 * @param {(v:number)=>void} onChange
 * @returns {{ destroy():void, setValue(v:number):void }}
 */
export function makeSlider(scene, x, y, w, color, { min, max, value }, onChange) {
  const H = 4, R = 7

  const track = scene.add.graphics()
  track.fillStyle(TRACK_BG, 1)
  track.fillRoundedRect(x, y - H / 2, w, H, 2)

  const fill  = scene.add.graphics()
  const handle = scene.add.circle(0, y, R, color)
  handle.setInteractive({ draggable: true, useHandCursor: true })
  scene.input.setDraggable(handle)

  const _set = (v) => {
    const norm = Phaser.Math.Clamp((v - min) / (max - min), 0, 1)
    const hx   = x + norm * w
    fill.clear()
    fill.fillStyle(color, 0.75)
    fill.fillRoundedRect(x, y - H / 2, norm * w, H, 2)
    handle.setX(hx)
    return hx
  }
  _set(value)

  handle.on('drag', (_ptr, dragX) => {
    const clamped = Phaser.Math.Clamp(dragX, x, x + w)
    const norm    = (clamped - x) / w
    const v       = min + norm * (max - min)
    _set(v)
    onChange(v)
  })

  // Click anywhere on track
  const zone = scene.add.zone(x + w / 2, y, w, R * 3).setInteractive({ useHandCursor: true })
  zone.on('pointerdown', (ptr) => {
    const norm = Phaser.Math.Clamp((ptr.x - x) / w, 0, 1)
    const v    = min + norm * (max - min)
    _set(v)
    onChange(v)
  })

  return {
    destroy:   () => [track, fill, handle, zone].forEach(o => o.destroy()),
    setValue:  (v) => _set(v),
  }
}

/**
 * Toggle switch (ON/OFF).
 */
export function makeToggle(scene, x, y, value, onChange) {
  const W = 36, H = 18, KR = 7
  const bg   = scene.add.graphics()
  const knob = scene.add.circle(0, y, KR, 0xffffff)

  const _draw = (on) => {
    bg.clear()
    bg.fillStyle(on ? KNOB_ON : KNOB_OFF, 1)
    bg.fillRoundedRect(x, y - H / 2, W, H, H / 2)
    knob.setX(on ? x + W - KR - 1 : x + KR + 1)
  }
  let state = value
  _draw(state)

  const zone = scene.add.zone(x + W / 2, y, W, H + 6).setInteractive({ useHandCursor: true })
  zone.on('pointerdown', () => {
    state = !state
    _draw(state)
    scene.tweens.add({ targets: knob, x: state ? x + W - KR - 1 : x + KR + 1, duration: 110 })
    onChange(state)
  })

  return {
    destroy:  () => [bg, knob, zone].forEach(o => o.destroy()),
    setValue: (v) => { state = v; _draw(v) },
  }
}

/**
 * Menu nav / action button with hover highlight.
 * @param {(v:'normal'|'active')=>void} [setStyle]
 */
export function makeNavButton(scene, x, y, w, h, label, onClick, {
  colorNormal = 0x0d1f0d,
  colorHover  = 0x1b5e20,
  colorActive = 0x2e7d32,
  fontSize    = '11px',
  danger      = false,
} = {}) {
  const cn = danger ? 0x2d0000 : colorNormal
  const ch = danger ? 0x5f0000 : colorHover
  const ca = danger ? 0x8b0000 : colorActive
  const tc = danger ? '#ef9a9a' : '#c8e6c9'

  const bg  = scene.add.graphics()
  const txt = scene.add.text(x + w / 2, y + h / 2, label, { ...TEXT_STYLE, fontSize, color: tc }).setOrigin(0.5)
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true })

  let _active = false
  const _draw = (hover) => {
    bg.clear()
    const c = _active ? ca : (hover ? ch : cn)
    bg.fillStyle(c, 0.92)
    bg.fillRoundedRect(x, y, w, h, 4)
    if (_active) { bg.lineStyle(1, 0x76ff03, 0.45); bg.strokeRoundedRect(x, y, w, h, 4) }
  }
  _draw(false)

  zone.on('pointerover',  () => _draw(true))
  zone.on('pointerout',   () => _draw(false))
  zone.on('pointerdown',  () => onClick())

  return {
    destroy:   () => [bg, txt, zone].forEach(o => o.destroy()),
    setActive: (v) => { _active = v; _draw(false) },
    setLabel:  (t) => txt.setText(t),
  }
}

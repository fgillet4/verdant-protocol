/**
 * UILayer — manages the pause / settings overlay.
 * Previously Phaser-based; now uses a plain DOM SettingsPanel for crisp rendering.
 * Escape key opens/closes. GameLoop is paused while open.
 * OWNED BY: ui-agent
 */
import { SettingsPanel } from '../SettingsPanel.js'
import { bus }           from '../../utils/EventBus.js'

export class UILayer {
  /**
   * @param {import('../../engine/GameLoop.js').GameLoop} gameLoop
   * @param {import('../../engine/Engine.js').Engine}     engine
   */
  constructor(gameLoop, engine) {
    this._gameLoop = gameLoop
    this._engine   = engine
    this._open     = false

    this._panel = new SettingsPanel(() => this.close())

    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' && document.activeElement.type !== 'range') return
      if (tag === 'TEXTAREA') return
      this.toggle()
    })
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  toggle() { this._open ? this.close() : this.open() }

  open() {
    this._open = true
    this._gameLoop.stop()
    bus.emit('ui:paused', {})
    this._panel.show()
  }

  close() {
    this._open = false
    this._gameLoop.start()
    bus.emit('ui:resumed', {})
    this._panel.hide()
  }
}

/**
 * Tooltip — follows cursor and shows context for hovered 3D objects and HUD elements.
 * Driven by bus events:  ui:tooltip { html }  and  ui:tooltip-hide
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

export class Tooltip {
  constructor() {
    const el = document.createElement('div')
    el.id = 'game-tooltip'
    el.style.cssText = [
      'position:fixed;pointer-events:none;z-index:800;display:none;',
      'background:rgba(3,10,3,0.93);',
      'border:1px solid rgba(76,175,80,0.4);border-radius:4px;',
      'padding:5px 10px;min-width:80px;max-width:180px;',
      'font-family:"Courier New",monospace;font-size:11px;',
      'color:#e8f5e9;line-height:16px;',
      'box-shadow:0 2px 8px rgba(0,0,0,0.6);',
    ].join('')
    document.body.appendChild(el)
    this._el = el

    bus.on('ui:tooltip',      ({ html }) => { el.innerHTML = html; el.style.display = 'block' })
    bus.on('ui:tooltip-hide', ()         => { el.style.display = 'none' })

    // Follow cursor independently so ClickRaycaster doesn't need to re-emit on every move
    window.addEventListener('pointermove', e => {
      if (el.style.display === 'none') return
      // Offset right + slightly above cursor; flip left if near right edge
      const gap = 14
      const x = e.clientX + gap + el.offsetWidth > window.innerWidth
        ? e.clientX - el.offsetWidth - gap
        : e.clientX + gap
      el.style.left = x + 'px'
      el.style.top  = (e.clientY - 10) + 'px'
    })
  }
}

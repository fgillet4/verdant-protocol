/**
 * ContextMenu — OSRS-style right-click option menu.
 * Listens for ui:right-click events, shows contextual options.
 *
 * Target types and their options:
 *   ground  → Walk here, Examine
 *   enemy   → Attack <name>, Examine <name>
 *   tree    → Chop wood <name>, Examine <name>
 *   object  → Use <name>, Examine <name>
 *
 * OWNED BY: ui-agent
 */
import { bus } from '../utils/EventBus.js'

export class ContextMenu {
  constructor() {
    this._el      = this._buildEl()
    this._visible = false
    document.body.appendChild(this._el)

    bus.on('ui:right-click', ({ x, y, target }) => this.show(x, y, target))

    // Dismiss on Escape
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide() })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _buildEl() {
    const el = document.createElement('div')
    el.id = 'ctx-menu'
    el.style.cssText = [
      'display:none;position:fixed;z-index:500;pointer-events:auto;',
      'background:rgba(4,10,4,0.97);border:1px solid rgba(76,175,80,0.38);',
      'border-radius:4px;padding:3px 0 4px;min-width:148px;',
      'font-family:"Courier New",monospace;font-size:12px;',
      'box-shadow:2px 4px 24px rgba(0,0,0,0.85);user-select:none;',
    ].join('')
    return el
  }

  // ── Show / hide ───────────────────────────────────────────────────────────

  show(x, y, target) {
    this._el.innerHTML = ''

    // Header
    const hdr = document.createElement('div')
    hdr.style.cssText = 'padding:3px 12px 5px;font-size:9px;opacity:0.38;letter-spacing:0.14em;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:2px;color:#c8e6c9;'
    hdr.textContent = 'Choose option'
    this._el.appendChild(hdr)

    for (const opt of this._options(target)) {
      this._el.appendChild(this._row(opt.html, opt.action))
    }

    // Cancel — always last
    this._el.appendChild(this._row('<span style="color:#ef9a9a">Cancel</span>', null))

    // Position — keep fully on screen
    this._el.style.display = 'block'
    this._visible = true
    const mw = this._el.offsetWidth  || 160
    const mh = this._el.offsetHeight || 80
    this._el.style.left = Math.min(x, window.innerWidth  - mw - 8) + 'px'
    this._el.style.top  = Math.min(y, window.innerHeight - mh - 8) + 'px'

    // Dismiss on next outside click (defer so this pointerdown doesn't count)
    setTimeout(() => {
      document.addEventListener('pointerdown', this._onOutside, { capture: true, once: true })
    }, 0)
  }

  hide() {
    if (!this._visible) return
    this._el.style.display = 'none'
    this._visible = false
    document.removeEventListener('pointerdown', this._onOutside, { capture: true })
  }

  _onOutside = (e) => {
    if (!this._el.contains(e.target)) this.hide()
  }

  // ── Option builders ────────────────────────────────────────────────────────

  _options(target) {
    const name = target.label || ''

    if (target.type === 'ground') return [
      {
        html: '<span style="color:#fff">Walk here</span>',
        action: () => bus.emit('player:click-move', { worldPos: target.worldPos }),
      },
      {
        html: '<span style="color:#fff">Examine</span> <span style="color:#ffff64">area</span>',
        action: () => bus.emit('ui:examine', { text: 'Verdant ground. Life pushes through the cracks wherever the drones haven\'t reached.' }),
      },
    ]

    if (target.type === 'enemy') return [
      {
        html: `<span style="color:#ef9a9a">Attack</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('player:attack-target', { targetId: target.entityId }),
      },
      {
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: 'A Forest Drone. It patrols the canopy and will defend itself if provoked.' }),
      },
    ]

    if (target.type === 'tree') return [
      {
        html: `<span style="color:#69f0ae">Chop wood</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('skill:action', { type: 'woodcutting', target }),
      },
      {
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: 'An ancient tree. Its root network is part of something much larger.' }),
      },
    ]

    if (target.type === 'item') {
      const item = target.item
      const opts = []
      if (item?.useEffect) opts.push({
        html: `<span style="color:#a5d6a7">Use</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('item:use', { instanceId: item.instanceId, defId: item.defId }),
      })
      opts.push({
        html: `<span style="color:#ef9a9a">Drop</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('item:drop', { instanceId: item.instanceId }),
      })
      opts.push({
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: item?.description ?? 'An item.' }),
      })
      return opts
    }

    if (target.type === 'techbench') return [
      {
        html: '<span style="color:#00bcd4">Use Tech Bench</span>',
        action: () => {
          bus.emit('ui:open-tech', { benchId: target.entityId })
          if (target.worldPos) bus.emit('player:click-move', { worldPos: target.worldPos })
        },
      },
      {
        html: '<span style="color:#fff">Examine</span> <span style="color:#ffff64">Tech Bench</span>',
        action: () => bus.emit('ui:examine', { text: 'A fabrication bench running on salvaged solar. The screen displays circuit schematics in a scrolling loop.' }),
      },
    ]

    if (target.type === 'chembench') return [
      {
        html: '<span style="color:#00e676">Use Chemistry Bench</span>',
        action: () => {
          bus.emit('ui:open-chemistry', { benchId: target.entityId })
          if (target.worldPos) bus.emit('player:click-move', { worldPos: target.worldPos })
        },
      },
      {
        html: '<span style="color:#fff">Examine</span> <span style="color:#ffff64">Chemistry Bench</span>',
        action: () => bus.emit('ui:examine', { text: 'A bench cluttered with flasks and coiled tubing. Solar array overhead feeds the distiller.' }),
      },
    ]

    if (target.type === 'gather') return [
      {
        html: `<span style="color:#7cb342">Gather</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('skill:action', { type: 'gather', target }),
      },
      {
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: name === 'Herb Patch' ? 'A cluster of medicinal herbs. Useful in chemistry.' : 'Glowing fungi. A key ingredient in many Chemistry brews.' }),
      },
    ]

    if (target.type === 'foundry') return [
      {
        html: '<span style="color:#ff8a65">Use Foundry</span>',
        action: () => {
          bus.emit('ui:open-foundry', { stationId: target.entityId })
          bus.emit('player:click-move', { worldPos: target.worldPos })
        },
      },
      {
        html: '<span style="color:#fff">Examine</span> <span style="color:#ffff64">Foundry</span>',
        action: () => bus.emit('ui:examine', { text: 'A forge built from salvaged drone parts and river stone. The fire never goes out.' }),
      },
    ]

    if (target.type === 'ore') return [
      {
        html: `<span style="color:#90a4ae">Mine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('skill:action', { type: 'mining', target }),
      },
      {
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: target.examineText || 'A rocky outcrop with visible ore veins.' }),
      },
    ]

    if (target.type === 'object') return [
      {
        html: `<span style="color:#a5d6a7">Use</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('world:interact', { target }),
      },
      {
        html: `<span style="color:#fff">Examine</span> <span style="color:#ffff64">${name}</span>`,
        action: () => bus.emit('ui:examine', { text: target.examineText || 'An object of interest.' }),
      },
    ]

    return []
  }

  _row(html, action) {
    const row = document.createElement('div')
    row.style.cssText = 'padding:4px 14px;cursor:pointer;white-space:nowrap;transition:background 0.07s;color:#c8e6c9;'
    row.innerHTML = html
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(76,175,80,0.14)' })
    row.addEventListener('mouseleave', () => { row.style.background = '' })
    row.addEventListener('pointerdown', e => {
      e.stopPropagation()
      if (action) action()
      this.hide()
    })
    return row
  }
}

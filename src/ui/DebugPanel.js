/**
 * DebugPanel — intercepts console.log/warn/error and displays them in-game.
 * Toggle with ` (backtick). Resizable via bottom-right corner handle.
 * OWNED BY: ui-agent
 */

const MAX_LINES  = 200
const LEVEL_STYLE = {
  log:   'color:#c8e6c9',
  warn:  'color:#ffd54f',
  error: 'color:#ef5350;font-weight:bold',
  info:  'color:#80cbc4',
}

export class DebugPanel {
  constructor() {
    this._lines   = []
    this._visible = false
    this._el      = this._build()
    document.body.appendChild(this._el)
    this._intercept()

    window.addEventListener('keydown', e => {
      if (e.key === '`') { e.preventDefault(); this._toggle() }
    })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const wrap = document.createElement('div')
    wrap.id = 'debug-panel'
    wrap.style.cssText = [
      'display:none;position:fixed;bottom:60px;right:16px;',
      'width:420px;z-index:500;',
      'font-family:"Courier New",monospace;font-size:10px;',
      'pointer-events:auto;',
    ].join('')

    // Header bar
    const header = document.createElement('div')
    header.style.cssText = [
      'background:rgba(10,5,5,0.95);',
      'border:1px solid rgba(239,83,80,0.35);border-bottom:none;',
      'border-radius:6px 6px 0 0;',
      'padding:4px 10px;display:flex;align-items:center;gap:8px;',
      'cursor:ns-resize;',
    ].join('')

    const title = document.createElement('span')
    title.textContent = 'DEBUG'
    title.style.cssText = 'color:#ef5350;font-size:9px;letter-spacing:0.15em;flex:1;'

    const clearBtn = document.createElement('span')
    clearBtn.textContent = 'CLR'
    clearBtn.style.cssText = 'color:rgba(239,83,80,0.5);font-size:9px;cursor:pointer;letter-spacing:0.1em;'
    clearBtn.addEventListener('click', e => { e.stopPropagation(); this._clear() })
    clearBtn.addEventListener('mouseenter', () => { clearBtn.style.color = '#ef5350' })
    clearBtn.addEventListener('mouseleave', () => { clearBtn.style.color = 'rgba(239,83,80,0.5)' })

    const closeBtn = document.createElement('span')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'color:rgba(239,83,80,0.5);font-size:10px;cursor:pointer;'
    closeBtn.addEventListener('click', e => { e.stopPropagation(); this._toggle() })
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#ef5350' })
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'rgba(239,83,80,0.5)' })

    header.append(title, clearBtn, closeBtn)

    // Scrollable log area
    const box = document.createElement('div')
    box.style.cssText = [
      'background:rgba(8,3,3,0.95);',
      'border:1px solid rgba(239,83,80,0.25);border-top:none;border-bottom:none;',
      'height:220px;min-height:60px;',
      'overflow-y:auto;padding:4px 8px;',
      'display:flex;flex-direction:column;gap:0;',
      'scrollbar-width:thin;scrollbar-color:rgba(239,83,80,0.3) transparent;',
    ].join('')

    // Footer / resize strip
    const footer = document.createElement('div')
    footer.style.cssText = [
      'background:rgba(8,3,3,0.95);',
      'border:1px solid rgba(239,83,80,0.25);border-top:none;',
      'border-radius:0 0 6px 6px;',
      'height:8px;position:relative;',
    ].join('')

    // Corner resize handle
    const corner = document.createElement('div')
    corner.style.cssText = [
      'position:absolute;bottom:0;right:0;width:14px;height:14px;',
      'cursor:nwse-resize;',
      'background:linear-gradient(135deg,transparent 40%,rgba(239,83,80,0.5) 40%,rgba(239,83,80,0.5) 55%,transparent 55%,transparent 70%,rgba(239,83,80,0.3) 70%);',
    ].join('')
    footer.appendChild(corner)

    wrap.append(header, box, footer)

    this._box    = box
    this._wrap   = wrap

    // Header drag → resize height
    let _hy = 0, _hh = 0
    header.addEventListener('mousedown', e => {
      if (e.target !== header && e.target !== title) return
      e.preventDefault()
      _hy = e.clientY; _hh = box.offsetHeight
      const onMove = ev => { box.style.height = Math.max(60, _hh + (_hy - ev.clientY)) + 'px' }
      const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })

    // Corner drag → resize width + height
    let _cx = 0, _cy = 0, _cw = 0, _ch = 0
    corner.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation()
      _cx = e.clientX; _cy = e.clientY
      _cw = wrap.offsetWidth; _ch = box.offsetHeight
      const onMove = ev => {
        wrap.style.width = Math.max(200, _cw + (ev.clientX - _cx)) + 'px'
        box.style.height = Math.max(60,  _ch + (_cy - ev.clientY)) + 'px'
      }
      const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })

    return wrap
  }

  // ── Console intercept ─────────────────────────────────────────────────────

  _intercept() {
    const self = this
    for (const level of ['log', 'warn', 'error', 'info']) {
      const orig = console[level].bind(console)
      console[level] = (...args) => {
        orig(...args)
        self._append(level, args)
      }
    }
  }

  _append(level, args) {
    const text = args.map(a => {
      if (typeof a === 'string') return a
      try { return JSON.stringify(a, null, 0) } catch { return String(a) }
    }).join(' ')

    const row = document.createElement('div')
    row.style.cssText = `${LEVEL_STYLE[level] ?? LEVEL_STYLE.log};line-height:15px;white-space:pre-wrap;word-break:break-all;border-bottom:1px solid rgba(255,255,255,0.03);`

    const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    row.textContent = `[${ts}] ${text}`

    this._box.appendChild(row)
    this._lines.push(row)

    while (this._lines.length > MAX_LINES) {
      this._lines.shift().remove()
    }

    const b = this._box
    if (b.scrollHeight - b.scrollTop - b.clientHeight < 40) {
      b.scrollTop = b.scrollHeight
    }
  }

  _clear() {
    for (const r of this._lines) r.remove()
    this._lines = []
  }

  _toggle() {
    this._visible = !this._visible
    this._wrap.style.display = this._visible ? 'block' : 'none'
    if (this._visible) this._box.scrollTop = this._box.scrollHeight
  }
}

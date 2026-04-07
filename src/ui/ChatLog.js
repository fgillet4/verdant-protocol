/**
 * ChatLog — OSRS-style message log in the bottom-left.
 * Channels: 'game' (skill actions, loot), 'world' (biome/global events).
 * OWNED BY: ui-agent
 */
import { bus }    from '../utils/EventBus.js'
import { SKILLS } from '../skills/SkillRegistry.js'

const MAX_LINES   = 100   // keep in DOM
const VISIBLE     = 8     // visible rows before scroll

const CHANNEL_COLOR = {
  game:   '#c8e6c9',
  world:  '#80cbc4',
  combat: '#ef9a9a',
  chat:   '#ffe082',
  system: '#ffd54f',
}

export class ChatLog {
  constructor() {
    this._el     = this._build()
    this._lines  = []   // { el, timestamp }
    this._paused = false

    document.body.appendChild(this._el)
    this._wire()
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const wrap = document.createElement('div')
    wrap.id = 'chat-log'
    wrap.style.cssText = [
      'position:fixed;bottom:60px;left:16px;',
      `width:320px;`,
      'font-family:"Courier New",monospace;font-size:11px;',
      'pointer-events:auto;user-select:text;',
      'z-index:300;',
    ].join('')

    // Resize grip — drag upward to make the log taller
    const grip = document.createElement('div')
    grip.style.cssText = [
      'height:6px;cursor:ns-resize;',
      'background:rgba(76,175,80,0.08);',
      'border:1px solid rgba(76,175,80,0.18);border-bottom:none;',
      'border-radius:6px 6px 0 0;',
      'display:flex;align-items:center;justify-content:center;',
    ].join('')
    grip.innerHTML = '<div style="width:28px;height:2px;background:rgba(76,175,80,0.35);border-radius:1px"></div>'
    this._grip = grip

    // Scrollable message area
    const box = document.createElement('div')
    box.id = 'chat-box'
    box.style.cssText = [
      'background:rgba(3,8,3,0.82);',
      'border:1px solid rgba(76,175,80,0.2);border-top:none;border-bottom:none;',
      `height:${VISIBLE * 18}px;min-height:36px;`,
      'overflow-y:scroll;padding:6px 8px 4px;',
      'display:flex;flex-direction:column;gap:2px;',
      'scrollbar-width:thin;scrollbar-color:rgba(76,175,80,0.35) rgba(0,0,0,0.2);',
    ].join('')

    // Tab bar
    const tabs = document.createElement('div')
    tabs.style.cssText = [
      'display:flex;background:rgba(3,8,3,0.9);',
      'border:1px solid rgba(76,175,80,0.2);border-top:none;border-radius:0 0 6px 6px;',
    ].join('')

    for (const [ch, color] of Object.entries(CHANNEL_COLOR)) {
      const tab = document.createElement('div')
      tab.dataset.channel = ch
      tab.textContent = ch.charAt(0).toUpperCase() + ch.slice(1)
      tab.style.cssText = [
        `color:${color};`,
        'padding:3px 10px;font-size:9px;letter-spacing:0.08em;',
        'cursor:pointer;opacity:0.45;border-right:1px solid rgba(76,175,80,0.1);',
        'transition:opacity 0.1s;',
      ].join('')
      tab.addEventListener('mouseenter', () => { tab.style.opacity = '0.9' })
      tab.addEventListener('mouseleave', () => { tab.style.opacity = tab.dataset.active ? '1' : '0.45' })
      tab.addEventListener('click', () => this._filterChannel(ch))
      tabs.appendChild(tab)
    }

    // "All" tab prepended
    const allTab = document.createElement('div')
    allTab.textContent = 'All'
    allTab.dataset.active = '1'
    allTab.style.cssText = [
      'color:#c8e6c9;padding:3px 10px;font-size:9px;letter-spacing:0.08em;',
      'cursor:pointer;opacity:1;border-right:1px solid rgba(76,175,80,0.1);',
    ].join('')
    allTab.addEventListener('click', () => this._filterChannel(null))
    tabs.prepend(allTab)

    // Chat input bar
    const inputRow = document.createElement('div')
    inputRow.style.cssText = [
      'display:flex;background:rgba(3,8,3,0.92);',
      'border:1px solid rgba(76,175,80,0.2);border-top:none;border-bottom:none;',
      'padding:3px 6px;gap:4px;align-items:center;',
    ].join('')

    const input = document.createElement('input')
    input.type        = 'text'
    input.maxLength   = 120
    input.placeholder = 'Press Enter to chat...'
    input.style.cssText = [
      'flex:1;background:transparent;border:none;outline:none;',
      'color:#ffe082;font-family:"Courier New",monospace;font-size:11px;',
      'caret-color:#76ff03;',
    ].join('')

    const sendBtn = document.createElement('div')
    sendBtn.textContent = '↵'
    sendBtn.style.cssText = [
      'color:rgba(76,175,80,0.5);font-size:13px;cursor:pointer;',
      'padding:0 3px;transition:color 0.1s;',
    ].join('')
    sendBtn.addEventListener('mouseenter', () => { sendBtn.style.color = '#76ff03' })
    sendBtn.addEventListener('mouseleave', () => { sendBtn.style.color = 'rgba(76,175,80,0.5)' })

    const _send = () => {
      const text = input.value.trim()
      if (!text) { input.blur(); return }
      input.value = ''
      bus.emit('chat:message', { playerId: 'player', text })
      this.post('chat', `<span style="color:#76ff03">You:</span> ${_esc(text)}`)
      input.blur()
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); e.stopPropagation(); _send(); return }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); input.blur(); return }
      // stop game hotkeys while typing
      if (e.key !== 'Tab') e.stopPropagation()
    })
    sendBtn.addEventListener('click', _send)

    // Visual active state when focused
    input.addEventListener('focus', () => {
      inputRow.style.borderColor = 'rgba(118,255,3,0.55)'
      inputRow.style.background  = 'rgba(3,8,3,0.98)'
    })
    input.addEventListener('blur', () => {
      inputRow.style.borderColor = 'rgba(76,175,80,0.2)'
      inputRow.style.background  = 'rgba(3,8,3,0.92)'
    })

    // Clicking anywhere in the log focuses the input
    box.addEventListener('click', () => input.focus())

    inputRow.append(input, sendBtn)

    this._box      = box
    this._tabs     = tabs
    this._allTab   = allTab
    this._tabEls   = Array.from(tabs.querySelectorAll('[data-channel]'))
    this._filter   = null  // null = all channels
    this._input    = input

    // Bottom-right corner resize handle (width + height)
    const corner = document.createElement('div')
    corner.style.cssText = [
      'position:absolute;bottom:0;right:0;width:14px;height:14px;',
      'cursor:nwse-resize;z-index:10;',
      'background:linear-gradient(135deg,transparent 40%,rgba(76,175,80,0.45) 40%,rgba(76,175,80,0.45) 55%,transparent 55%,transparent 70%,rgba(76,175,80,0.3) 70%);',
    ].join('')
    wrap.style.position = 'fixed'  // ensure absolute children work
    wrap.style.overflow = 'visible'

    wrap.append(grip, box, inputRow, tabs, corner)

    // Top-grip: drag upward → grow height
    let _dragStart = 0
    let _heightStart = 0
    grip.addEventListener('mousedown', e => {
      e.preventDefault()
      _dragStart   = e.clientY
      _heightStart = box.offsetHeight
      const onMove = ev => {
        const delta = _dragStart - ev.clientY
        box.style.height = Math.max(36, _heightStart + delta) + 'px'
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })

    // Bottom-right corner: drag → resize width and height together
    let _csx = 0, _csy = 0, _cwStart = 0, _chStart = 0
    corner.addEventListener('mousedown', e => {
      e.preventDefault()
      _csx = e.clientX; _csy = e.clientY
      _cwStart = wrap.offsetWidth; _chStart = box.offsetHeight
      const onMove = ev => {
        const dw = ev.clientX - _csx
        const dh = _csy - ev.clientY   // up = grow
        wrap.style.width = Math.max(200, _cwStart + dw) + 'px'
        box.style.height = Math.max(36,  _chStart + dh) + 'px'
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    })

    return wrap
  }

  // ── Wire events ───────────────────────────────────────────────────────────

  _wire() {
    // Global Enter key → focus chat input (proximity chat shortcut)
    window.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      this._input.focus()
    })

    // Game channel — skill actions
    bus.on('skill:action', ({ type, target }) => {
      if (type === 'woodcutting') {
        const name = target?.label ?? 'tree'
        this.post('game', `You start cutting the <span style="color:#a5d6a7">${_esc(name)}</span>...`)
      } else if (type === 'mining') {
        const name = target?.label ?? 'ore'
        this.post('game', `You start mining the <span style="color:#90a4ae">${_esc(name)}</span>...`)
      }
    })

    bus.on('skill:xp-gained', ({ skillId, amount }) => {
      // Only log meaningful integer drops, not every passive tick
      if (amount < 1) return
      // suppress ecology from chatlog (it's handled as passive; XP drop handles it)
    })

    // Incoming chat from other players (multiplayer ready)
    bus.on('chat:message', ({ playerId, playerName, text }) => {
      if (playerId === 'player') return  // own messages posted at send-time
      const name = playerName ?? playerId ?? 'Unknown'
      this.post('chat', `<span style="color:#ffe082">${_esc(name)}:</span> ${_esc(text)}`)
    })

    bus.on('skill:level-up', ({ skillId, newLevel }) => {
      const def    = SKILLS[skillId]
      const color  = def?.color ?? '#ffd700'
      const unlock = def?.unlocks?.[newLevel]
      this.post('game',
        `<span style="color:#ffd700;font-weight:bold">Congratulations!</span> ` +
        `Your <span style="color:${color};font-weight:bold">${_title(skillId)}</span> ` +
        `level is now <span style="color:#ffd700;font-weight:bold">${newLevel}</span>.` +
        (unlock ? ` <span style="color:#a5d6a7;opacity:0.8">Unlocked: ${unlock}</span>` : '')
      )
    })

    bus.on('inventory:item-received', ({ item }) => {
      this.post('game', `You receive: <span style="color:#a5d6a7">${item.name}</span> x${item.quantity ?? 1}`)
    })

    bus.on('foundry:smelt-complete', ({ recipeId, outputItem }) => {
      this.post('game', `You smelt <span style="color:#ff8a65">${outputItem.name}</span>.`)
    })

    bus.on('chemistry:craft-complete', ({ recipeId, outputItem }) => {
      this.post('game', `You brew <span style="color:#00e676">${outputItem.name}</span>.`)
    })

    bus.on('tech:fabricate-complete', ({ recipeId }) => {
      this.post('game', `Fabrication complete: <span style="color:#00bcd4">${_title(recipeId)}</span>.`)
    })

    bus.on('construction:built', ({ blueprintId }) => {
      this.post('game', `You build a <span style="color:#90a4ae">${_title(blueprintId)}</span>.`)
    })

    bus.on('ui:examine', ({ text }) => {
      this.post('game', text)
    })

    // Combat channel
    bus.on('combat:death', ({ entityId }) => {
      if (entityId === 'player') {
        this.post('combat', '<span style="color:#ef5350">You have been defeated.</span>')
      } else {
        this.post('combat', `<span style="color:#ef9a9a">You have defeated the enemy.</span>`)
      }
    })

    // World channel — biome/ecosystem events
    bus.on('world:ecosystem-changed', ({ zoneId, healthDelta }) => {
      const dir = healthDelta >= 0 ? 'improved' : 'declined'
      this.post('world', `The biome around <em>${zoneId}</em> has ${dir}.`)
    })

    bus.on('attunement:depleted', () => {
      this.post('world', '<span style="color:#ffd54f">Your attunement is exhausted.</span>')
    })
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Append a message to the log.
   * @param {'game'|'world'|'combat'|'system'} channel
   * @param {string} html — may contain inline HTML for colour
   */
  post(channel, html) {
    const color = CHANNEL_COLOR[channel] ?? '#c8e6c9'
    const row   = document.createElement('div')
    row.dataset.channel = channel
    row.style.cssText = `color:${color};line-height:17px;white-space:normal;word-break:break-word;`
    row.innerHTML = html

    if (this._filter && this._filter !== channel) {
      row.style.display = 'none'
    }

    this._box.appendChild(row)
    this._lines.push(row)

    // Trim old lines
    while (this._lines.length > MAX_LINES) {
      this._lines.shift().remove()
    }

    // Auto-scroll to bottom unless user has scrolled up
    const b = this._box
    if (b.scrollHeight - b.scrollTop - b.clientHeight < 40) {
      b.scrollTop = b.scrollHeight
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _filterChannel(ch) {
    this._filter = ch

    // Update tab highlight
    this._allTab.style.opacity  = ch === null ? '1' : '0.45'
    for (const tab of this._tabEls) {
      tab.style.opacity = tab.dataset.channel === ch ? '1' : '0.45'
      tab.dataset.active = tab.dataset.channel === ch ? '1' : ''
    }

    // Show/hide rows
    for (const row of this._lines) {
      row.style.display = (ch === null || row.dataset.channel === ch) ? '' : 'none'
    }

    this._box.scrollTop = this._box.scrollHeight
  }
}

function _title(id) {
  return id.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

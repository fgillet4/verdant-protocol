/**
 * TechPanel — Technology bench UI.
 * Groups recipes by tier (Components → Gadgets → Devices → Systems).
 * OWNED BY: ui-agent
 */
import { bus }                                       from '../utils/EventBus.js'
import { TECH_RECIPES, TECH_TIERS, TECH_INGREDIENT_NAMES } from '../world/TechDefs.js'

const OUTPUT_COLORS = {
  copperWire:      '#f9a825',
  circuitBoard:    '#42a5f5',
  steelCasing:     '#90a4ae',
  oreScanner:      '#80cbc4',
  signalJammer:    '#ce93d8',
  proxMine:        '#ef9a9a',
  solarCapacitor:  '#ffd54f',
  sentryTurret:    '#ff8a65',
  recodedDroneCore:'#a5d6a7',
  gridweaveNode:   '#00e5ff',
}

const TIER_COLORS = {
  Components: '#f9a825',
  Gadgets:    '#42a5f5',
  Devices:    '#ff8a65',
  Systems:    '#00e5ff',
}

export class TechPanel {
  /** @param {import('../inventory/Inventory.js').Inventory} inventory */
  constructor(inventory) {
    this._inventory   = inventory
    this._visible     = false
    this._fabricating = null
    this._animFrame   = null
    this._rows        = {}
    this._el          = this._build()
    document.body.appendChild(this._el)

    bus.on('ui:open-tech',            ()             => this.show())
    bus.on('inventory:changed',       ()             => this._refresh())
    bus.on('tech:fabricate-complete', ({ recipeId }) => this._onComplete(recipeId))
    bus.on('tech:fabricate-failed',   ({ reason })   => this._onFailed(reason))

    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide() })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.style.cssText = [
      'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:rgba(2,8,12,0.97);border:1px solid rgba(0,188,212,0.3);',
      'border-radius:10px;padding:18px 22px;width:480px;max-height:82vh;overflow-y:auto;',
      'font-family:"Courier New",monospace;color:#e8f5e9;z-index:700;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);',
    ].join('')

    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'
    const title = document.createElement('span')
    title.style.cssText = 'font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#00bcd4;'
    title.textContent = 'Tech Bench'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('click', () => this.hide())
    hdr.append(title, closeBtn)
    panel.appendChild(hdr)

    for (const tier of TECH_TIERS) {
      const tierRecipes = TECH_RECIPES.filter(r => r.tier === tier)
      if (!tierRecipes.length) continue

      const lbl = document.createElement('div')
      lbl.style.cssText = `font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:${TIER_COLORS[tier] ?? '#aaa'};margin:10px 0 6px;`
      lbl.textContent = tier
      panel.appendChild(lbl)

      for (const recipe of tierRecipes) panel.appendChild(this._buildRow(recipe))
    }

    this._statusEl = document.createElement('div')
    this._statusEl.style.cssText = 'margin-top:10px;font-size:9px;color:#90a4ae;text-align:right;min-height:12px;'
    panel.appendChild(this._statusEl)
    return panel
  }

  _buildRow(recipe) {
    const col = OUTPUT_COLORS[recipe.outputId] ?? '#ccc'
    const row = document.createElement('div')
    row.style.cssText = [
      'border:1px solid rgba(0,188,212,0.1);border-radius:6px;',
      'padding:9px 12px;margin-bottom:7px;transition:border-color 0.15s;',
    ].join('')
    row.addEventListener('mouseenter', () => { row.style.borderColor = 'rgba(0,188,212,0.28)' })
    row.addEventListener('mouseleave', () => { row.style.borderColor = 'rgba(0,188,212,0.1)' })

    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;'
    const nameEl = document.createElement('span')
    nameEl.style.cssText = `font-size:12px;font-weight:bold;color:${col};`
    nameEl.textContent = recipe.qty > 1 ? `${recipe.name} ×${recipe.qty}` : recipe.name
    const meta = document.createElement('span')
    meta.style.cssText = 'font-size:9px;color:#b0c4de;'
    meta.textContent = `Lv ${recipe.level} · ${recipe.xp} XP · ${recipe.fabricateMs / 1000}s`
    top.append(nameEl, meta)
    row.appendChild(top)

    const ingEl = document.createElement('div')
    ingEl.style.cssText = 'font-size:10px;color:#cfd8dc;margin-bottom:5px;'
    row.appendChild(ingEl)

    if (recipe.note) {
      const noteEl = document.createElement('div')
      noteEl.style.cssText = 'font-size:9px;color:#90a4ae;margin-bottom:5px;font-style:italic;'
      noteEl.textContent = recipe.note
      row.appendChild(noteEl)
    }

    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;align-items:center;gap:8px;'

    const btn = document.createElement('button')
    btn.textContent = 'Fabricate'
    btn.style.cssText = [
      'background:rgba(0,188,212,0.1);border:1px solid rgba(0,188,212,0.35);',
      'color:#00bcd4;font-family:inherit;font-size:11px;padding:3px 12px;',
      'border-radius:4px;cursor:pointer;transition:background 0.1s;white-space:nowrap;',
    ].join('')
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.background = 'rgba(0,188,212,0.22)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,188,212,0.1)' })
    btn.addEventListener('click', () => {
      bus.emit('tech:fabricate', { recipeId: recipe.id })
      this._startProgress(recipe, 1)
    })

    const btnAll = document.createElement('button')
    btnAll.textContent = 'Fabricate All'
    btnAll.style.cssText = [
      'background:rgba(0,188,212,0.06);border:1px solid rgba(0,188,212,0.22);',
      'color:#80deea;font-family:inherit;font-size:11px;padding:3px 12px;',
      'border-radius:4px;cursor:pointer;transition:background 0.1s;white-space:nowrap;',
    ].join('')
    btnAll.addEventListener('mouseenter', () => { if (!btnAll.disabled) btnAll.style.background = 'rgba(0,188,212,0.16)' })
    btnAll.addEventListener('mouseleave', () => { btnAll.style.background = 'rgba(0,188,212,0.06)' })
    btnAll.addEventListener('click', () => {
      const runs = this._maxRuns(recipe)
      if (runs < 1) return
      bus.emit('tech:fabricate', { recipeId: recipe.id, runs })
      this._startProgress(recipe, runs)
    })

    const progress = document.createElement('div')
    progress.style.cssText = 'flex:1;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;'
    const bar = document.createElement('div')
    bar.style.cssText = `height:100%;width:0%;background:${col};`
    progress.appendChild(bar)
    footer.append(btn, btnAll, progress)
    row.appendChild(footer)

    this._rows[recipe.id] = { btn, btnAll, progressBar: bar, ingEl, col }
    return row
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  /** How many times can recipe be made with current inventory? */
  _maxRuns(recipe) {
    let runs = Infinity
    for (const { itemId, qty } of recipe.inputs) {
      runs = Math.min(runs, Math.floor(this._inventory.countItem(itemId) / qty))
    }
    return runs === Infinity ? 0 : runs
  }

  _refresh() {
    for (const recipe of TECH_RECIPES) {
      const { ingEl, btn, btnAll } = this._rows[recipe.id]
      let canMake = true
      const parts = recipe.inputs.map(({ itemId, qty }) => {
        const have = this._inventory.countItem(itemId)
        if (have < qty) canMake = false
        const color = have >= qty ? '#a5d6a7' : '#ef9a9a'
        return `<span style="color:${color}">${qty}× ${TECH_INGREDIENT_NAMES[itemId] ?? itemId} (${have})</span>`
      })
      ingEl.innerHTML = parts.join('<span style="color:#546e7a"> · </span>')

      const busy = this._fabricating !== null
      const runs  = this._maxRuns(recipe)

      btn.disabled      = busy || !canMake
      btn.style.opacity = (busy || !canMake) ? '0.4' : '1'
      btn.style.cursor  = (busy || !canMake) ? 'not-allowed' : 'pointer'

      btnAll.disabled      = busy || runs < 1
      btnAll.style.opacity = (busy || runs < 1) ? '0.4' : '1'
      btnAll.style.cursor  = (busy || runs < 1) ? 'not-allowed' : 'pointer'
      btnAll.textContent   = runs > 1 ? `Fabricate All (×${runs})` : 'Fabricate All'
    }
  }

  // ── rAF progress animation ────────────────────────────────────────────────

  _animateBar(bar, durationMs) {
    cancelAnimationFrame(this._animFrame)
    bar.style.width = '0%'
    const start = performance.now()
    const tick = (now) => {
      const pct = Math.min((now - start) / durationMs, 1) * 100
      bar.style.width = pct.toFixed(2) + '%'
      if (pct < 100) this._animFrame = requestAnimationFrame(tick)
    }
    this._animFrame = requestAnimationFrame(tick)
  }

  _stopAnimation(bar) {
    cancelAnimationFrame(this._animFrame)
    this._animFrame = null
    bar.style.width = '0%'
  }

  // ── Fabrication lifecycle ─────────────────────────────────────────────────

  _startProgress(recipe, runs) {
    this._fabricating = recipe.id
    const { progressBar } = this._rows[recipe.id]
    this._refresh()
    this._animateBar(progressBar, recipe.fabricateMs)
    this._setStatus(runs > 1
      ? `Fabricating ${recipe.name} ×${runs}…`
      : `Fabricating ${recipe.name}…`)
  }

  _onComplete(recipeId) {
    const recipe = TECH_RECIPES.find(r => r.id === recipeId)
    const { progressBar } = this._rows[recipeId]
    this._stopAnimation(progressBar)
    this._fabricating = null
    this._setStatus(`${recipe?.name ?? 'Item'} complete.`)
    this._refresh()
  }

  _onFailed(reason) {
    if (this._fabricating) {
      const { progressBar } = this._rows[this._fabricating]
      this._stopAnimation(progressBar)
      this._fabricating = null
    }
    this._setStatus(reason)
    this._refresh()
  }

  _setStatus(text) {
    this._statusEl.textContent = text
    clearTimeout(this._statusTimer)
    this._statusTimer = setTimeout(() => { this._statusEl.textContent = '' }, 4000)
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  show() {
    if (this._visible) return
    this._el.style.display = 'block'
    this._visible = true
    this._refresh()
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
    else document.addEventListener('pointerdown', this._onOutside, { capture: true, once: true })
  }
}

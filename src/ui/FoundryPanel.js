/**
 * FoundryPanel — smelting UI. Opens when a player uses a Foundry station.
 * Shows all recipes with live ingredient counts; emits foundry:smelt on click.
 * OWNED BY: ui-agent
 */
import { bus }                           from '../utils/EventBus.js'
import { SMELT_RECIPES, INGREDIENT_NAMES } from '../world/FoundryDefs.js'

const BAR_COLORS = {
  copperBar:      '#c47a1e',
  ironBar:        '#607d8b',
  steelBar:       '#90a4ae',
  solariteIngot:  '#ffc400',
  heartstoneCore: '#ba68c8',
}

export class FoundryPanel {
  /** @param {import('../inventory/Inventory.js').Inventory} inventory */
  constructor(inventory) {
    this._inventory  = inventory
    this._visible    = false
    this._smelting   = null
    this._animFrame  = null   // rAF handle for progress bar
    this._rows       = {}
    this._el         = this._build()
    document.body.appendChild(this._el)

    bus.on('ui:open-foundry',       ()              => this.show())
    bus.on('inventory:changed',     ()              => this._refresh())
    bus.on('foundry:smelt-started',  ({ recipeId, runs }) => {
      const recipe = SMELT_RECIPES.find(r => r.id === recipeId)
      if (recipe) this._startProgress(recipe, runs)
    })
    bus.on('foundry:smelt-complete', ({ recipeId, remaining }) => this._onComplete(recipeId, remaining ?? 0))
    bus.on('foundry:smelt-failed',   ({ reason })   => this._onFailed(reason))

    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide() })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.style.cssText = [
      'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:rgba(4,10,4,0.97);border:1px solid rgba(255,100,20,0.35);',
      'border-radius:10px;padding:18px 22px;width:440px;',
      'font-family:"Courier New",monospace;color:#e8f5e9;z-index:700;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);',
    ].join('')

    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'
    const title = document.createElement('span')
    title.style.cssText = 'font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#ff8a65;'
    title.textContent = 'Foundry'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('click', () => this.hide())
    hdr.append(title, closeBtn)
    panel.appendChild(hdr)

    for (const recipe of SMELT_RECIPES) {
      panel.appendChild(this._buildRow(recipe))
    }

    this._statusEl = document.createElement('div')
    this._statusEl.style.cssText = 'margin-top:10px;font-size:9px;color:#90a4ae;text-align:right;min-height:12px;'
    panel.appendChild(this._statusEl)
    return panel
  }

  _buildRow(recipe) {
    const barColor = BAR_COLORS[recipe.outputId] ?? '#ccc'
    const row = document.createElement('div')
    row.style.cssText = [
      'border:1px solid rgba(255,255,255,0.09);border-radius:6px;',
      'padding:9px 12px;margin-bottom:8px;',
    ].join('')

    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;'
    const nameEl = document.createElement('span')
    nameEl.style.cssText = `font-size:12px;font-weight:bold;color:${barColor};`
    nameEl.textContent = recipe.name
    const meta = document.createElement('span')
    meta.style.cssText = 'font-size:9px;color:#b0c4de;'
    meta.textContent = `Lv ${recipe.level} · ${recipe.xp} XP · ${recipe.smeltMs / 1000}s`
    top.append(nameEl, meta)
    row.appendChild(top)

    const ingEl = document.createElement('div')
    ingEl.dataset.recipe = recipe.id
    ingEl.style.cssText  = 'font-size:10px;color:#cfd8dc;margin-bottom:7px;'
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
    btn.textContent = 'Smelt'
    btn.style.cssText = [
      'background:rgba(255,100,20,0.15);border:1px solid rgba(255,100,20,0.4);',
      'color:#ff8a65;font-family:inherit;font-size:11px;padding:3px 12px;',
      'border-radius:4px;cursor:pointer;transition:background 0.1s;white-space:nowrap;',
    ].join('')
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.background = 'rgba(255,100,20,0.28)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(255,100,20,0.15)' })
    btn.addEventListener('click', () => {
      bus.emit('foundry:smelt', { recipeId: recipe.id })
    })

    const btnAll = document.createElement('button')
    btnAll.textContent = 'Smelt All'
    btnAll.style.cssText = [
      'background:rgba(255,100,20,0.08);border:1px solid rgba(255,100,20,0.25);',
      'color:#ffab76;font-family:inherit;font-size:11px;padding:3px 12px;',
      'border-radius:4px;cursor:pointer;transition:background 0.1s;white-space:nowrap;',
    ].join('')
    btnAll.addEventListener('mouseenter', () => { if (!btnAll.disabled) btnAll.style.background = 'rgba(255,100,20,0.2)' })
    btnAll.addEventListener('mouseleave', () => { btnAll.style.background = 'rgba(255,100,20,0.08)' })
    btnAll.addEventListener('click', () => {
      const runs = this._maxRuns(recipe)
      if (runs < 1) return
      bus.emit('foundry:smelt', { recipeId: recipe.id, runs })
    })

    const progress = document.createElement('div')
    progress.style.cssText = 'flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;'
    const bar = document.createElement('div')
    bar.style.cssText = `height:100%;width:0%;background:${barColor};`
    progress.appendChild(bar)

    footer.append(btn, btnAll, progress)
    row.appendChild(footer)

    this._rows[recipe.id] = { smeltBtn: btn, smeltAllBtn: btnAll, progressBar: bar, ingEl }
    return row
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  _maxRuns(recipe) {
    let runs = Infinity
    for (const { itemId, qty } of recipe.inputs) {
      runs = Math.min(runs, Math.floor(this._inventory.countItem(itemId) / qty))
    }
    return runs === Infinity ? 0 : runs
  }

  _refresh() {
    for (const recipe of SMELT_RECIPES) {
      const { ingEl, smeltBtn, smeltAllBtn } = this._rows[recipe.id]
      let canMake = true
      const parts = recipe.inputs.map(({ itemId, qty }) => {
        const have = this._inventory.countItem(itemId)
        if (have < qty) canMake = false
        const color = have >= qty ? '#a5d6a7' : '#ef9a9a'
        return `<span style="color:${color}">${qty}× ${INGREDIENT_NAMES[itemId] ?? itemId} (${have})</span>`
      })
      ingEl.innerHTML = parts.join('<span style="color:#546e7a"> · </span>')

      const busy = this._smelting !== null
      const runs  = this._maxRuns(recipe)

      smeltBtn.disabled      = busy || !canMake
      smeltBtn.style.opacity = (busy || !canMake) ? '0.4' : '1'
      smeltBtn.style.cursor  = (busy || !canMake) ? 'not-allowed' : 'pointer'

      smeltAllBtn.disabled      = busy || runs < 1
      smeltAllBtn.style.opacity = (busy || runs < 1) ? '0.4' : '1'
      smeltAllBtn.style.cursor  = (busy || runs < 1) ? 'not-allowed' : 'pointer'
      smeltAllBtn.textContent   = runs > 1 ? `Smelt All (×${runs})` : 'Smelt All'
    }
  }

  // ── rAF progress animation ────────────────────────────────────────────────

  /**
   * Start a fresh progress bar animation using requestAnimationFrame.
   * Cancels any running animation first so restarts are always clean.
   * @param {HTMLDivElement} bar
   * @param {number} durationMs
   */
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

  // ── Smelt lifecycle ────────────────────────────────────────────────────────

  _startProgress(recipe, runs) {
    this._smelting = recipe.id
    const { progressBar } = this._rows[recipe.id]
    this._refresh()
    this._animateBar(progressBar, recipe.smeltMs)
    this._setStatus(runs > 1
      ? `Smelting ${recipe.name} ×${runs}…`
      : `Smelting ${recipe.name}…`)
  }

  _onComplete(recipeId, remaining = 0) {
    const recipe = SMELT_RECIPES.find(r => r.id === recipeId)
    const row = this._rows[recipeId]
    if (!row) { this._smelting = null; this._refresh(); return }
    const { progressBar } = row

    if (remaining > 0) {
      // Queue continues — cancel current animation, restart immediately for next bar
      this._animateBar(progressBar, recipe.smeltMs)
      this._setStatus(`Smelting ${recipe?.name ?? 'bar'}… (${remaining} left)`)
    } else {
      // All done
      this._stopAnimation(progressBar)
      this._smelting = null
      this._setStatus(`${recipe?.name ?? 'Bar'} complete.`)
      this._refresh()
    }
  }

  _onFailed(reason) {
    if (this._smelting) {
      const { progressBar } = this._rows[this._smelting]
      this._stopAnimation(progressBar)
      this._smelting = null
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

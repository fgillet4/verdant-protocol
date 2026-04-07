/**
 * ChemistryPanel — Chemistry bench UI.
 * Groups recipes by tier; shows live ingredient counts.
 * OWNED BY: ui-agent
 */
import { bus }                                            from '../utils/EventBus.js'
import { CHEM_RECIPES, CHEM_TIERS, CHEM_INGREDIENT_NAMES } from '../world/ChemistryDefs.js'

const OUTPUT_COLORS = {
  healthSalve:         '#ef9a9a',
  attunementTincture:  '#ce93d8',
  fermentedBrew:       '#a5d6a7',
  corrosivePaste:      '#80deea',
  sporeGrenade:        '#c5e1a5',
  droneAcid:           '#90caf9',
  solariteAccelerant:  '#ffd54f',
  heartstoneElixir:    '#ba68c8',
}

export class ChemistryPanel {
  /** @param {import('../inventory/Inventory.js').Inventory} inventory */
  constructor(inventory) {
    this._inventory = inventory
    this._visible   = false
    this._brewing   = null
    this._rows      = {}
    this._el        = this._build()
    document.body.appendChild(this._el)

    bus.on('ui:open-chemistry',       ()              => this.show())
    bus.on('inventory:changed',       ()              => this._refresh())
    bus.on('chemistry:craft-complete', ({ recipeId }) => this._onComplete(recipeId))
    bus.on('chemistry:craft-failed',   ({ reason })   => this._setStatus(reason))

    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide() })
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.style.cssText = [
      'display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'background:rgba(4,10,4,0.97);border:1px solid rgba(0,230,118,0.3);',
      'border-radius:10px;padding:18px 22px;width:430px;max-height:80vh;overflow-y:auto;',
      'font-family:"Courier New",monospace;color:#c8e6c9;z-index:700;',
      'box-shadow:0 8px 40px rgba(0,0,0,0.9);',
    ].join('')

    const hdr = document.createElement('div')
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'
    const title = document.createElement('span')
    title.style.cssText = 'font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#00e676;'
    title.textContent = 'Chemistry Bench'
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    closeBtn.style.cssText = 'background:none;border:none;color:#888;font-size:14px;cursor:pointer;'
    closeBtn.addEventListener('click', () => this.hide())
    hdr.append(title, closeBtn)
    panel.appendChild(hdr)

    for (const tier of CHEM_TIERS) {
      const tierRecipes = CHEM_RECIPES.filter(r => r.tier === tier)
      if (!tierRecipes.length) continue

      const lbl = document.createElement('div')
      lbl.style.cssText = 'font-size:9px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.35;margin:10px 0 6px;'
      lbl.textContent = tier
      panel.appendChild(lbl)

      for (const recipe of tierRecipes) {
        panel.appendChild(this._buildRow(recipe))
      }
    }

    this._statusEl = document.createElement('div')
    this._statusEl.style.cssText = 'margin-top:10px;font-size:9px;opacity:0.4;text-align:right;min-height:12px;'
    panel.appendChild(this._statusEl)

    return panel
  }

  _buildRow(recipe) {
    const col = OUTPUT_COLORS[recipe.outputId] ?? '#aaa'
    const row = document.createElement('div')
    row.style.cssText = [
      'border:1px solid rgba(255,255,255,0.07);border-radius:6px;',
      'padding:9px 12px;margin-bottom:7px;',
    ].join('')

    const top = document.createElement('div')
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;'
    const nameEl = document.createElement('span')
    nameEl.style.cssText = `font-size:12px;font-weight:bold;color:${col};`
    nameEl.textContent = recipe.name
    const meta = document.createElement('span')
    meta.style.cssText = 'font-size:9px;color:#888;'
    meta.textContent = `Lv ${recipe.level} · ${recipe.xp} XP · ${recipe.brewMs / 1000}s`
    top.append(nameEl, meta)
    row.appendChild(top)

    const ingEl = document.createElement('div')
    ingEl.style.cssText = 'font-size:10px;color:#aaa;margin-bottom:5px;'
    row.appendChild(ingEl)

    if (recipe.note) {
      const noteEl = document.createElement('div')
      noteEl.style.cssText = 'font-size:9px;color:#37474f;margin-bottom:5px;font-style:italic;'
      noteEl.textContent = recipe.note
      row.appendChild(noteEl)
    }

    const footer = document.createElement('div')
    footer.style.cssText = 'display:flex;align-items:center;gap:8px;'

    const btn = document.createElement('button')
    btn.textContent = 'Brew'
    btn.style.cssText = [
      'background:rgba(0,230,118,0.1);border:1px solid rgba(0,230,118,0.35);',
      'color:#00e676;font-family:inherit;font-size:11px;padding:3px 12px;',
      'border-radius:4px;cursor:pointer;transition:background 0.1s;',
    ].join('')
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.background = 'rgba(0,230,118,0.22)' })
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,230,118,0.1)' })
    btn.addEventListener('click', () => {
      bus.emit('chemistry:craft', { recipeId: recipe.id })
      this._startProgress(recipe)
    })

    const progress = document.createElement('div')
    progress.style.cssText = 'flex:1;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;'
    const bar = document.createElement('div')
    bar.style.cssText = `height:100%;width:0;background:${col};transition:width ${recipe.brewMs}ms linear;`
    progress.appendChild(bar)

    footer.append(btn, progress)
    row.appendChild(footer)

    this._rows[recipe.id] = { btn, progressBar: bar, ingEl }
    return row
  }

  // ── Logic ─────────────────────────────────────────────────────────────────

  _refresh() {
    for (const recipe of CHEM_RECIPES) {
      const { ingEl, btn } = this._rows[recipe.id]
      let canMake = true
      const parts = recipe.inputs.map(({ itemId, qty }) => {
        const have  = this._inventory.countItem(itemId)
        if (have < qty) canMake = false
        const color = have >= qty ? '#c8e6c9' : '#ef9a9a'
        return `<span style="color:${color}">${qty}× ${CHEM_INGREDIENT_NAMES[itemId] ?? itemId} (${have})</span>`
      })
      ingEl.innerHTML = parts.join('<span style="color:#555"> · </span>')

      const busy = this._brewing !== null
      btn.disabled    = busy || !canMake
      btn.style.opacity = (busy || !canMake) ? '0.4' : '1'
      btn.style.cursor  = (busy || !canMake) ? 'not-allowed' : 'pointer'
    }
  }

  _startProgress(recipe) {
    this._brewing = recipe.id
    const { progressBar } = this._rows[recipe.id]
    this._refresh()
    requestAnimationFrame(() => { progressBar.style.width = '100%' })
    this._setStatus(`Brewing ${recipe.name}…`)
  }

  _onComplete(recipeId) {
    const recipe = CHEM_RECIPES.find(r => r.id === recipeId)
    const { progressBar } = this._rows[recipeId]
    progressBar.style.transition = 'none'
    progressBar.style.width = '0'
    this._brewing = null
    this._setStatus(`${recipe?.name ?? 'Item'} complete.`)
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

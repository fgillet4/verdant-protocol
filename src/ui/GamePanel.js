/**
 * GamePanel — OSRS-style unified right-side panel.
 * Tabs: Inventory (E) · Equipment (4) · Skills (3) · Attunements (1) · Spells (2)
 * Replaces InventoryPanel, old #skill-panel, and AttunementBar's floating panel.
 * OWNED BY: ui-agent
 */
import { bus }             from '../utils/EventBus.js'
import { EquipGrid }       from './EquipGrid.js'
import { BagGrid }         from './BagGrid.js'
import { SkillPanelUI }    from './SkillPanelUI.js'
import { ATTUNEMENT_LIST } from '../attunement/Attunements.js'

const RARITY_DISPLAY = {
  common:    { color: '#c8c8c8', label: 'Common'    },
  uncommon:  { color: '#4caf50', label: 'Uncommon'  },
  rare:      { color: '#42a5f5', label: 'Rare'      },
  epic:      { color: '#ce93d8', label: 'Epic'      },
  legendary: { color: '#ff9800', label: 'Legendary' },
  artifact:  { color: '#ef5350', label: 'Artifact'  },
}

function _showItemTooltip(item) {
  if (!item) return
  const rar = RARITY_DISPLAY[item.rarity] ?? RARITY_DISPLAY.common
  const bon = item.bonuses ?? {}
  const bonLines = [
    bon.attackBonus   && `<span style="color:#80cbc4">+${bon.attackBonus} Attack</span>`,
    bon.strengthBonus && `<span style="color:#a5d6a7">+${bon.strengthBonus} Strength</span>`,
    bon.defenseBonus  && `<span style="color:#90caf9">+${bon.defenseBonus} Defense</span>`,
    bon.speedBonus    && `<span style="color:#ffe082">+${bon.speedBonus.toFixed(1)} Speed</span>`,
  ].filter(Boolean)

  const html = [
    `<div style="border-bottom:1px solid ${rar.color}33;padding-bottom:5px;margin-bottom:6px;">`,
    `<strong style="color:${rar.color};font-size:12px">${item.name}</strong>`,
    item.slot  ? `<span style="opacity:.55;font-size:9px"> · ${item.slot}</span>`  : '',
    item.style ? `<span style="opacity:.55;font-size:9px"> · ${item.style}</span>` : '',
    `<br><span style="color:${rar.color};font-size:9px;font-weight:bold">${rar.label}</span>`,
    `</div>`,
    item.description ? `<span style="opacity:.75;font-size:10px">${item.description}</span>` : '',
    bonLines.length  ? '<br>' + bonLines.join('<br>') : '',
    item.effect      ? `<br><span style="color:#ffe082;font-size:9px">✦ ${item.effect}</span>` : '',
    item.stackable   ? `<br><span style="opacity:.5;font-size:9px">Qty: ${item.quantity ?? 1}</span>` : '',
  ].join('')

  bus.emit('ui:tooltip', { html })
}

const TABS = [
  { id: 'inventory',   label: 'INV', keys: ['e','E'],   hint: 'Inventory (E)'      },
  { id: 'equipment',   label: 'EQ',  keys: ['4'],       hint: 'Equipment (4)'      },
  { id: 'skills',      label: 'SK',  keys: ['3'],       hint: 'Skills (3)'         },
  { id: 'attunements', label: 'AT',  keys: ['1'],       hint: 'Attunements (1)'    },
  { id: 'spells',      label: 'SP',  keys: ['2'],       hint: 'Spells (2)'         },
]

export class GamePanel {
  constructor(inventory, equipment, player, attunementSystem) {
    this._inv    = inventory
    this._equip  = equipment
    this._player = player
    this._attu   = attunementSystem

    this._visible   = false
    this._activeTab = null
    this._tabBtns   = {}
    this._contents  = {}

    // Sub-components that don't need DOM yet
    this._equipGrid = new EquipGrid(
      equipment,
      slot => { if (equipment.slots[slot]) equipment.unequip(slot) },
      (_ev, slot) => _showItemTooltip(equipment.slots[slot]),
      () => bus.emit('ui:tooltip-hide'),
    )
    this._bagGrid = new BagGrid(
      inventory,
      idx  => { const it = inventory.slots[idx]; if (it?.slot) equipment.equip(it) },
      (_ev, idx)  => _showItemTooltip(inventory.slots[idx]),
      () => bus.emit('ui:tooltip-hide'),
    )

    // Build panel DOM first (creates #skill-grid / #skill-total nodes)
    this._build()
    // SkillPanelUI reads those nodes, so construct after _build
    this._skillUI = new SkillPanelUI()

    this._bindBus()
    this._bindKeys()
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  openTab(id) {
    if (this._visible && this._activeTab === id) { this._hide(); return }
    this._show(id)
  }

  setPlayer(player) {
    this._player = player
    this._skillUI.setPlayer(player)
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────

  _build() {
    const panel = document.createElement('div')
    panel.id = 'game-panel'
    Object.assign(panel.style, {
      display:        'none',
      flexDirection:  'column',
      position:       'fixed',
      bottom:         '70px',
      right:          '16px',
      width:          '222px',
      background:     'rgba(5,12,5,0.96)',
      border:         '1px solid rgba(76,175,80,0.28)',
      borderRadius:   '8px',
      fontFamily:     "'Courier New',monospace",
      color:          '#c8e6c9',
      pointerEvents:  'auto',
      zIndex:         '200',
      userSelect:     'none',
      backdropFilter: 'blur(6px)',
      maxHeight:      '80vh',
    })

    // ── Tab bar ──────────────────────────────────────────────────────────────
    const tabBar = document.createElement('div')
    tabBar.style.cssText = 'display:flex;border-bottom:1px solid rgba(76,175,80,0.18);border-radius:8px 8px 0 0;overflow:hidden;flex-shrink:0;'

    TABS.forEach(t => {
      const btn = document.createElement('div')
      btn.title = t.hint
      btn.textContent = t.label
      btn.style.cssText = 'flex:1;padding:7px 0;text-align:center;cursor:pointer;font-size:9px;letter-spacing:0.1em;color:#81c784;transition:background 0.1s,color 0.1s;border-right:1px solid rgba(76,175,80,0.1);'
      btn.addEventListener('click', () => this.openTab(t.id))
      btn.addEventListener('mouseenter', () => { if (this._activeTab !== t.id) btn.style.background = 'rgba(76,175,80,0.07)' })
      btn.addEventListener('mouseleave', () => { if (this._activeTab !== t.id) btn.style.background = '' })
      this._tabBtns[t.id] = btn
      tabBar.appendChild(btn)
    })

    // ── Body ─────────────────────────────────────────────────────────────────
    const body = document.createElement('div')
    body.style.cssText = 'overflow-y:auto;padding:10px;flex:1;'
    this._body = body

    // Pre-build all tab content divs and hide them
    this._contents.inventory   = this._mkInventoryTab()
    this._contents.equipment   = this._mkEquipmentTab()
    this._contents.skills      = this._mkSkillsTab()
    this._contents.attunements = this._mkAttunementsTab()
    this._contents.spells      = this._mkSpellsTab()
    Object.values(this._contents).forEach(c => { c.style.display = 'none'; body.appendChild(c) })

    panel.append(tabBar, body)
    document.body.appendChild(panel)
    this._panel = panel
  }

  _mkInventoryTab() {
    const wrap  = document.createElement('div')
    const bagEl = this._bagGrid.buildEl()
    bagEl.firstChild?.remove()    // drop "Bag" label — tab has it
    const footer = document.createElement('div')
    footer.style.cssText = 'font-size:9px;opacity:0.32;text-align:right;margin-top:5px;'
    this._slotsUsedEl = footer
    wrap.append(bagEl, footer)
    return wrap
  }

  _mkEquipmentTab() {
    const wrap = document.createElement('div')
    const eqEl = this._equipGrid.buildEl()
    eqEl.firstChild?.remove()    // drop "Equipment" label
    wrap.appendChild(eqEl)
    return wrap
  }

  _mkSkillsTab() {
    const wrap  = document.createElement('div')
    const grid  = document.createElement('div')
    grid.id     = 'skill-grid'
    const total = document.createElement('div')
    total.id    = 'skill-total'
    total.style.cssText = 'text-align:center;font-size:9px;opacity:0.38;border-top:1px solid rgba(255,255,255,0.06);padding-top:5px;letter-spacing:0.1em;margin-top:4px;'
    wrap.append(grid, total)
    return wrap
  }

  _mkAttunementsTab() {
    const CELL = 46, GAP = 4, COLS = 4
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;'

    // ── Header: orb + points + active count ──────────────────────────────────
    const header = document.createElement('div')
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid rgba(76,175,80,0.15);'

    const orb = document.createElement('div')
    orb.style.cssText = 'width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(105,240,174,0.4);display:flex;align-items:center;justify-content:center;font-size:8px;color:#69f0ae;font-weight:bold;flex-shrink:0;'
    orb.textContent = '100'
    this._gpOrbEl = orb

    const info = document.createElement('div')
    info.style.cssText = 'font-size:9px;color:#90a4ae;'
    info.textContent = 'Attunements · max 3 active'

    header.append(orb, info)
    wrap.appendChild(header)

    // ── 4×2 grid of attunement cells ─────────────────────────────────────────
    const gridW = COLS * CELL + (COLS - 1) * GAP
    const grid  = document.createElement('div')
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${COLS},${CELL}px);gap:${GAP}px;width:${gridW}px;`

    for (const def of ATTUNEMENT_LIST) {
      const abbr = def.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()

      const cell = document.createElement('div')
      cell.id = `gpat-${def.id}`
      cell.style.cssText = [
        `width:${CELL}px;height:${CELL}px;box-sizing:border-box;`,
        'border-radius:5px;border:1px solid rgba(255,255,255,0.14);',
        `background:rgba(255,255,255,0.04);`,
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'cursor:pointer;transition:background 0.12s,border-color 0.12s;',
        'position:relative;overflow:hidden;',
      ].join('')

      // Abbr (big)
      const abbrEl = document.createElement('div')
      abbrEl.style.cssText = `font-size:11px;font-weight:bold;color:${def.color};letter-spacing:0.04em;`
      abbrEl.textContent = abbr

      // Drain rate label
      const drainEl = document.createElement('div')
      drainEl.style.cssText = 'font-size:7px;opacity:0.55;margin-top:3px;'
      drainEl.textContent = `${def.drainRate}/s`

      // Slot label (full name, bottom)
      const nameEl = document.createElement('div')
      nameEl.style.cssText = [
        'font-size:6.5px;opacity:0.65;text-align:center;',
        'position:absolute;bottom:3px;left:0;right:0;padding:0 2px;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      ].join('')
      nameEl.textContent = def.name

      cell.append(abbrEl, drainEl, nameEl)

      cell.addEventListener('click', () => {
        const res = this._attu.toggle(def.id)
        if (res === 'full') {
          cell.style.borderColor = '#ef5350'
          setTimeout(() => this._renderAttunements(), 400)
        }
        this._renderAttunements()
      })

      // Tooltip via bus
      cell.addEventListener('mouseenter', () => bus.emit('ui:tooltip', {
        html: `<span style="color:${def.color};font-weight:bold">${def.name}</span>` +
              `<br><span style="opacity:0.7;font-size:10px">${def.description}</span>` +
              `<br><span style="opacity:0.5;font-size:9px">Drain: ${def.drainRate}/s</span>`,
      }))
      cell.addEventListener('mouseleave', () => bus.emit('ui:tooltip-hide'))

      grid.appendChild(cell)
    }

    wrap.appendChild(grid)
    return wrap
  }

  _mkSpellsTab() {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 0;'
    const icon = document.createElement('div')
    icon.style.cssText = 'font-size:28px;opacity:0.18;'
    icon.textContent = '✦'
    const label = document.createElement('div')
    label.style.cssText = 'font-size:10px;opacity:0.3;text-align:center;letter-spacing:0.08em;'
    label.textContent = 'SPELLS\nComing soon'
    label.style.whiteSpace = 'pre'
    wrap.append(icon, label)
    return wrap
  }

  // ── Show / hide ────────────────────────────────────────────────────────────

  _show(tabId) {
    this._panel.style.display = 'flex'
    this._visible   = true
    this._activeTab = tabId

    Object.entries(this._contents).forEach(([id, el]) => { el.style.display = id === tabId ? '' : 'none' })
    Object.entries(this._tabBtns).forEach(([id, btn]) => {
      btn.style.background = id === tabId ? 'rgba(76,175,80,0.15)' : ''
      btn.style.color      = id === tabId ? '#76ff03' : '#81c784'
    })
    this._render()
  }

  _hide() {
    this._panel.style.display = 'none'
    this._visible   = false
    this._activeTab = null
    Object.values(this._tabBtns).forEach(btn => { btn.style.background = ''; btn.style.color = '#81c784' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  _render() {
    if (!this._visible) return
    const t = this._activeTab
    if (t === 'inventory')   this._renderInventory()
    if (t === 'equipment')   this._renderEquipment()
    if (t === 'skills')      this._renderSkills()
    if (t === 'attunements') this._renderAttunements()
  }

  _renderInventory()  {
    this._bagGrid.render()
    if (this._slotsUsedEl) this._slotsUsedEl.textContent = `${this._inv.usedSlots}/28 slots`
  }
  _renderEquipment()  { this._equipGrid.render(this._player) }
  _renderSkills()     {
    this._skillUI.setPlayer(this._player)
    const skills = this._player?.stats?.skills ?? {}
    Object.keys(skills).forEach(id => this._skillUI.refresh(id, this._player))
  }
  _renderAttunements() {
    if (!this._attu) return
    const pts   = this._attu.points ?? 100
    const deg   = Math.round((pts / 100) * 360)
    const color = pts > 30 ? '#69f0ae' : pts > 0 ? '#ffd740' : '#ef5350'
    if (this._gpOrbEl) {
      this._gpOrbEl.style.background = `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg)`
      this._gpOrbEl.style.borderColor = color + '55'
      this._gpOrbEl.textContent = Math.ceil(pts)
    }
    const active = [...(this._attu.active ?? [])]
    for (const def of ATTUNEMENT_LIST) {
      const cell = document.getElementById(`gpat-${def.id}`)
      if (!cell) continue
      const on = active.includes(def.id)
      cell.style.background   = on ? def.color + '22' : 'rgba(255,255,255,0.04)'
      cell.style.borderColor  = on ? def.color + '88' : 'rgba(255,255,255,0.14)'
      cell.style.boxShadow    = on ? `0 0 8px ${def.color}33` : 'none'
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  _bindBus() {
    bus.on('inventory:changed',  () => { if (this._activeTab === 'inventory')   this._renderInventory() })
    bus.on('equipment:changed',  () => { if (this._activeTab === 'equipment')   this._renderEquipment() })
    bus.on('attunement:changed', () => { if (this._activeTab === 'attunements') this._renderAttunements() })
    bus.on('attunement:update',  () => { if (this._activeTab === 'attunements') this._renderAttunements() })
    bus.on('skill:xp-gained', ({ skillId }) => {
      this._skillUI.setPlayer(this._player)
      this._skillUI.refresh(skillId, this._player)
    })
    bus.on('skill:level-up', ({ skillId, newLevel }) => this._skillUI.showLevelUp(skillId, newLevel))
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      const tag = document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      for (const t of TABS) {
        if (t.keys.includes(e.key)) {
          e.preventDefault()
          this.openTab(t.id)
          return
        }
      }
    })
  }
}

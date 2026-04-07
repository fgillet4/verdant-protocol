/**
 * SkillPanelUI — OSRS-style compact 3-column skill icon grid.
 * Shows level, XP pip bar, hover tooltip, right-click modal shortcut.
 * OWNED BY: ui-agent
 */
import { SKILLS, levelProgress, XP_TABLE } from '../skills/SkillRegistry.js'
import { bus }                              from '../utils/EventBus.js'

/** Skills that open a detail modal on right-click */
const MODAL_SKILLS = new Set(['woodcutting', 'mining'])

/** Display order — 3 columns, top-to-bottom left-to-right */
const PANEL_SKILLS = [
  'biomech',     'tenacity',     'vitality',
  'mycelial',    'marksmanship', 'solarcasting',
  'woodcutting', 'mining',       'foundry',
  'chemistry',   'construction', 'technology',
  'ecology',
]

/** 2–3 char abbreviation for the icon bubble */
const ABBR = {
  biomech: 'BM', tenacity: 'TN', vitality: 'VT',
  mycelial: 'MC', marksmanship: 'MK', solarcasting: 'SC',
  woodcutting: 'WC', mining: 'MN', foundry: 'FY',
  chemistry: 'CH', construction: 'CN', technology: 'TC',
  ecology: 'EC',
}

export class SkillPanelUI {
  constructor() {
    this._toastEl   = document.getElementById('levelup-toast')
    this._flashEl   = document.getElementById('levelup-flash')
    this._totalEl   = document.getElementById('skill-total')
    this._tipEl     = document.getElementById('skill-tooltip')
    this._toastTimer = null
    this._tiles      = {}   // skillId → { levelEl, pipFill }
    this._build()
  }

  _build() {
    const grid = document.getElementById('skill-grid')
    if (!grid) return

    for (const skillId of PANEL_SKILLS) {
      const def = SKILLS[skillId]
      if (!def) continue

      const tile = document.createElement('div')
      tile.className = 'skill-tile' + (MODAL_SKILLS.has(skillId) ? ' tile-modal' : '')

      // Coloured icon bubble
      const icon = document.createElement('div')
      icon.className = 'skill-icon'
      icon.style.cssText = `background:${def.color}22;border:1.5px solid ${def.color}66;color:${def.color};`
      icon.textContent = ABBR[skillId] ?? skillId.slice(0, 2).toUpperCase()

      // Skill name
      const nameEl = document.createElement('div')
      nameEl.className = 'skill-tile-name'
      nameEl.textContent = def.name

      // Level number
      const levelEl = document.createElement('div')
      levelEl.className = 'skill-tile-level'
      levelEl.id = `sl-${skillId}`
      levelEl.textContent = '1'

      // XP progress pip at bottom
      const pip = document.createElement('div')
      pip.className = 'skill-xp-pip'
      const pipFill = document.createElement('div')
      pipFill.className = 'skill-xp-pip-fill'
      pipFill.id = `sx-${skillId}`
      pipFill.style.background = def.color
      pip.appendChild(pipFill)

      tile.append(icon, nameEl, levelEl, pip)
      grid.appendChild(tile)

      this._tiles[skillId] = { levelEl, pipFill }

      // Hover tooltip
      tile.addEventListener('mouseenter', e => this._showTip(e, skillId, null))
      tile.addEventListener('mousemove',  e => this._moveTip(e))
      tile.addEventListener('mouseleave', ()  => this._hideTip())

      // Right-click → modal
      if (MODAL_SKILLS.has(skillId)) {
        tile.addEventListener('contextmenu', e => {
          e.preventDefault()
          e.stopPropagation()
          bus.emit('ui:open-modal', { modalId: skillId })
        })
      }
    }
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  /**
   * Update one skill tile from live player data.
   * @param {string} skillId
   * @param {object|null} player
   */
  refresh(skillId, player) {
    const skill = player?.stats?.skills?.[skillId]
    if (!skill) return
    const { levelEl, pipFill } = this._tiles[skillId] ?? {}
    if (levelEl) levelEl.textContent = skill.level
    if (pipFill) pipFill.style.width = (levelProgress(skill.xp) * 100).toFixed(2) + '%'
    this._refreshTotal(player)
  }

  _refreshTotal(player) {
    if (!this._totalEl || !player) return
    let total = 0
    for (const id of PANEL_SKILLS) {
      total += player.stats?.skills?.[id]?.level ?? 1
    }
    this._totalEl.textContent = `Total Level: ${total}`
  }

  // ── Level-up ──────────────────────────────────────────────────────────────

  /**
   * Show golden flash + enhanced toast.
   * @param {string} skillId
   * @param {number} newLevel
   */
  showLevelUp(skillId, newLevel) {
    const def = SKILLS[skillId]
    if (!def) return

    // Golden screen flash
    if (this._flashEl) {
      this._flashEl.classList.remove('levelup-flash-anim')
      void this._flashEl.offsetWidth   // reflow to restart animation
      this._flashEl.classList.add('levelup-flash-anim')
    }

    // Congratulations go to the chat log — toast suppressed
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  _showTip(e, skillId, player) {
    if (!this._tipEl) return
    const def   = SKILLS[skillId]
    const skill = this._lastPlayer?.stats?.skills?.[skillId]
    const xp    = skill?.xp ?? 0
    const level = skill?.level ?? 1
    const nextXp = level < 99 ? XP_TABLE[level + 1] - xp : 0
    const nextStr = level < 99 ? `${nextXp.toLocaleString()} xp to level ${level + 1}` : 'MAX'

    this._tipEl.innerHTML = `
      <div style="color:${def.color};font-weight:bold;margin-bottom:3px">${def.name}</div>
      <div style="opacity:0.6;font-size:9px;margin-bottom:5px">${def.description}</div>
      <div>Level: <strong>${level}</strong></div>
      <div>XP: <strong>${xp.toLocaleString()}</strong></div>
      <div style="opacity:0.55;font-size:9px;margin-top:2px">${nextStr}</div>
    `
    this._tipEl.style.display = 'block'
    this._moveTip(e)
  }

  _moveTip(e) {
    if (!this._tipEl) return
    const x = e.clientX + 14
    const y = e.clientY - 10
    this._tipEl.style.left = Math.min(x, window.innerWidth  - 200) + 'px'
    this._tipEl.style.top  = Math.min(y, window.innerHeight - 120) + 'px'
  }

  _hideTip() {
    if (this._tipEl) this._tipEl.style.display = 'none'
  }

  /** Called by HUD so the tooltip can access live XP */
  setPlayer(player) { this._lastPlayer = player }
}

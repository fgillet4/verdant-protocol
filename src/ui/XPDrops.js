/**
 * XPDrops — OSRS-style floating XP gain notifications (top-right stack).
 * Listens to skill:xp-gained and appends animated drop entries.
 * OWNED BY: ui-agent
 */
import { SKILLS } from '../skills/SkillRegistry.js'
import { bus }    from '../utils/EventBus.js'

const ANIM_DURATION_MS = 3200

export class XPDrops {
  constructor() {
    this._el = document.getElementById('xp-drops')
    bus.on('skill:xp-gained', ({ skillId, amount }) => this._spawn(skillId, amount))
  }

  _spawn(skillId, amount) {
    if (!this._el) return
    const def = SKILLS[skillId]
    if (!def) return

    const drop = document.createElement('div')
    drop.className = 'xp-drop'

    const dot = document.createElement('div')
    dot.className = 'xp-drop-dot'
    dot.style.background = def.color

    const label = document.createElement('span')
    label.textContent = `${def.name} +${amount.toLocaleString()} xp`

    drop.append(dot, label)
    this._el.appendChild(drop)

    setTimeout(() => drop.remove(), ANIM_DURATION_MS)
  }
}

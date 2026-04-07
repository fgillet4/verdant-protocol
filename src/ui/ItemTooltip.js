/**
 * ItemTooltip — floating tooltip that follows the cursor and shows item details.
 * Shows name (rarity-coloured), rarity badge, description, stat bonuses.
 * Appends one DOM element to document.body on construction.
 */

const RARITY_DISPLAY = {
  common:    { color: '#c8c8c8', label: 'Common'    },
  uncommon:  { color: '#4caf50', label: 'Uncommon'  },
  rare:      { color: '#42a5f5', label: 'Rare'      },
  epic:      { color: '#ce93d8', label: 'Epic'      },
  legendary: { color: '#ff9800', label: 'Legendary' },
  artifact:  { color: '#ef5350', label: 'Artifact'  },
}

export class ItemTooltip {
  constructor() {
    const tip = document.createElement('div')
    tip.style.cssText = [
      'display:none;position:fixed;z-index:820;pointer-events:none;',
      'background:rgba(4,10,4,0.97);',
      'border-radius:6px;padding:9px 13px;font-size:11px;color:#c8e6c9;',
      'max-width:220px;line-height:1.7;font-family:"Courier New",monospace;',
    ].join('')
    document.body.appendChild(tip)
    this._el = tip

    document.addEventListener('mousemove', e => {
      if (tip.style.display === 'none') return
      tip.style.left = Math.min(e.clientX + 16, window.innerWidth - 240) + 'px'
      tip.style.top  = Math.max(e.clientY - 12, 8) + 'px'
    })
  }

  /**
   * @param {MouseEvent} e
   * @param {object|null} item
   */
  show(e, item) {
    if (!item) return
    const bon = item.bonuses ?? {}
    const rar = RARITY_DISPLAY[item.rarity] ?? RARITY_DISPLAY.common

    const bonLines = [
      bon.attackBonus   && `<span style="color:#80cbc4">+${bon.attackBonus} Attack</span>`,
      bon.strengthBonus && `<span style="color:#a5d6a7">+${bon.strengthBonus} Strength</span>`,
      bon.defenseBonus  && `<span style="color:#90caf9">+${bon.defenseBonus} Defense</span>`,
      bon.speedBonus    && `<span style="color:#ffe082">+${bon.speedBonus.toFixed(1)} Speed</span>`,
    ].filter(Boolean)

    // Border colour matches rarity
    this._el.style.border = `1px solid ${rar.color}66`

    this._el.innerHTML = [
      `<div style="border-bottom:1px solid ${rar.color}33;padding-bottom:5px;margin-bottom:6px;">`,
      `<strong style="color:${rar.color};font-size:12px">${_esc(item.name)}</strong>`,
      item.slot  ? `<span style="opacity:.45;font-size:9px"> · ${item.slot}</span>`  : '',
      item.style ? `<span style="opacity:.45;font-size:9px"> · ${item.style}</span>` : '',
      `<br><span style="color:${rar.color};font-size:9px;font-weight:bold">${rar.label}</span>`,
      `</div>`,
      item.description ? `<span style="opacity:.7;font-size:10px">${_esc(item.description)}</span>` : '',
      bonLines.length ? '<br>' + bonLines.join('<br>') : '',
      item.effect    ? `<br><span style="color:#ffe082;font-size:9px">✦ ${_esc(item.effect)}</span>` : '',
      item.stackable ? `<br><span style="opacity:.4;font-size:9px">Qty: ${item.quantity ?? 1}</span>` : '',
    ].join('')

    this._el.style.display = 'block'
    this._el.style.left = Math.min(e.clientX + 16, window.innerWidth - 240) + 'px'
    this._el.style.top  = Math.max(e.clientY - 12, 8) + 'px'
  }

  hide() { this._el.style.display = 'none' }
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

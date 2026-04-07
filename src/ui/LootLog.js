/**
 * LootLog — bottom-left item acquisition feed (5 entries, 4s fade).
 */
export class LootLog {
  constructor() {
    this._container = document.getElementById('loot-log')
  }

  /** @param {object} item */
  show(item) {
    if (!this._container) return
    const el  = document.createElement('div')
    el.className = 'loot-entry'
    const qty = item.stackable && item.quantity > 1 ? ` ×${item.quantity}` : ''
    el.innerHTML = `<span style="color:${item.color}">+ ${item.name}${qty}</span>`
    this._container.appendChild(el)
    while (this._container.children.length > 5) this._container.removeChild(this._container.firstChild)
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500) }, 4000)
  }
}

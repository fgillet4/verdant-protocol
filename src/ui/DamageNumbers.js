/**
 * DamageNumbers — spawns floating damage numbers above hit targets.
 * Projects 3D world positions to screen coords via the engine camera.
 */
export class DamageNumbers {
  /** @param {import('../engine/Engine.js').Engine} engine */
  constructor(engine) {
    this._engine    = engine
    this._container = document.getElementById('damage-numbers')
  }

  /**
   * @param {number} damage
   * @param {THREE.Vector3} worldPos
   * @param {string} type — 'dot' | 'solarcasting' | 'mycelial' | 'biomech' | etc.
   */
  spawn(damage, worldPos, type) {
    if (!this._container) return

    const pos = worldPos.clone()
    pos.y += 1.8
    pos.project(this._engine.camera)
    if (pos.z > 1) return   // behind camera

    const canvas = this._engine.renderer.domElement
    const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth
    const y = (1 - (pos.y * 0.5 + 0.5)) * canvas.clientHeight

    const el = document.createElement('div')
    el.className = 'damage-number'

    if (damage === 0) {
      el.textContent = 'miss'
      el.style.cssText += 'color:#666;font-size:13px'
    } else {
      el.textContent = damage
      el.style.color = type === 'dot'          ? '#ff9800'
                     : type === 'solarcasting' ? '#ffd740'
                     : type === 'mycelial'     ? '#69f0ae'
                     : '#ffffff'
    }

    el.style.left = x + 'px'
    el.style.top  = y + 'px'
    this._container.appendChild(el)
    setTimeout(() => el.remove(), 900)
  }
}

/**
 * PlayerSpeech — floating speech bubbles above player/entity heads.
 * Listens to chat:message, projects world → screen each frame.
 * OWNED BY: ui-agent
 */
import * as THREE from 'three'
import { bus }    from '../utils/EventBus.js'

const BUBBLE_DURATION_MS = 6000
const HEAD_OFFSET_Y      = 2.4   // units above entity origin

export class PlayerSpeech {
  /**
   * @param {import('../engine/Engine.js').Engine} engine
   */
  constructor(engine) {
    this._engine   = engine
    this._entities = new Map()   // id → { object: THREE.Object3D, bubbleEl }
    this._bubbles  = []          // { el, worldObj, expiry }

    this._container = document.createElement('div')
    this._container.style.cssText = [
      'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:400;',
    ].join('')
    document.body.appendChild(this._container)

    bus.on('chat:message', ({ playerId, text }) => {
      const entry = this._entities.get(playerId ?? 'player')
      if (entry) this._spawn(entry.object, text)
    })
  }

  /**
   * Register an entity so speech can appear above it.
   * @param {string} id
   * @param {THREE.Object3D} object
   */
  registerEntity(id, object) {
    this._entities.set(id, { object })
  }

  /** Call every frame from HUD.update(). */
  update() {
    const now    = Date.now()
    const camera = this._engine.camera
    const canvas = this._engine.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    const _v = new THREE.Vector3()

    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i]

      if (now > b.expiry) {
        b.el.remove()
        this._bubbles.splice(i, 1)
        continue
      }

      // Project world position → NDC → CSS pixels
      _v.copy(b.worldObj.position)
      _v.y += HEAD_OFFSET_Y
      _v.project(camera)

      const sx = ( _v.x * 0.5 + 0.5) * w
      const sy = (-_v.y * 0.5 + 0.5) * h

      // Hide if behind camera
      if (_v.z > 1) {
        b.el.style.display = 'none'
        continue
      }
      b.el.style.display = ''
      b.el.style.left    = sx + 'px'
      b.el.style.top     = sy + 'px'

      // Fade out in last 1.5s
      const remaining = b.expiry - now
      b.el.style.opacity = remaining < 1500 ? (remaining / 1500).toFixed(2) : '1'
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _spawn(worldObj, text) {
    const el = document.createElement('div')
    el.style.cssText = [
      'position:absolute;transform:translate(-50%,-100%);',
      'background:rgba(3,10,3,0.88);',
      'border:1px solid rgba(76,175,80,0.45);border-radius:10px;',
      'padding:4px 10px;max-width:200px;',
      'font-family:"Courier New",monospace;font-size:12px;',
      'color:#e8f5e9;white-space:pre-wrap;word-break:break-word;',
      'text-align:center;pointer-events:none;',
      // tail triangle pointing down
      'filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));',
    ].join('')
    el.textContent = text

    // Little tail
    const tail = document.createElement('div')
    tail.style.cssText = [
      'position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);',
      'width:0;height:0;',
      'border-left:6px solid transparent;border-right:6px solid transparent;',
      'border-top:6px solid rgba(76,175,80,0.45);',
    ].join('')
    el.appendChild(tail)

    this._container.appendChild(el)
    this._bubbles.push({ el, worldObj, expiry: Date.now() + BUBBLE_DURATION_MS })
  }
}

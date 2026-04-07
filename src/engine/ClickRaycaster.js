/**
 * ClickRaycaster — handles left-click and right-click raycasting.
 * Interactables carry a typed record { entityId, type, label } so callers
 * can dispatch appropriately without knowing object internals.
 * Left-click:  enemy → player:attack-target | tree → skill:action | ground → player:click-move
 * Right-click: emits ui:right-click with typed target for ContextMenu.
 * OWNED BY: engine-agent
 */
import * as THREE from 'three'
import { bus }    from '../utils/EventBus.js'

const TOOLTIP_COLOR = {
  enemy:     '#69f0ae',
  tree:      '#a5d6a7',
  ore:       '#b0bec5',
  gather:    '#81c784',
  foundry:   '#ff8a65',
  chembench: '#00e676',
  techbench: '#00bcd4',
}

/** Returns OSRS-style colour string based on enemy level vs player level. */
function _levelColor(enemyLevel, playerLevel) {
  const diff = enemyLevel - playerLevel
  if (diff <= -10) return '#4caf50'       // green — very easy
  if (diff <=  -5) return '#cddc39'       // yellow-green
  if (diff <=   4) return '#ffd740'       // yellow — even match
  if (diff <=   9) return '#ff9800'       // orange — higher
  return '#ef5350'                        // red — much higher
}

function _tooltipHtml(type, label, meta, playerLevel) {
  const color = TOOLTIP_COLOR[type] ?? '#c8e6c9'
  if (type === 'enemy') {
    const lvl      = meta?.combatLevel ?? '?'
    const lvlColor = (playerLevel != null && meta?.combatLevel != null)
      ? _levelColor(meta.combatLevel, playerLevel) : '#ffd740'
    return `<span style="color:${color};font-weight:bold">${label}</span>` +
           `<br><span style="color:${lvlColor};font-size:10px">Level ${lvl}</span>`
  }
  return `<span style="color:${color};font-weight:bold">${label}</span>`
}

export class ClickRaycaster {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Camera} camera
   */
  constructor(renderer, camera) {
    this._renderer  = renderer
    this._camera    = camera
    this._rc        = new THREE.Raycaster()
    this._mouse     = new THREE.Vector2()
    /** @type {THREE.Mesh[]} */
    this._walkable  = []
    /** @type {THREE.Object3D[]} */
    this._interactables = []
    /** @type {Map<THREE.Object3D, {entityId:string, type:string, label:string}>} */
    this._entityMap = new Map()

    renderer.domElement.addEventListener('pointerdown',  e => this._onClick(e))
    renderer.domElement.addEventListener('contextmenu',  e => this._onRightClick(e))
    renderer.domElement.addEventListener('pointermove',  e => this._onHover(e))

    /** @type {string|null} entityId of currently hovered interactable */
    this._lastHoverId = null
    /** @type {object|null} player ref for level comparison */
    this._player = null
  }

  /** @param {object} player — player entity with stats.combatLevel or stats.attack/defense */
  setPlayerRef(player) { this._player = player }

  /** @param {THREE.Mesh|THREE.Mesh[]} mesh */
  addWalkable(mesh) {
    const arr = Array.isArray(mesh) ? mesh : [mesh]
    this._walkable.push(...arr)
  }

  /**
   * @param {THREE.Object3D} object
   * @param {string} entityId
   * @param {string} [type='enemy']  'enemy' | 'tree' | 'object'
   * @param {string} [label]
   */
  addInteractable(object, entityId, type = 'enemy', label = '', meta = {}) {
    this._interactables.push(object)
    const record = { entityId, type, label, meta }
    object.traverse(child => {
      if (child.isMesh) this._entityMap.set(child, record)
    })
    this._entityMap.set(object, record)
  }

  /** @param {string} entityId */
  removeInteractable(entityId) {
    this._interactables = this._interactables.filter(
      o => this._entityMap.get(o)?.entityId !== entityId
    )
    for (const [mesh, rec] of this._entityMap) {
      if (rec.entityId === entityId) this._entityMap.delete(mesh)
    }
  }

  _onClick(e) {
    if (e.button !== 0) return
    this._updateMouse(e)

    if (this._interactables.length > 0) {
      const hits = this._rc.intersectObjects(this._interactables, true)
      if (hits.length > 0) {
        const rec = this._entityMap.get(hits[0].object)
        if (rec) {
          this._dispatchLeftClick(rec, e, hits[0].point.clone())
          return
        }
      }
    }

    // Ground movement
    const hits = this._rc.intersectObjects(this._walkable, true)
    if (hits.length > 0) {
      bus.emit('player:click-move', { worldPos: hits[0].point.clone() })
      this._flashIndicator(e.clientX, e.clientY, false)
    }
  }

  /**
   * @param {{entityId:string, type:string, label:string}} rec
   * @param {PointerEvent} e
   * @param {THREE.Vector3} hitPoint
   */
  _dispatchLeftClick(rec, e, hitPoint) {
    this._flashIndicator(e.clientX, e.clientY, true)
    switch (rec.type) {
      case 'enemy':
        bus.emit('player:attack-target', { targetId: rec.entityId })
        break
      case 'tree':
        bus.emit('skill:action', { type: 'woodcutting', target: rec })
        break
      case 'ore':
        bus.emit('skill:action', { type: 'mining', target: rec })
        break
      case 'gather':
        bus.emit('skill:action', { type: 'gather', target: rec })
        break
      case 'foundry':
        bus.emit('player:click-move', { worldPos: hitPoint, _internal: true })
        bus.emit('ui:open-foundry', { stationId: rec.entityId })
        break
      case 'chembench':
        bus.emit('player:click-move', { worldPos: hitPoint, _internal: true })
        bus.emit('ui:open-chemistry', { benchId: rec.entityId })
        break
      case 'techbench':
        bus.emit('player:click-move', { worldPos: hitPoint, _internal: true })
        bus.emit('ui:open-tech', { benchId: rec.entityId })
        break
      default:
        bus.emit('world:interact', { entityId: rec.entityId, type: rec.type })
    }
  }

  _onRightClick(e) {
    e.preventDefault()
    this._updateMouse(e)

    if (this._interactables.length > 0) {
      const hits = this._rc.intersectObjects(this._interactables, true)
      if (hits.length > 0) {
        const rec = this._entityMap.get(hits[0].object)
        if (rec) {
          bus.emit('ui:right-click', {
            x: e.clientX, y: e.clientY,
            target: { type: rec.type, entityId: rec.entityId, label: rec.label },
          })
          return
        }
      }
    }

    const hits = this._rc.intersectObjects(this._walkable, true)
    if (hits.length > 0) {
      bus.emit('ui:right-click', {
        x: e.clientX, y: e.clientY,
        target: { type: 'ground', worldPos: hits[0].point.clone() },
      })
    }
  }

  _updateMouse(e) {
    const rect = this._renderer.domElement.getBoundingClientRect()
    this._mouse.set(
      ((e.clientX - rect.left)  / rect.width)  * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this._rc.setFromCamera(this._mouse, this._camera)
  }

  _onHover(e) {
    this._updateMouse(e)

    if (this._interactables.length > 0) {
      const hits = this._rc.intersectObjects(this._interactables, true)
      if (hits.length > 0) {
        const rec = this._entityMap.get(hits[0].object)
        if (rec) {
          if (this._lastHoverId !== rec.entityId) {
            this._lastHoverId = rec.entityId
            const playerLevel = this._player?.stats?.combatLevel
              ?? (this._player ? Math.floor((this._player.stats.attack + this._player.stats.defense) / 2) : null)
            bus.emit('ui:tooltip', { html: _tooltipHtml(rec.type, rec.label, rec.meta, playerLevel) })
          }
          return
        }
      }
    }

    if (this._lastHoverId !== null) {
      this._lastHoverId = null
      bus.emit('ui:tooltip-hide')
    }
  }

  /** @param {number} x @param {number} y @param {boolean} isAction */
  _flashIndicator(x, y, isAction = false) {
    const el = document.getElementById('click-indicator')
    if (!el) return
    el.style.left = x + 'px'
    el.style.top  = y + 'px'
    el.classList.toggle('click-action', isAction)
    el.classList.remove('click-pulse')
    void el.offsetWidth
    el.classList.add('click-pulse')
  }
}

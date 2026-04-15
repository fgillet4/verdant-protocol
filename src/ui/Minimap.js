/**
 * Minimap — OSRS-style circular minimap (top-right) + full map modal (M key).
 * Layer-based: call addLayer() from main.js to register world entity sets.
 * OWNED BY: ui-agent
 */
import * as THREE from 'three'

const MM_SIZE    = 180      // canvas px (displayed 160px via CSS)
const MM_RANGE   = 38       // world-unit radius visible in minimap
const MAP_SIZE   = 580      // full map canvas px
const WORLD_HALF = 150      // assumed world half-extent in world units

export class Minimap {
  /**
   * @param {import('../player/Player.js').Player} player
   */
  constructor(player) {
    this._player   = player
    this._layers   = []       // { id, getter, color, radius, shape }
    this._visible  = true
    this._modalOpen = false
    this._camTheta  = 0       // camera horizontal azimuth, updated each frame

    this._buildMinimap()
    this._buildModal()

    window.addEventListener('keydown', e => {
      if (e.key === 'm' || e.key === 'M') {
        // don't fire while typing in chat
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
        this._toggleModal()
      }
    })
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Register a world layer (trees, enemies, etc.) to be drawn each frame.
   * @param {string} id
   * @param {() => Array<{x:number, z:number}>} getter — called each frame
   * @param {string} color — CSS color
   * @param {number} [radius=2] — dot radius in px (at minimap scale)
   * @param {'dot'|'triangle'} [shape='dot']
   */
  addLayer(id, getter, color, radius = 2, shape = 'dot') {
    this._layers.push({ id, getter, color, radius, shape })
  }

  /** @param {number} theta — Engine._camTheta (radians) */
  setCamTheta(theta) { this._camTheta = theta }

  /** Call every frame from HUD.update(). */
  update() {
    if (!this._visible) return
    this._draw(this._ctx, MM_SIZE, MM_RANGE, true)
    if (this._modalOpen) {
      this._draw(this._mapCtx, MAP_SIZE, WORLD_HALF, false)
    }
    this._updateCompass()
  }

  /**
   * Orbit all four cardinal labels around the minimap edge.
   * theta=0 → camera faces north → N at top, E at right, S at bottom, W at left.
   */
  _updateCompass() {
    if (!this._cardinals) return
    const sz = this._wrap.offsetWidth || 160
    const cx = sz / 2, cy = sz / 2, r = sz / 2 - 4
    for (const el of this._cardinals) {
      const a = this._camTheta + el._offset
      el.style.left      = (cx + Math.sin(a) * r) + 'px'
      el.style.top       = (cy - Math.cos(a) * r) + 'px'
      el.style.transform = 'translate(-50%, -50%)'
    }
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  _buildMinimap() {
    const hud = document.getElementById('hud')

    const wrap = document.createElement('div')
    wrap.id = 'minimap-wrap'

    // Canvas
    const canvas = document.createElement('canvas')
    canvas.width  = MM_SIZE
    canvas.height = MM_SIZE
    canvas.id = 'minimap-canvas'
    this._ctx = canvas.getContext('2d')

    // Compass cardinal labels — positions updated each frame by _updateCompass()
    this._cardinals = ['N', 'E', 'S', 'W'].map((dir, i) => {
      const el = document.createElement('div')
      el.className = 'minimap-cardinal'
      el.textContent = dir
      el.style.cssText = [
        'position:absolute;font-size:8px;font-weight:bold;pointer-events:none;',
        'letter-spacing:0.1em;text-shadow:0 1px 3px rgba(0,0,0,0.9);',
        `color:${dir === 'N' ? '#ef5350' : 'rgba(200,230,200,0.7)'};`,
      ].join('')
      el._offset = i * Math.PI / 2   // N=0, E=π/2, S=π, W=3π/2
      wrap.appendChild(el)
      return el
    })

    // M key hint
    const hint = document.createElement('div')
    hint.id = 'minimap-hint'
    hint.textContent = 'M'

    wrap.append(canvas, hint)
    hud.appendChild(wrap)
    this._wrap = wrap
  }

  _buildModal() {
    const modal = document.createElement('div')
    modal.id = 'map-modal'

    const inner = document.createElement('div')
    inner.id = 'map-modal-inner'

    const header = document.createElement('div')
    header.id = 'map-modal-header'
    header.innerHTML = `
      <span id="map-modal-title">World Map</span>
      <span id="map-modal-close" onclick="document.getElementById('map-modal').classList.remove('open')">✕</span>
    `

    const canvas = document.createElement('canvas')
    canvas.id     = 'map-canvas'
    canvas.width  = MAP_SIZE
    canvas.height = MAP_SIZE
    this._mapCtx  = canvas.getContext('2d')

    // Legend
    const legend = document.createElement('div')
    legend.id = 'map-legend'
    legend.innerHTML = `
      <span class="map-legend-item"><span class="map-dot" style="background:#ffffff"></span>You</span>
      <span class="map-legend-item"><span class="map-dot" style="background:#ef5350"></span>Enemies</span>
      <span class="map-legend-item"><span class="map-dot" style="background:#2e7d32"></span>Trees</span>
      <span class="map-legend-item"><span class="map-dot" style="background:#78909c"></span>Ore</span>
      <span class="map-legend-item"><span class="map-dot" style="background:#81c784"></span>Gather</span>
      <span class="map-legend-item"><span class="map-dot" style="background:#4db6ac"></span>Structures</span>
    `

    inner.append(header, canvas, legend)
    modal.appendChild(inner)
    document.getElementById('hud').appendChild(modal)
    this._modal = modal

    // Click backdrop to close
    modal.addEventListener('click', e => {
      if (e.target === modal) this._toggleModal()
    })

    // Show coordinates on hover
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      const scale = MAP_SIZE / (WORLD_HALF * 2)
      const wx = Math.round((cx - MAP_SIZE / 2) / scale)
      const wz = Math.round((cy - MAP_SIZE / 2) / scale)
      document.getElementById('map-modal-title').textContent = `World Map  (${wx}, ${wz})`
    })
    canvas.addEventListener('mouseleave', () => {
      document.getElementById('map-modal-title').textContent = 'World Map'
    })
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  _draw(ctx, size, range, circular) {
    const px = this._player?.object?.position?.x ?? 0
    const pz = this._player?.object?.position?.z ?? 0
    const scale = size / (range * 2)   // px per world unit

    ctx.clearRect(0, 0, size, size)

    if (circular) {
      // Clip to circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
      ctx.clip()
    }

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#0a1a0a'
    ctx.fillRect(0, 0, size, size)

    // Subtle terrain texture — faint grid
    ctx.strokeStyle = 'rgba(76,175,80,0.06)'
    ctx.lineWidth = 1
    const gridStep = 10 * scale  // 10 world units
    if (circular) {
      // offset so grid tiles with world coords
      const offX = ((px % 10) * scale)
      const offZ = ((pz % 10) * scale)
      for (let x = (size / 2 - offX) % gridStep - gridStep; x < size; x += gridStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
      }
      for (let y = (size / 2 - offZ) % gridStep - gridStep; y < size; y += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
      }
    } else {
      // Full map — absolute grid
      const originX = size / 2 - px * scale
      const originZ = size / 2 - pz * scale
      for (let wx = -WORLD_HALF; wx <= WORLD_HALF; wx += 20) {
        const x = originX + wx * scale
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke()
      }
      for (let wz = -WORLD_HALF; wz <= WORLD_HALF; wz += 20) {
        const y = originZ + wz * scale
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke()
      }
    }

    // ── World origin cross (full map only) ──────────────────────────────────
    if (!circular) {
      const ox = size / 2 - px * scale + 0 * scale
      const oz = size / 2 - pz * scale + 0 * scale
      ctx.strokeStyle = 'rgba(76,175,80,0.2)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, size); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, oz); ctx.lineTo(size, oz); ctx.stroke()
    }

    // ── Entity layers ────────────────────────────────────────────────────────
    for (const layer of this._layers) {
      let positions
      try { positions = layer.getter() } catch { continue }
      if (!positions?.length) continue

      ctx.fillStyle = layer.color

      for (const pos of positions) {
        let sx, sy
        if (circular) {
          sx = (pos.x - px) * scale + size / 2
          sy = (pos.z - pz) * scale + size / 2
        } else {
          sx = (pos.x - (-WORLD_HALF)) / (WORLD_HALF * 2) * size
          sy = (pos.z - (-WORLD_HALF)) / (WORLD_HALF * 2) * size
        }
        // Skip off-canvas
        if (sx < 0 || sy < 0 || sx > size || sy > size) continue

        ctx.beginPath()
        ctx.arc(sx, sy, layer.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── Player dot + direction indicator ─────────────────────────────────────
    const cx = circular ? size / 2 : (px - (-WORLD_HALF)) / (WORLD_HALF * 2) * size
    const cy = circular ? size / 2 : (pz - (-WORLD_HALF)) / (WORLD_HALF * 2) * size

    // Facing direction arrow
    const yaw = this._player?.object?.rotation?.y ?? 0
    const arrowLen = circular ? 8 : 6
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth   = circular ? 1.5 : 1
    ctx.lineCap     = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.sin(-yaw) * arrowLen, cy - Math.cos(-yaw) * arrowLen)
    ctx.stroke()

    // White dot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, circular ? 3 : 4, 0, Math.PI * 2)
    ctx.fill()

    // Dot border
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth   = 1
    ctx.stroke()

    if (circular) ctx.restore()

    // ── Minimap border vignette (circular only) ──────────────────────────────
    if (circular) {
      const grad = ctx.createRadialGradient(size/2, size/2, size/2 - 20, size/2, size/2, size/2)
      grad.addColorStop(0, 'transparent')
      grad.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(size/2, size/2, size/2, 0, Math.PI*2)
      ctx.fill()
    }
  }

  // ── Modal toggle ──────────────────────────────────────────────────────────

  _toggleModal() {
    this._modalOpen = !this._modalOpen
    this._modal.classList.toggle('open', this._modalOpen)
    if (this._modalOpen) {
      // Immediate draw
      this._draw(this._mapCtx, MAP_SIZE, WORLD_HALF, false)
    }
  }
}

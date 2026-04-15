/**
 * DayCycleOrb — animated canvas orb next to the minimap showing ingame time.
 * Draws a mini sky arc with a sun (or moon for low elevations) sweeping across.
 * Call update() every frame (registered with GameLoop).
 * OWNED BY: ui-agent
 */

const SIZE       = 60     // canvas px — diameter of the orb
const HALF       = SIZE / 2
const ARC_R      = 22     // radius of the sun/moon sweep arc
const BODY_R     = 5      // sun/moon dot radius

/** Sky background colours keyed by rough time bands (t = 0–1). */
const SKY_STOPS = [
  { t: 0.00, sky: '#1a0a1f', horizon: '#c05020' },   // dawn
  { t: 0.12, sky: '#1a3a5c', horizon: '#ffa040' },   // early morning
  { t: 0.30, sky: '#2e6aad', horizon: '#87ceeb' },   // morning
  { t: 0.50, sky: '#1565c0', horizon: '#64b5f6' },   // noon
  { t: 0.70, sky: '#1e4d82', horizon: '#90caf9' },   // afternoon
  { t: 0.82, sky: '#4a1a00', horizon: '#ff7043' },   // golden hour
  { t: 0.92, sky: '#1a0a1f', horizon: '#8b3a10' },   // sunset
  { t: 1.00, sky: '#1a0a1f', horizon: '#c05020' },   // wrap back to dawn
]

function _lerp(a, b, f) { return a + (b - a) * f }

function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function _lerpColor(hexA, hexB, f) {
  const [ar, ag, ab] = _hexToRgb(hexA)
  const [br, bg, bb] = _hexToRgb(hexB)
  return `rgb(${Math.round(_lerp(ar, br, f))},${Math.round(_lerp(ag, bg, f))},${Math.round(_lerp(ab, bb, f))})`
}

function _skyAtT(t) {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const a = SKY_STOPS[i], b = SKY_STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / (b.t - a.t)
      return {
        sky:     _lerpColor(a.sky,     b.sky,     f),
        horizon: _lerpColor(a.horizon, b.horizon, f),
      }
    }
  }
  return SKY_STOPS[0]
}

export class DayCycleOrb {
  /**
   * @param {import('../engine/DayCycle.js').DayCycle} dayCycle
   */
  constructor(dayCycle) {
    this._dc = dayCycle
    this._canvas = document.createElement('canvas')
    this._canvas.width  = SIZE
    this._canvas.height = SIZE
    this._canvas.id     = 'day-cycle-orb'
    this._ctx = this._canvas.getContext('2d')

    this._label = document.createElement('div')
    this._label.id = 'day-cycle-label'

    this._wrap = document.createElement('div')
    this._wrap.id = 'day-cycle-wrap'
    this._wrap.append(this._canvas, this._label)

    const hud = document.getElementById('hud')
    if (hud) hud.appendChild(this._wrap)
  }

  update() {
    const t    = this._dc.t
    const elev = this._dc.elevation    // 4–55 degrees
    const { sky, horizon } = _skyAtT(t)

    const ctx  = this._ctx
    ctx.clearRect(0, 0, SIZE, SIZE)

    // ── Clip to circle ────────────────────────────────────────────────────
    ctx.save()
    ctx.beginPath()
    ctx.arc(HALF, HALF, HALF - 1, 0, Math.PI * 2)
    ctx.clip()

    // ── Sky gradient background ───────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, 0, 0, SIZE)
    grad.addColorStop(0,    sky)
    grad.addColorStop(0.65, sky)
    grad.addColorStop(1,    horizon)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, SIZE, SIZE)

    // ── Horizon line ──────────────────────────────────────────────────────
    ctx.strokeStyle = `${horizon}88`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HALF + 12)
    ctx.lineTo(SIZE, HALF + 12)
    ctx.stroke()

    // ── Sun position — t=0 left, t=0.5 zenith, t=1 right ─────────────────
    // Map t → angle: 0=left horizon (π), 0.5=top (0), 1=right horizon (0)
    // Use elevation to set height: 4° → near horizon, 55° → near top
    const elevFactor = (elev - 4) / (55 - 4)   // 0–1
    // Horizontal: t=0 → x=left edge, t=0.5 → centre, t=1 → right edge
    const sunX = HALF + ARC_R * Math.sin(Math.PI * (2 * t - 1))
    const sunY = (HALF + 12) - ARC_R * elevFactor * 1.4 - 2

    // Is it "night" enough to show moon? (elevation near minimum means dusk/dawn boundary)
    // The game doesn't have true night, so just show a dimmer sun at low elevations
    const isLowSun = elev < 15

    // Sun glow
    if (!isLowSun) {
      const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, BODY_R * 2.5)
      glow.addColorStop(0,   'rgba(255,220,80,0.6)')
      glow.addColorStop(1,   'rgba(255,180,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(sunX - BODY_R * 3, sunY - BODY_R * 3, BODY_R * 6, BODY_R * 6)
    }

    // Sun / moon disc
    ctx.beginPath()
    ctx.arc(sunX, sunY, BODY_R, 0, Math.PI * 2)
    ctx.fillStyle = isLowSun ? '#c8d8f0' : '#ffe066'
    ctx.shadowColor = isLowSun ? '#a0b8e0' : '#ffcc00'
    ctx.shadowBlur  = isLowSun ? 4 : 8
    ctx.fill()
    ctx.shadowBlur  = 0

    ctx.restore()

    // ── Border ring ───────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(HALF, HALF, HALF - 1, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(120,180,120,0.45)'
    ctx.lineWidth   = 1.5
    ctx.stroke()

    // ── Label ─────────────────────────────────────────────────────────────
    this._label.textContent = this._dc.timeOfDay
  }
}

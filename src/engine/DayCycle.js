import * as THREE from 'three'

// ── Cycle constants ────────────────────────────────────────────────────────
const DAY_SECONDS     = 1200   // 20 real minutes = 1 game day
const DAWN_ELEVATION  = 4      // degrees — minimum sun height (dawn / dusk)
const NOON_ELEVATION  = 55     // degrees — peak sun height
const DAWN_AZIMUTH    = 80     // degrees — sun rises in the east
const DUSK_AZIMUTH    = 280    // degrees — sun sets in the west
// Start ~82% through the day → golden hour elevation ≈ 18°, azimuth ≈ 244° (SW)
const START_T         = 0.82

/**
 * DayCycle — advances game time and drives SkySystem.setSunAngle() every frame.
 *
 * A full day is a sine-wave from dawn elevation → noon → dusk, so the horizon
 * glow and sunset colours from the Preetham sky model look natural as the sun
 * sweeps east → west.
 *
 * Usage (in main.js after skySystem exists):
 *   const dayCycle = new DayCycle(engine.skySystem)
 *   gameLoop.register('dayCycle', delta => dayCycle.update(delta))
 *
 * Debug in console:
 *   _vp.dayCycle.speed = 10   // 10× real-time — watch the whole cycle in 2 min
 *   _vp.dayCycle.setTime(0.5) // jump to noon
 *   _vp.dayCycle.paused = true
 *
 * OWNED BY: engine-agent
 */
export class DayCycle {
  /** @param {import('./SkySystem.js').SkySystem} skySystem */
  constructor(skySystem) {
    this._sky    = skySystem
    this._t      = START_T     // 0 = dawn, 0.5 = noon, 1 = dusk (then wraps to dawn)
    this.speed   = 1           // real-time multiplier
    this.paused  = false
  }

  /** @param {number} delta — seconds since last frame */
  update(delta) {
    if (this.paused) return
    this._t = (this._t + (delta * this.speed) / DAY_SECONDS) % 1

    const elevation = this._calcElevation(this._t)
    const azimuth   = this._calcAzimuth(this._t)
    this._sky.setSunAngle(elevation, azimuth)
  }

  /**
   * Jump to a specific point in the day (0–1).
   * @param {number} t  0 = dawn, 0.5 = noon, 1 = dusk
   */
  setTime(t) {
    this._t = ((t % 1) + 1) % 1
    this._sky.setSunAngle(this._calcElevation(this._t), this._calcAzimuth(this._t))
  }

  /** Current sun elevation in degrees. */
  get elevation() { return this._calcElevation(this._t) }

  /** Current normalized time (0–1). */
  get t() { return this._t }

  /** Human-readable time of day. */
  get timeOfDay() {
    const t = this._t
    if (t < 0.12) return 'dawn'
    if (t < 0.35) return 'morning'
    if (t < 0.65) return 'noon'
    if (t < 0.80) return 'afternoon'
    if (t < 0.90) return 'golden hour'
    return 'sunset'
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Sine-wave elevation: 4° at dawn/dusk, 55° at noon.
   * Full sine cycle from -π/2 (min) through +π/2 (max) back to -π/2.
   */
  _calcElevation(t) {
    const factor = 0.5 + 0.5 * Math.sin(Math.PI * 2 * t - Math.PI / 2)
    return DAWN_ELEVATION + (NOON_ELEVATION - DAWN_ELEVATION) * factor
  }

  /** Linear azimuth sweep east → west across the day. */
  _calcAzimuth(t) {
    return DAWN_AZIMUTH + (DUSK_AZIMUTH - DAWN_AZIMUTH) * t
  }
}

/**
 * GameLoop — owns the requestAnimationFrame tick.
 * Systems register update functions here.
 * OWNED BY: engine-agent
 */
export class GameLoop {
  constructor() {
    /** @type {Array<{name: string, fn: (delta: number) => void}>} */
    this._systems = []
    this._lastTime = 0
    this._running = false
    this._rafId = null
    this._tick = this._tick.bind(this)
  }

  /**
   * Register a system update function.
   * @param {string} name — for debugging
   * @param {(delta: number) => void} fn — called each frame with delta in seconds
   */
  register(name, fn) {
    this._systems.push({ name, fn })
  }

  /** Remove a system by name. */
  unregister(name) {
    this._systems = this._systems.filter(s => s.name !== name)
  }

  start() {
    if (this._running) return
    this._running = true
    this._lastTime = performance.now()
    this._rafId = requestAnimationFrame(this._tick)
  }

  stop() {
    this._running = false
    if (this._rafId) cancelAnimationFrame(this._rafId)
  }

  _tick(now) {
    if (!this._running) return
    this._rafId = requestAnimationFrame(this._tick)

    const delta = Math.min((now - this._lastTime) / 1000, 0.1)  // cap at 100ms
    this._lastTime = now

    for (const sys of this._systems) {
      try {
        sys.fn(delta)
      } catch (err) {
        console.error(`[GameLoop] Error in system "${sys.name}":`, err)
      }
    }
  }
}

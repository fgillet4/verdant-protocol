/**
 * EventBus — synchronous pub/sub.
 * Cross-module communication ONLY goes through here.
 * See CLAUDE.md for canonical event list.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map()
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event).add(handler)
    return () => this.off(event, handler)
  }

  /** @param {string} event @param {Function} handler */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler)
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    this._listeners.get(event)?.forEach(h => h(data))
  }
}

export const bus = new EventBus()

/**
 * Modal Registry
 * Central map of modalId → modal instance.
 * Each modal must implement show() and hide().
 * Pattern mirrors Franks_Chemical_Simulator_Tauri/src/modals/modalRegistry.ts
 */

/** @type {Map<string, {show: Function, hide: Function}>} */
const MODAL_REGISTRY = new Map()

/**
 * Register a modal instance under a given id.
 * @param {string} id
 * @param {{show: Function, hide: Function}} modal
 */
export function registerModal(id, modal) {
  MODAL_REGISTRY.set(id, modal)
}

/**
 * @param {string} id
 * @returns {{show: Function, hide: Function} | undefined}
 */
export function getModal(id) {
  return MODAL_REGISTRY.get(id)
}

export function hasModal(id) {
  return MODAL_REGISTRY.has(id)
}

/**
 * LootTable — Walker's Alias Method for O(1) weighted loot draws.
 *
 * Why Alias Method here:
 *   Small tables (<20): linear scan is fine.
 *   Medium (20-200):    binary search on cumulative weights.
 *   Hot-path / large:   Alias Method — O(1) draw, O(n) build once at startup.
 *
 * Each table slot stores:
 *   prob[i]  — 0..1 probability this slot "wins" vs its alias
 *   alias[i] — fallback slot if slot i doesn't win
 */
import { createItem } from './ItemDefs.js'

const DRONE_LOOT_RAW = [
  ['droneScrap',        50],
  ['reclaimedCircuit',  18],
  ['wornCircuit',       10],
  ['rootHood',           8],
  ['barkVest',           7],
  ['barkBoots',          6],
  ['rootWraps',          6],
  ['droneCap',           5],
  ['mycelialBand',       5],
  ['quiver',             4],
  ['salvageBlade',       4],
  ['wovenLeggings',      3],
  ['droneGauntlets',     3],
  ['circuitRing',        3],
  ['barkShield',         3],
  ['solarCell',          3],
  ['droneTreads',        3],
  ['droneWing',          2],
  ['sporeOrb',           2],
  ['droneCore',          2],
  ['dronePlating',       1],
  ['rootFragment',       1],
  ['mycelialHelm',       1],
]

function buildAliasTable(entries) {
  const n     = entries.length
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const prob  = entries.map(([, w]) => (w / total) * n)
  const alias = new Array(n).fill(0)
  const ids   = entries.map(([id]) => id)

  const small = [], large = []
  prob.forEach((p, i) => (p < 1 ? small : large).push(i))

  while (small.length && large.length) {
    const s = small.pop(), l = large.pop()
    alias[s] = l
    prob[l]  = prob[l] + prob[s] - 1
    ;(prob[l] < 1 ? small : large).push(l)
  }

  return { ids, prob, alias, n }
}

const DRONE_ALIAS = buildAliasTable(DRONE_LOOT_RAW)

/** O(1) single draw from the drone loot table. */
function drawDroneLoot() {
  const { ids, prob, alias, n } = DRONE_ALIAS
  const i   = Math.floor(Math.random() * n)
  const defId = Math.random() < prob[i] ? ids[i] : ids[alias[i]]
  const qty = (defId === 'droneScrap' || defId === 'reclaimedCircuit')
    ? Math.floor(Math.random() * 3) + 1 : 1
  return createItem(defId, qty)
}

/**
 * Roll drops for a slain drone. Returns 1-2 items.
 * @returns {object[]}
 */
export function rollDroneLoot() {
  const drops = [drawDroneLoot()]
  if (Math.random() < 0.35) drops.push(drawDroneLoot())
  return drops
}

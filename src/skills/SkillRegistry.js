/**
 * All skill definitions and OSRS-style XP table.
 * OWNED BY: skills-agent
 */

export const SKILLS = {
  // ── Combat ──────────────────────────────────────────────────────────────
  biomech: {
    id: 'biomech', name: 'Biomech', color: '#ef5350', faction: null,
    description: 'Melee combat using reclaimed machine-muscle.',
    unlocks: { 5: 'Crushing Blow ability', 20: 'Biomech Tier 2 gear', 50: 'Exosuit Frame' },
  },
  mycelial: {
    id: 'mycelial', name: 'Mycelial', color: '#ab47bc', faction: null,
    description: 'Fungal network magic — spores, root-locks, and slow poison.',
    unlocks: { 5: 'Spore Burst ability', 30: 'Root Network passive' },
  },
  solarcasting: {
    id: 'solarcasting', name: 'Solarcasting', color: '#ffd54f', faction: null,
    description: 'Electromagnetic and geothermal energy magic.',
    unlocks: { 5: 'Solar Flare ability', 25: 'Gridlink passive' },
  },
  marksmanship: {
    id: 'marksmanship', name: 'Marksmanship', color: '#4db6ac', faction: null,
    description: 'Precise ranged attacks with bows and crossbows.',
    unlocks: { 5: 'Piercing Shot ability', 40: 'Longbow mastery' },
  },
  tenacity: {
    id: 'tenacity', name: 'Tenacity', color: '#78909c', faction: null,
    description: 'Resistance to damage. Increases defense.',
    unlocks: { 10: 'Iron Bark passive (+3 def)', 30: 'Thick Bark passive (+5 def)' },
  },
  vitality: {
    id: 'vitality', name: 'Vitality', color: '#66bb6a', faction: null,
    description: 'Life force. Each level adds 5 max HP.',
    unlocks: { 10: '+50 max HP', 50: '+250 max HP total' },
  },

  // ── Production ───────────────────────────────────────────────────────────
  technology: {
    id: 'technology', name: 'Technology', color: '#00bcd4', faction: null,
    description: 'Fabricate gadgets, devices, and systems from refined metals and circuits.',
    unlocks: { 10: 'Circuit Board', 30: 'Signal Jammer', 60: 'Sentry Turret', 70: 'Recoded Drone Core', 80: 'Gridweave Node' },
  },
  construction: {
    id: 'construction', name: 'Construction', color: '#90a4ae', faction: null,
    description: 'Build structures: campfires, shelters, towers, and sacred nexuses.',
    unlocks: { 10: 'Lean-to', 20: 'Barricade', 35: 'Watchtower', 50: 'Solar Relay', 70: 'Root Nexus' },
  },
  chemistry: {
    id: 'chemistry', name: 'Chemistry', color: '#00e676', faction: null,
    description: 'Brew consumables, compounds, and elixirs. Fermentation is a subdomain.',
    unlocks: { 5: 'Attunement Tincture', 25: 'Corrosive Paste', 60: 'Solarite Accelerant', 75: 'Heartstone Elixir' },
  },
  foundry: {
    id: 'foundry', name: 'Foundry', color: '#ff8a65', faction: null,
    description: 'Smelt ores into bars and ingots at a forge. Feeds into gear crafting.',
    unlocks: { 20: 'Iron Bar', 30: 'Steel Bar', 60: 'Solarite Ingot', 75: 'Heartstone Core' },
  },

  // ── Gathering ────────────────────────────────────────────────────────────
  mining: {
    id: 'mining', name: 'Mining', color: '#90a4ae', faction: null,
    description: 'Extract ore from veins. Higher level unlocks rarer deposits and speeds up each swing.',
    unlocks: { 15: 'Iron Seam', 30: 'Coal Deposit', 55: 'Solarite Vein', 70: 'Heartstone' },
  },
  woodcutting: {
    id: 'woodcutting', name: 'Woodcutting', color: '#a1887f', faction: null,
    description: 'Chop down trees for logs. Higher level = faster chops, better trees.',
    unlocks: { 10: 'Ancient Log access', 30: 'Hardwood', 60: 'Ancient Heartwood' },
  },
  canopyHarvest: {
    id: 'canopyHarvest', name: 'Canopy Harvest', color: '#8d6e63', faction: null,
    description: 'Selectively harvest deadwood and storm-fallen timber.',
    unlocks: { 10: 'Hardwood access', 30: 'Ancient Heartwood' },
  },
  foraging: {
    id: 'foraging', name: 'Foraging', color: '#81c784', faction: null,
    description: 'Find edible plants, herbs, and wild ingredients.',
    unlocks: { 5: 'Medicinal herbs', 20: 'Rare seed access' },
  },
  ecology: {
    id: 'ecology', name: 'Ecology', color: '#26a69a', faction: null,
    description: 'Understanding of living systems. Improves Attunement gain.',
    unlocks: { 15: 'Biome reading', 40: 'Ecosystem shaping' },
  },

  // ── Faction-locked (visible but locked until faction chosen) ─────────────
  bonding: {
    id: 'bonding', name: 'Bonding', color: '#8bc34a', faction: 'rootweaver',
    description: '[Rootweaver] Coax living materials into gear using fungal chemistry.',
    unlocks: { 10: 'Living armour', 30: 'Self-repairing equipment' },
  },
  recoding: {
    id: 'recoding', name: 'Recoding', color: '#42a5f5', faction: 'solar-compact',
    description: '[Solar Compact] Reprogram captured drones into companions or tools.',
    unlocks: { 5: 'Drone companion', 20: 'Combat drone conversion' },
  },
}

// ── XP Table (OSRS formula) ────────────────────────────────────────────────

/** XP needed to reach each level (index = level, value = total XP required). */
export const XP_TABLE = (() => {
  const table = [0, 0]  // table[1] = 0 (level 1 needs 0 XP)
  for (let lvl = 2; lvl <= 99; lvl++) {
    let total = 0
    for (let l = 1; l < lvl; l++) {
      total += Math.floor(l + 300 * Math.pow(2, l / 7))
    }
    table[lvl] = Math.floor(total / 4)
  }
  return table
})()

/**
 * Return the level corresponding to a total XP value.
 * @param {number} xp
 * @returns {number} 1–99
 */
export function levelForXP(xp) {
  for (let l = 98; l >= 1; l--) {
    if (xp >= XP_TABLE[l + 1] || l === 98) {
      // walk down until we find our level
    }
  }
  // Efficient binary-search version
  let lo = 1, hi = 99
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (XP_TABLE[mid] <= xp) lo = mid
    else hi = mid - 1
  }
  return lo
}

/**
 * Progress within the current level as a 0–1 fraction.
 * @param {number} xp
 * @returns {number}
 */
export function levelProgress(xp) {
  const level = levelForXP(xp)
  if (level >= 99) return 1
  const start = XP_TABLE[level]
  const end   = XP_TABLE[level + 1]
  return (xp - start) / (end - start)
}

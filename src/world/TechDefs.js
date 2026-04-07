/**
 * TechDefs — Technology bench recipes.
 * Fabricate gadgets and devices from bars, circuits, and salvage.
 * Subdomains: Components → Gadgets → Devices → Systems
 * OWNED BY: world-agent
 */

export const TECH_RECIPES = [
  // ── Tier 1: Components (level 1–15) ──────────────────────────────────────
  {
    id: 'fabricateWire', name: 'Copper Wire', tier: 'Components',
    outputId: 'copperWire', qty: 3, level: 1, xp: 18, fabricateMs: 2000,
    inputs: [{ itemId: 'copperBar', qty: 1 }],
    note: 'Basic conductor. Required by almost every tech recipe.',
  },
  {
    id: 'fabricateCircuitBoard', name: 'Circuit Board', tier: 'Components',
    outputId: 'circuitBoard', qty: 1, level: 10, xp: 35, fabricateMs: 3000,
    inputs: [{ itemId: 'copperWire', qty: 2 }, { itemId: 'reclaimedCircuit', qty: 1 }],
    note: 'Salvaged substrate re-etched with copper traces.',
  },
  {
    id: 'fabricateSteelCasing', name: 'Steel Casing', tier: 'Components',
    outputId: 'steelCasing', qty: 1, level: 15, xp: 45, fabricateMs: 3500,
    inputs: [{ itemId: 'steelBar', qty: 2 }],
    note: 'Pressed steel housing. Durable and weatherproof.',
  },

  // ── Tier 2: Gadgets (level 20–40) ────────────────────────────────────────
  {
    id: 'fabricateScanner', name: 'Ore Scanner', tier: 'Gadgets',
    outputId: 'oreScanner', qty: 1, level: 20, xp: 60, fabricateMs: 5000,
    inputs: [{ itemId: 'circuitBoard', qty: 1 }, { itemId: 'copperWire', qty: 2 }, { itemId: 'steelCasing', qty: 1 }],
    note: 'Pings nearby ore nodes on the minimap for 60 seconds.',
  },
  {
    id: 'fabricateJammer', name: 'Signal Jammer', tier: 'Gadgets',
    outputId: 'signalJammer', qty: 1, level: 30, xp: 80, fabricateMs: 6000,
    inputs: [{ itemId: 'circuitBoard', qty: 2 }, { itemId: 'solariteIngot', qty: 1 }],
    note: 'Disables drone aggro in a 12-unit radius for 30 seconds.',
  },
  {
    id: 'fabricateProxMine', name: 'Proximity Mine', tier: 'Gadgets',
    outputId: 'proxMine', qty: 2, level: 40, xp: 90, fabricateMs: 7000,
    inputs: [{ itemId: 'steelCasing', qty: 1 }, { itemId: 'circuitBoard', qty: 1 }, { itemId: 'coal', qty: 2 }],
    note: 'Detonate on enemy approach. 45 damage, 4-unit blast radius.',
  },

  // ── Tier 3: Devices (level 50–65) ────────────────────────────────────────
  {
    id: 'fabricateSolarCell', name: 'Solar Capacitor', tier: 'Devices',
    outputId: 'solarCapacitor', qty: 1, level: 50, xp: 110, fabricateMs: 9000,
    inputs: [{ itemId: 'solariteIngot', qty: 2 }, { itemId: 'circuitBoard', qty: 2 }, { itemId: 'copperWire', qty: 3 }],
    note: 'Stores 50 attunement points. Deploy to release as a burst.',
  },
  {
    id: 'fabricateTurret', name: 'Sentry Turret', tier: 'Devices',
    outputId: 'sentryTurret', qty: 1, level: 60, xp: 140, fabricateMs: 12000,
    inputs: [{ itemId: 'steelCasing', qty: 3 }, { itemId: 'circuitBoard', qty: 3 }, { itemId: 'solariteIngot', qty: 2 }],
    note: 'Deploy in the world. Auto-attacks enemies in 10-unit range. 20 shots.',
  },

  // ── Tier 4: Systems (level 70–80) ────────────────────────────────────────
  {
    id: 'fabricateDroneCore', name: 'Recoded Drone Core', tier: 'Systems',
    outputId: 'recodedDroneCore', qty: 1, level: 70, xp: 180, fabricateMs: 15000,
    inputs: [{ itemId: 'droneScrap', qty: 4 }, { itemId: 'circuitBoard', qty: 4 }, { itemId: 'heartstoneCore', qty: 1 }],
    note: 'A captured drone CPU reprogrammed with mycelial ethics protocols.',
  },
  {
    id: 'fabricateGridweave', name: 'Gridweave Node', tier: 'Systems',
    outputId: 'gridweaveNode', qty: 1, level: 80, xp: 220, fabricateMs: 18000,
    inputs: [{ itemId: 'solariteIngot', qty: 4 }, { itemId: 'heartstoneCore', qty: 2 }, { itemId: 'circuitBoard', qty: 5 }],
    note: 'Links into the solar grid. Permanently boosts zone attunement recharge by 10%.',
  },
]

/** @type {Map<string, object>} */
export const TECH_RECIPE_MAP = new Map(TECH_RECIPES.map(r => [r.id, r]))

/** Tier display order */
export const TECH_TIERS = ['Components', 'Gadgets', 'Devices', 'Systems']

export const TECH_INGREDIENT_NAMES = {
  copperBar:       'Copper Bar',
  steelBar:        'Steel Bar',
  copperWire:      'Copper Wire',
  reclaimedCircuit:'Reclaimed Circuit',
  circuitBoard:    'Circuit Board',
  steelCasing:     'Steel Casing',
  solariteIngot:   'Solarite Ingot',
  heartstoneCore:  'Heartstone Core',
  droneScrap:      'Drone Scrap',
  coal:            'Coal',
}

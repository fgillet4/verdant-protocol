/**
 * ChemistryDefs — all Chemistry bench recipes.
 * Fermentation, compounds, extracts, and elixirs are all subdomains here.
 * OWNED BY: world-agent
 */

export const CHEM_RECIPES = [
  // ── Tier 1: Fermentation (level 1–15) ────────────────────────────────────
  {
    id: 'brewHealthSalve', name: 'Health Salve', tier: 'Fermentation',
    outputId: 'healthSalve', level: 1,  xp: 22, brewMs: 3000,
    inputs: [{ itemId: 'wildHerbs', qty: 2 }],
    note: 'Crushed herbs in a sealed vial. Staple of any traveller.',
  },
  {
    id: 'brewAttunementTincture', name: 'Attunement Tincture', tier: 'Fermentation',
    outputId: 'attunementTincture', level: 5, xp: 28, brewMs: 3500,
    inputs: [{ itemId: 'fungalMass', qty: 2 }],
    note: 'Fermented mycelial paste. Sharpens attunement resonance.',
  },
  {
    id: 'brewFermentedBrew', name: 'Fermented Brew', tier: 'Fermentation',
    outputId: 'fermentedBrew', level: 12, xp: 40, brewMs: 5000,
    inputs: [{ itemId: 'wildHerbs', qty: 1 }, { itemId: 'fungalMass', qty: 1 }],
    note: '+15% XP gain for 5 minutes. Tastes earthy.',
  },

  // ── Tier 2: Compounds (level 25–45) ──────────────────────────────────────
  {
    id: 'brewCorrosivePaste', name: 'Corrosive Paste', tier: 'Compounds',
    outputId: 'corrosivePaste', level: 25, xp: 60, brewMs: 6000,
    inputs: [{ itemId: 'coal', qty: 1 }, { itemId: 'wildHerbs', qty: 2 }],
    note: 'Coat your weapon. +15 damage, 8 hits.',
  },
  {
    id: 'brewSporeGrenade', name: 'Spore Grenade', tier: 'Compounds',
    outputId: 'sporeGrenade', level: 35, xp: 75, brewMs: 7000,
    inputs: [{ itemId: 'fungalMass', qty: 3 }, { itemId: 'ancientResin', qty: 1 }],
    note: 'Pressurised spore burst. Slows enemies in range for 5s.',
  },

  // ── Tier 3: Extracts (level 50–65) ───────────────────────────────────────
  {
    id: 'brewDroneAcid', name: 'Drone Acid', tier: 'Extracts',
    outputId: 'droneAcid', level: 50, xp: 90, brewMs: 8000,
    inputs: [{ itemId: 'droneScrap', qty: 2 }, { itemId: 'coal', qty: 1 }],
    note: 'Repurposed drone coolant. +25 damage vs drones, 10 hits.',
  },
  {
    id: 'brewSolariteAccelerant', name: 'Solarite Accelerant', tier: 'Extracts',
    outputId: 'solariteAccelerant', level: 60, xp: 100, brewMs: 10000,
    inputs: [{ itemId: 'solariteOre', qty: 1 }, { itemId: 'wildHerbs', qty: 2 }],
    note: '+50% XP gain for 10 minutes. Warm to the touch.',
  },

  // ── Tier 4: Elixirs (level 75) ────────────────────────────────────────────
  {
    id: 'brewHeartstoneElixir', name: 'Heartstone Elixir', tier: 'Elixirs',
    outputId: 'heartstoneElixir', level: 75, xp: 140, brewMs: 12000,
    inputs: [{ itemId: 'heartstoneOre', qty: 1 }, { itemId: 'fungalMass', qty: 3 }],
    note: 'Heals 80 HP and restores 60 attunement. Tastes of deep roots.',
  },
]

/** @type {Map<string, object>} */
export const CHEM_RECIPE_MAP = new Map(CHEM_RECIPES.map(r => [r.id, r]))

/** Tier display order */
export const CHEM_TIERS = ['Fermentation', 'Compounds', 'Extracts', 'Elixirs']

/** Human-readable names for ingredient defIds */
export const CHEM_INGREDIENT_NAMES = {
  wildHerbs:    'Wild Herbs',
  fungalMass:   'Fungal Mass',
  coal:         'Coal',
  ancientResin: 'Ancient Resin',
  droneScrap:   'Drone Scrap',
  solariteOre:  'Solarite Ore',
  heartstoneOre:'Heartstone Ore',
}

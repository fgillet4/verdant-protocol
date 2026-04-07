/**
 * FoundryDefs — smelting recipes.
 * inputs: array of { itemId, qty } consumed per smelt.
 * OWNED BY: world-agent
 */

export const SMELT_RECIPES = [
  {
    id:       'smeltCopper',
    name:     'Copper Bar',
    outputId: 'copperBar',
    inputs:   [{ itemId: 'copperOre', qty: 2 }],
    level:    1,
    xp:       25,
    smeltMs:  2400,
  },
  {
    id:       'smeltIron',
    name:     'Iron Bar',
    outputId: 'ironBar',
    inputs:   [{ itemId: 'ironOre', qty: 2 }, { itemId: 'coal', qty: 1 }],
    level:    20,
    xp:       50,
    smeltMs:  3000,
  },
  {
    id:       'smeltSteel',
    name:     'Steel Bar',
    outputId: 'steelBar',
    inputs:   [{ itemId: 'ironBar', qty: 1 }, { itemId: 'coal', qty: 2 }],
    level:    30,
    xp:       75,
    smeltMs:  3600,
    note:     'Iron + coal, alloyed at high heat.',
  },
  {
    id:       'smeltSolarite',
    name:     'Solarite Ingot',
    outputId: 'solariteIngot',
    inputs:   [{ itemId: 'solariteOre', qty: 2 }],
    level:    60,
    xp:       90,
    smeltMs:  4200,
    note:     'Focused solar array — no coal required.',
  },
  {
    id:       'smeltHeartstone',
    name:     'Heartstone Core',
    outputId: 'heartstoneCore',
    inputs:   [{ itemId: 'heartstoneOre', qty: 3 }],
    level:    75,
    xp:       120,
    smeltMs:  5000,
    note:     'Resonates with mycelial frequencies during smelting.',
  },
]

/** @type {Map<string, object>} */
export const SMELT_RECIPE_MAP = new Map(SMELT_RECIPES.map(r => [r.id, r]))

/** Display name for each ingredient defId */
export const INGREDIENT_NAMES = {
  copperOre:    'Copper Ore',
  ironOre:      'Iron Ore',
  coal:         'Coal',
  ironBar:      'Iron Bar',
  solariteOre:  'Solarite Ore',
  heartstoneOre:'Heartstone Ore',
}

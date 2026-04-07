/**
 * OreNodeDefs — static data for each ore vein tier.
 * Higher tiers require more Mining level, yield rarer ores, more XP, slower respawn.
 */

export const ORE_TIERS = [
  {
    id:          'copper',
    name:        'Copper Vein',
    minLevel:    1,
    xp:          17.5,
    oreId:       'copperOre',
    rockColor:   0x7a6952,
    veinColor:   0xb87333,
    minesMin:    2,
    minesMax:    5,
    respawnMs:   30_000,
    examineText: 'A copper vein. The Compact use this for basic circuitry.',
  },
  {
    id:          'iron',
    name:        'Iron Seam',
    minLevel:    15,
    xp:          35,
    oreId:       'ironOre',
    rockColor:   0x5a5a5a,
    veinColor:   0x78909c,
    minesMin:    2,
    minesMax:    5,
    respawnMs:   45_000,
    examineText: 'An iron seam running through the rock face. Requires level 15 Mining.',
  },
  {
    id:          'coal',
    name:        'Coal Deposit',
    minLevel:    30,
    xp:          50,
    oreId:       'coal',
    rockColor:   0x3a3a3a,
    veinColor:   0x212121,
    minesMin:    3,
    minesMax:    6,
    respawnMs:   60_000,
    examineText: 'Dense coal. Controversial resource — Foundry fuel, but the Rootweavers disapprove. Requires level 30 Mining.',
  },
  {
    id:          'solarite',
    name:        'Solarite Vein',
    minLevel:    55,
    xp:          80,
    oreId:       'solariteOre',
    rockColor:   0x4a3f10,
    veinColor:   0xffd740,
    minesMin:    2,
    minesMax:    4,
    respawnMs:   90_000,
    examineText: 'Solarite — crystallised solar energy locked in stone. Extremely rare. Requires level 55 Mining.',
  },
  {
    id:          'heartstone',
    name:        'Heartstone',
    minLevel:    70,
    xp:          95,
    oreId:       'heartstoneOre',
    rockColor:   0x2a1a2a,
    veinColor:   0xce93d8,
    minesMin:    1,
    minesMax:    3,
    respawnMs:   120_000,
    examineText: 'Heartstone — mycelial mineral formed at root nexus points. Sacred to Rootweavers. Requires level 70 Mining.',
  },
]

/** @type {Map<string, object>} */
export const ORE_TIER_MAP = new Map(ORE_TIERS.map(t => [t.id, t]))

/** Weighted spawn distribution */
export const ORE_SPAWN_WEIGHTS = [
  ['copper',     0.40],
  ['iron',       0.30],
  ['coal',       0.20],
  ['solarite',   0.08],
  ['heartstone', 0.02],
]

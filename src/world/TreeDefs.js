/**
 * TreeDefs — static data for each tree tier.
 * Higher tiers require more Woodcutting level, yield rarer logs and more XP.
 */

export const TREE_TIERS = [
  {
    id:           'normal',
    name:         'Tree',
    minLevel:     1,
    xp:           25,
    logId:        'normalLog',
    canopyColor:  0x1b4d1b,
    trunkColor:   0x5c3d2e,
    chopsMin:     3,
    chopsMax:     7,
    scaleBonus:   0,
    examineText:  'A sturdy tree. Good for basic construction logs.',
  },
  {
    id:           'mossOak',
    name:         'Moss Oak',
    minLevel:     15,
    xp:           37,
    logId:        'mossLog',
    canopyColor:  0x0d4a1e,
    trunkColor:   0x3d2b1f,
    chopsMin:     4,
    chopsMax:     8,
    scaleBonus:   0.25,
    examineText:  'A moss-draped oak. Thick bark, dense grain. Requires level 15 Woodcutting.',
  },
  {
    id:           'ironwood',
    name:         'Ironwood',
    minLevel:     30,
    xp:           50,
    logId:        'ironLog',
    canopyColor:  0x1a3010,
    trunkColor:   0x2a1f15,
    chopsMin:     5,
    chopsMax:     10,
    scaleBonus:   0.5,
    examineText:  'Dense ironwood. Each grain stores centuries of growth. Requires level 30 Woodcutting.',
  },
  {
    id:           'ancient',
    name:         'Ancient Canopy',
    minLevel:     60,
    xp:           80,
    logId:        'ancientLog',
    canopyColor:  0x2d1b45,
    trunkColor:   0x1e1208,
    chopsMin:     7,
    chopsMax:     14,
    scaleBonus:   0.9,
    examineText:  'An ancient canopy tree. Its root network spans the whole grove. Requires level 60 Woodcutting.',
  },
]

/** @type {Map<string, object>} id → tier def */
export const TREE_TIER_MAP = new Map(TREE_TIERS.map(t => [t.id, t]))

/** Weighted spawn distribution: [tierId, weight] — must sum to 1 */
export const TREE_SPAWN_WEIGHTS = [
  ['normal',   0.50],
  ['mossOak',  0.28],
  ['ironwood', 0.15],
  ['ancient',  0.07],
]

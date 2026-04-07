/**
 * BlueprintDefs — all buildable structures, their costs, and effects.
 * OWNED BY: world-agent
 */

export const BLUEPRINTS = [
  {
    id: 'campfire', name: 'Campfire',
    description: 'Restores 2 HP per combat tick to nearby players.',
    level: 1,  xp: 30,  effectRadius: 5,  effectType: 'hp-regen',        effectValue: 2,
    cost: [{ itemId: 'normalLog', qty: 5 }],
    examineText: 'A careful stack of logs. Warm, alive, and welcoming.',
  },
  {
    id: 'leanTo', name: 'Lean-to',
    description: 'A simple shelter. +10% movement speed while nearby.',
    level: 10, xp: 55,  effectRadius: 4,  effectType: 'speed-boost',      effectValue: 0.1,
    cost: [{ itemId: 'normalLog', qty: 6 }, { itemId: 'mossLog', qty: 2 }],
    examineText: 'Quick woodland shelter. Bark and woven moss.',
  },
  {
    id: 'barricade', name: 'Barricade',
    description: 'Dense log wall. Slows enemies that approach.',
    level: 20, xp: 80,  effectRadius: 3,  effectType: 'slow-aura',        effectValue: 0.5,
    cost: [{ itemId: 'ironLog', qty: 4 }, { itemId: 'ironBar', qty: 2 }],
    examineText: 'Dense ironwood posts hammered into the earth.',
  },
  {
    id: 'watchtower', name: 'Watchtower',
    description: 'Extends enemy detection range by 20 units when nearby.',
    level: 35, xp: 110, effectRadius: 6,  effectType: 'detection',        effectValue: 20,
    cost: [{ itemId: 'ironLog', qty: 8 }, { itemId: 'steelBar', qty: 4 }],
    examineText: 'A tall observation platform. The Solar Compact builds these along trade routes.',
  },
  {
    id: 'solarRelay', name: 'Solar Relay',
    description: 'Boosts attunement recharge rate by 30% in a large area.',
    level: 50, xp: 150, effectRadius: 8,  effectType: 'attunement-boost', effectValue: 0.3,
    cost: [{ itemId: 'solariteIngot', qty: 4 }, { itemId: 'steelBar', qty: 6 }],
    examineText: 'A solar relay tower. The air around it hums with stored light.',
  },
  {
    id: 'rootNexus', name: 'Root Nexus',
    description: 'Sacred mycelial site. HP regen and attunement boost combined.',
    level: 70, xp: 220, effectRadius: 10, effectType: 'nexus',            effectValue: 5,
    cost: [{ itemId: 'heartstoneCore', qty: 4 }, { itemId: 'ancientLog', qty: 8 }],
    examineText: 'A living nexus of root and crystal. The oldest Rootweavers refuse to build near one — they say it already exists.',
  },
]

/** @type {Map<string, object>} */
export const BLUEPRINT_MAP = new Map(BLUEPRINTS.map(b => [b.id, b]))

/** Display names for cost items */
export const BLUEPRINT_ITEM_NAMES = {
  normalLog: 'Normal Log', mossLog: 'Moss Log', ironLog: 'Iron Log',
  ancientLog: 'Ancient Log', ironBar: 'Iron Bar', steelBar: 'Steel Bar',
  solariteIngot: 'Solarite Ingot', heartstoneCore: 'Heartstone Core',
}

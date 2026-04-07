/**
 * Attunement definitions — solarpunk prayer equivalent.
 * Each attunement drains points/sec while active.
 * Max 3 active at once. Points recharge in healthy biomes.
 *
 * Fields:
 *   id          — matches key
 *   name        — display name
 *   description — tooltip text
 *   color       — UI accent color
 *   drainRate   — points/sec while active
 *   faction     — 'rootweaver' | 'solar' | 'mycelial' | 'biomech' | null
 *   unlock      — { type: 'item', itemId } | { type: 'level', skill, level }
 *
 * Effect fields (read by AttunementSystem getters):
 *   defenseBonus      — flat defense bonus
 *   damageMultiplier  — multiplier on all outgoing damage
 *   onHitDoT          — { damage, ticks } applied to target each hit
 *   hpRegenPerTick    — HP restored each 600ms combat tick
 *   echoChance        — 0-1, chance to deal the hit twice
 *   tickReduction     — ms to subtract from combat tick (600 → 600-n)
 *   revealHp          — boolean, show enemy HP bar always
 */
export const ATTUNEMENTS = {
  barkSkin: {
    id: 'barkSkin',
    name: 'Bark Skin',
    description: 'Hardened bark armour. +15% defense.',
    color: '#8d6e63',
    drainRate: 1.0,
    faction: null,
    defenseBonus: 0.15,         // 15% of base defense added
  },

  sporeCloud: {
    id: 'sporeCloud',
    name: 'Spore Cloud',
    description: 'Infect each hit with mycelial spores. Target takes DoT.',
    color: '#69f0ae',
    drainRate: 1.5,
    faction: 'mycelial',
    onHitDoT: { damage: 3, ticks: 3 },
  },

  solarBurst: {
    id: 'solarBurst',
    name: 'Solar Burst',
    description: 'Channel radiant energy. +20% outgoing damage.',
    color: '#ffd740',
    drainRate: 2.0,
    faction: 'solar',
    damageMultiplier: 1.20,
  },

  rootAnchor: {
    id: 'rootAnchor',
    name: 'Root Anchor',
    description: 'Roots hold you firm. Immune to knockback effects.',
    color: '#a5d6a7',
    drainRate: 0.8,
    faction: 'rootweaver',
    knockbackImmune: true,
  },

  mycelialSight: {
    id: 'mycelialSight',
    name: 'Mycelial Sight',
    description: 'The network shares its knowledge. Enemy HP always visible.',
    color: '#80cbc4',
    drainRate: 0.4,
    faction: 'mycelial',
    revealHp: true,
  },

  overclock: {
    id: 'overclock',
    name: 'Overclock',
    description: 'Hyperfocus state. Combat tick 600ms → 400ms.',
    color: '#ffd740',
    drainRate: 3.5,
    faction: 'solar',
    tickReduction: 200,
  },

  rewildPulse: {
    id: 'rewildPulse',
    name: 'Rewild Pulse',
    description: 'Living root network mends your wounds each tick.',
    color: '#a5d6a7',
    drainRate: 2.5,
    faction: 'rootweaver',
    hpRegenPerTick: 3,
  },

  echoStrike: {
    id: 'echoStrike',
    name: 'Echo Strike',
    description: '25% chance each hit resonates — dealing damage twice.',
    color: '#ef9a9a',
    drainRate: 2.5,
    faction: 'biomech',
    echoChance: 0.25,
  },
}

/** Ordered list for UI rendering */
export const ATTUNEMENT_LIST = Object.values(ATTUNEMENTS)

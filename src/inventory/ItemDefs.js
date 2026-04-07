/**
 * ItemDefs — static item data: rarity colours, all item definitions, instance factory.
 * No loot-table logic here — see LootTable.js.
 */

let _uid = 1

export const RARITY_COLOR = {
  common:    'rgba(200,200,200,0.18)',
  uncommon:  '#388e3c',
  rare:      '#1565c0',
  epic:      '#6a1b9a',
  legendary: '#e65100',
  artifact:  '#b71c1c',
}

export const ITEM_DEFS = {

  // ── Tech Components ───────────────────────────────────────────────────────
  copperWire: {
    defId: 'copperWire', name: 'Copper Wire', slot: null,
    color: '#f9a825', abbr: 'CuW', rarity: 'common', stackable: true,
    description: 'Drawn copper conductor. Required by almost every tech recipe.',
    bonuses: {},
  },
  circuitBoard: {
    defId: 'circuitBoard', name: 'Circuit Board', slot: null,
    color: '#42a5f5', abbr: 'CB', rarity: 'uncommon', stackable: false,
    description: 'Salvaged substrate re-etched with copper traces.',
    bonuses: {},
  },
  steelCasing: {
    defId: 'steelCasing', name: 'Steel Casing', slot: null,
    color: '#90a4ae', abbr: 'SC', rarity: 'common', stackable: false,
    description: 'Pressed steel housing. Durable and weatherproof.',
    bonuses: {},
  },

  // ── Tech Devices ───────────────────────────────────────────────────────────
  oreScanner: {
    defId: 'oreScanner', name: 'Ore Scanner', slot: null, useEffect: true,
    color: '#80cbc4', abbr: 'OSc', rarity: 'uncommon', stackable: false,
    description: 'Activates to reveal nearby ore nodes for 60 seconds.',
    bonuses: {},
  },
  signalJammer: {
    defId: 'signalJammer', name: 'Signal Jammer', slot: null, useEffect: true,
    color: '#ce93d8', abbr: 'SJm', rarity: 'rare', stackable: false,
    description: 'Disables drone aggro in a 12-unit radius for 30 seconds.',
    bonuses: {},
  },
  proxMine: {
    defId: 'proxMine', name: 'Proximity Mine', slot: null, useEffect: true,
    color: '#ef9a9a', abbr: 'PrM', rarity: 'uncommon', stackable: false,
    description: '45 damage in a 4-unit blast. Triggered by enemy proximity.',
    bonuses: {},
  },
  solarCapacitor: {
    defId: 'solarCapacitor', name: 'Solar Capacitor', slot: null, useEffect: true,
    color: '#ffd54f', abbr: 'SoC', rarity: 'rare', stackable: false,
    description: 'Stored solar energy. Use to discharge 50 attunement points instantly.',
    bonuses: {},
  },
  sentryTurret: {
    defId: 'sentryTurret', name: 'Sentry Turret', slot: null, useEffect: true,
    color: '#ff8a65', abbr: 'SeT', rarity: 'rare', stackable: false,
    description: 'Deploy in the world. Auto-attacks enemies within 10 units. 20 shots.',
    bonuses: {},
  },
  recodedDroneCore: {
    defId: 'recodedDroneCore', name: 'Recoded Drone Core', slot: null, useEffect: true,
    color: '#a5d6a7', abbr: 'RDC', rarity: 'epic', stackable: false,
    description: 'A drone CPU reprogrammed with mycelial ethics. Activates a drone companion.',
    bonuses: {},
  },
  gridweaveNode: {
    defId: 'gridweaveNode', name: 'Gridweave Node', slot: null, useEffect: true,
    color: '#00e5ff', abbr: 'GWN', rarity: 'epic', stackable: false,
    description: 'Links into the solar grid. Permanently boosts zone attunement recharge by 10%.',
    bonuses: {},
  },

  // ── Chemistry Ingredients ──────────────────────────────────────────────────
  wildHerbs: {
    defId: 'wildHerbs', name: 'Wild Herbs', slot: null,
    color: '#7cb342', abbr: 'WH', rarity: 'common', stackable: true,
    description: 'A bundle of foraged herbs. Used in brews and compounds.',
    bonuses: {},
  },
  fungalMass: {
    defId: 'fungalMass', name: 'Fungal Mass', slot: null,
    color: '#00e5cc', abbr: 'FM', rarity: 'common', stackable: true,
    description: 'Gathered mycelial material. Key ingredient in attunement chemistry.',
    bonuses: {},
  },

  // ── Chemistry Consumables ──────────────────────────────────────────────────
  healthSalve: {
    defId: 'healthSalve', name: 'Health Salve', slot: null, useEffect: true,
    color: '#ef9a9a', abbr: 'HS', rarity: 'common', stackable: false,
    description: 'Restores 30 HP. Smells of crushed leaves.',
    bonuses: {},
  },
  attunementTincture: {
    defId: 'attunementTincture', name: 'Attunement Tincture', slot: null, useEffect: true,
    color: '#ce93d8', abbr: 'AT', rarity: 'uncommon', stackable: false,
    description: 'Restores 30 attunement. Fermented mycelium, oddly smooth.',
    bonuses: {},
  },
  fermentedBrew: {
    defId: 'fermentedBrew', name: 'Fermented Brew', slot: null, useEffect: true,
    color: '#a5d6a7', abbr: 'FB', rarity: 'uncommon', stackable: false,
    description: '+15% XP gain for 5 minutes. Earthy and slightly fizzy.',
    bonuses: {},
  },
  corrosivePaste: {
    defId: 'corrosivePaste', name: 'Corrosive Paste', slot: null, useEffect: true,
    color: '#80deea', abbr: 'CP', rarity: 'uncommon', stackable: false,
    description: 'Weapon coating. +15 damage for 8 hits.',
    bonuses: {},
  },
  sporeGrenade: {
    defId: 'sporeGrenade', name: 'Spore Grenade', slot: null, useEffect: true,
    color: '#c5e1a5', abbr: 'SG', rarity: 'rare', stackable: false,
    description: 'Pressurised spore cluster. AoE slow for 5 seconds.',
    bonuses: {},
  },
  droneAcid: {
    defId: 'droneAcid', name: 'Drone Acid', slot: null, useEffect: true,
    color: '#90caf9', abbr: 'DA', rarity: 'rare', stackable: false,
    description: 'Weapon coating. +25 damage vs drones for 10 hits.',
    bonuses: {},
  },
  solariteAccelerant: {
    defId: 'solariteAccelerant', name: 'Solarite Accelerant', slot: null, useEffect: true,
    color: '#ffd54f', abbr: 'SA', rarity: 'rare', stackable: false,
    description: '+50% XP gain for 10 minutes. Warm to the touch.',
    bonuses: {},
  },
  heartstoneElixir: {
    defId: 'heartstoneElixir', name: 'Heartstone Elixir', slot: null, useEffect: true,
    color: '#ba68c8', abbr: 'HE', rarity: 'epic', stackable: false,
    description: 'Restores 80 HP and 60 attunement. Tastes of deep roots and time.',
    bonuses: {},
  },

  // ── Ores ───────────────────────────────────────────────────────────────────
  copperOre: {
    defId: 'copperOre', name: 'Copper Ore', slot: null,
    color: '#b87333', abbr: 'CuO', rarity: 'common', stackable: false,
    description: 'Raw copper ore. Smelt it in a Foundry.',
    bonuses: {},
  },
  ironOre: {
    defId: 'ironOre', name: 'Iron Ore', slot: null,
    color: '#78909c', abbr: 'FeO', rarity: 'common', stackable: false,
    description: 'Raw iron ore. Smelt with coal for steel.',
    bonuses: {},
  },
  coal: {
    defId: 'coal', name: 'Coal', slot: null,
    color: '#424242', abbr: 'Coa', rarity: 'common', stackable: false,
    description: 'Fuel for the Foundry. The Rootweavers use it sparingly.',
    bonuses: {},
  },
  solariteOre: {
    defId: 'solariteOre', name: 'Solarite Ore', slot: null,
    color: '#ffd740', abbr: 'SoO', rarity: 'rare', stackable: false,
    description: 'Crystallised solar energy. Key ingredient in Solar Compact tech.',
    bonuses: {},
  },
  heartstoneOre: {
    defId: 'heartstoneOre', name: 'Heartstone Ore', slot: null,
    color: '#ce93d8', abbr: 'HsO', rarity: 'epic', stackable: false,
    description: 'A mycelial mineral formed at root nexus points. Sacred to Rootweavers.',
    bonuses: {},
  },

  // ── Bars & Ingots ──────────────────────────────────────────────────────────
  copperBar: {
    defId: 'copperBar', name: 'Copper Bar', slot: null,
    color: '#c47a1e', abbr: 'CuB', rarity: 'common', stackable: false,
    description: 'Smelted copper. Used in Foundry crafting and basic circuitry.',
    bonuses: {},
  },
  ironBar: {
    defId: 'ironBar', name: 'Iron Bar', slot: null,
    color: '#607d8b', abbr: 'FeB', rarity: 'common', stackable: false,
    description: 'Refined iron. Core material for tools and structural components.',
    bonuses: {},
  },
  steelBar: {
    defId: 'steelBar', name: 'Steel Bar', slot: null,
    color: '#90a4ae', abbr: 'StB', rarity: 'uncommon', stackable: false,
    description: 'Iron alloyed with coal under heat. Backbone of Solar Compact engineering.',
    bonuses: {},
  },
  solariteIngot: {
    defId: 'solariteIngot', name: 'Solarite Ingot', slot: null,
    color: '#ffc400', abbr: 'SoI', rarity: 'rare', stackable: false,
    description: 'Purified solarite — crystallised photons locked in metal form.',
    bonuses: {},
  },
  heartstoneCore: {
    defId: 'heartstoneCore', name: 'Heartstone Core', slot: null,
    color: '#ba68c8', abbr: 'HsC', rarity: 'epic', stackable: false,
    description: 'Refined heartstone. Hums with a resonance the Rootweavers call "memory".',
    bonuses: {},
  },

  // ── Materials ──────────────────────────────────────────────────────────────
  droneScrap: {
    defId: 'droneScrap', name: 'Drone Scrap', slot: null,
    color: '#546e7a', abbr: 'DS', rarity: 'common', stackable: true,
    description: 'Twisted salvage from a destroyed drone. Used in Foundry.',
    bonuses: {},
  },
  reclaimedCircuit: {
    defId: 'reclaimedCircuit', name: 'Reclaimed Circuit', slot: null,
    color: '#1565c0', abbr: 'RC', rarity: 'uncommon', stackable: true,
    description: 'A salvageable circuit board. Used in Recoding and Circuit Weaving.',
    bonuses: {},
  },
  ancientResin: {
    defId: 'ancientResin', name: 'Ancient Resin', slot: null,
    color: '#f9a825', abbr: 'AR', rarity: 'rare', stackable: true,
    description: 'Fossilised sap from a thousand-year tree. Rare crafting reagent.',
    bonuses: {},
  },
  normalLog: {
    defId: 'normalLog', name: 'Normal Log', slot: null,
    color: '#8d6e63', abbr: 'NL', rarity: 'common', stackable: false,
    description: 'A freshly chopped log. Used in Construction and Fermentation.',
    bonuses: {},
  },
  mossLog: {
    defId: 'mossLog', name: 'Moss Log', slot: null,
    color: '#388e3c', abbr: 'ML', rarity: 'uncommon', stackable: false,
    description: 'A moss-oak log. Dense and slightly damp. Good for Bonding crafts.',
    bonuses: {},
  },
  ironLog: {
    defId: 'ironLog', name: 'Iron Log', slot: null,
    color: '#546e7a', abbr: 'IL', rarity: 'rare', stackable: false,
    description: 'Ironwood log — nearly petrified. Foundry and high-tier Construction.',
    bonuses: {},
  },
  ancientLog: {
    defId: 'ancientLog', name: 'Ancient Log', slot: null,
    color: '#9c27b0', abbr: 'AL', rarity: 'epic', stackable: false,
    description: 'Dense heartwood from an ancient tree. Prized in Bonding and Foundry.',
    bonuses: {},
  },

  // ── Weapons ────────────────────────────────────────────────────────────────
  salvageBlade: {
    defId: 'salvageBlade', name: 'Salvage Blade', slot: 'weapon',
    style: 'biomech', color: '#c62828', abbr: 'SBl', rarity: 'uncommon', stackable: false,
    description: 'A blade cut from drone chassis. Brutal and effective.',
    bonuses: { attackBonus: 12, strengthBonus: 10 },
  },
  rootStaff: {
    defId: 'rootStaff', name: 'Root Staff', slot: 'weapon',
    style: 'mycelial', color: '#7b1fa2', abbr: 'RSt', rarity: 'uncommon', stackable: false,
    description: 'A gnarled staff threaded with mycelial filaments.',
    bonuses: { attackBonus: 15, strengthBonus: 6 },
  },
  compositeBow: {
    defId: 'compositeBow', name: 'Composite Bow', slot: 'weapon',
    style: 'marksmanship', color: '#00695c', abbr: 'CBw', rarity: 'rare', stackable: false,
    description: 'Yew and drone-cable composite. Excellent range.',
    bonuses: { attackBonus: 18, strengthBonus: 8 },
  },
  verdantEdge: {
    defId: 'verdantEdge', name: 'Verdant Edge', slot: 'weapon',
    style: 'biomech', color: '#e65100', abbr: 'VdE', rarity: 'legendary', stackable: false,
    description: "Forged from the Concrete Behemoth's own rebar, re-veined with living mycelium.",
    bonuses: { attackBonus: 28, strengthBonus: 22 },
  },

  // ── Off-hand ───────────────────────────────────────────────────────────────
  barkShield: {
    defId: 'barkShield', name: 'Bark Shield', slot: 'offhand',
    color: '#5d4037', abbr: 'BkS', rarity: 'common', stackable: false,
    description: 'Layered bark rounds bound with root cord. Solid defensive piece.',
    bonuses: { defenseBonus: 12 },
  },
  droneWing: {
    defId: 'droneWing', name: 'Drone Wing', slot: 'offhand',
    color: '#37474f', abbr: 'DWg', rarity: 'uncommon', stackable: false,
    description: 'A repurposed rotor blade — light, angular, and sharp on the edge.',
    bonuses: { defenseBonus: 7, attackBonus: 4 },
  },
  sporeOrb: {
    defId: 'sporeOrb', name: 'Spore Orb', slot: 'offhand',
    style: 'mycelial', color: '#6a1b9a', abbr: 'SpO', rarity: 'rare', stackable: false,
    description: 'A pressurised spore cluster. Amplifies mycelial output.',
    bonuses: { attackBonus: 10, strengthBonus: 6 },
  },
  quiver: {
    defId: 'quiver', name: 'Quiver', slot: 'offhand',
    style: 'marksmanship', color: '#4e342e', abbr: 'Qvr', rarity: 'common', stackable: false,
    description: 'A bark-and-leather quiver. Required for sustained ranged fire.',
    bonuses: { strengthBonus: 5 },
  },
  solarMirror: {
    defId: 'solarMirror', name: 'Solar Mirror', slot: 'offhand',
    style: 'solarcasting', color: '#f57f17', abbr: 'SMr', rarity: 'epic', stackable: false,
    description: 'A precision-polished salvage mirror that focuses solar energy.',
    bonuses: { attackBonus: 14, strengthBonus: 10 },
  },

  // ── Helmets ────────────────────────────────────────────────────────────────
  rootHood: {
    defId: 'rootHood', name: 'Root Hood', slot: 'helmet',
    color: '#4e342e', abbr: 'RHd', rarity: 'common', stackable: false,
    description: 'Woven bark and root fibre. Blends into the canopy.',
    bonuses: { defenseBonus: 5 },
  },
  droneCap: {
    defId: 'droneCap', name: 'Drone Cap', slot: 'helmet',
    color: '#37474f', abbr: 'DCp', rarity: 'uncommon', stackable: false,
    description: 'A repurposed drone sensor dome. Decent protection.',
    bonuses: { defenseBonus: 9 },
  },
  mycelialHelm: {
    defId: 'mycelialHelm', name: 'Mycelial Helm', slot: 'helmet',
    color: '#6a1b9a', abbr: 'MHm', rarity: 'rare', stackable: false,
    description: 'A living fungal helmet that slowly regrows when damaged.',
    bonuses: { defenseBonus: 11, attackBonus: 3 },
  },

  // ── Chest ──────────────────────────────────────────────────────────────────
  barkVest: {
    defId: 'barkVest', name: 'Bark Vest', slot: 'chest',
    color: '#5d4037', abbr: 'BVs', rarity: 'common', stackable: false,
    description: 'Layered bark plates over woven moss.',
    bonuses: { defenseBonus: 10 },
  },
  dronePlating: {
    defId: 'dronePlating', name: 'Drone Plating', slot: 'chest',
    color: '#263238', abbr: 'DPl', rarity: 'rare', stackable: false,
    description: 'Heavy chest plating scavenged from a Sentinel chassis.',
    bonuses: { defenseBonus: 18 },
  },
  verdantChest: {
    defId: 'verdantChest', name: 'Verdant Cuirass', slot: 'chest',
    color: '#e65100', abbr: 'VCu', rarity: 'legendary', stackable: false,
    description: 'Bio-metal weave fused with ancient heartwood. Breathes with you.',
    bonuses: { defenseBonus: 26, strengthBonus: 4 },
  },

  // ── Legs ───────────────────────────────────────────────────────────────────
  wovenLeggings: {
    defId: 'wovenLeggings', name: 'Woven Leggings', slot: 'legs',
    color: '#2e7d32', abbr: 'WLg', rarity: 'common', stackable: false,
    description: 'Tightly woven plant-fibre leggings.',
    bonuses: { defenseBonus: 7 },
  },
  droneGreaves: {
    defId: 'droneGreaves', name: 'Drone Greaves', slot: 'legs',
    color: '#37474f', abbr: 'DGr', rarity: 'uncommon', stackable: false,
    description: 'Repurposed leg actuator housing. Sturdy and quiet.',
    bonuses: { defenseBonus: 13 },
  },

  // ── Feet ───────────────────────────────────────────────────────────────────
  barkBoots: {
    defId: 'barkBoots', name: 'Bark Boots', slot: 'feet',
    color: '#6d4c41', abbr: 'BBt', rarity: 'common', stackable: false,
    description: 'Carved bark soles with moss lining. Silent on any terrain.',
    bonuses: { defenseBonus: 4, speedBonus: 0.3 },
  },
  droneTreads: {
    defId: 'droneTreads', name: 'Drone Treads', slot: 'feet',
    color: '#455a64', abbr: 'DTr', rarity: 'uncommon', stackable: false,
    description: 'Salvaged all-terrain drone feet. Grip on any surface.',
    bonuses: { defenseBonus: 7, speedBonus: 0.5 },
  },
  sporewalkers: {
    defId: 'sporewalkers', name: 'Sporewalkers', slot: 'feet',
    color: '#6a1b9a', abbr: 'SpW', rarity: 'epic', stackable: false,
    description: 'Fungal boots that leave a spore trail.',
    bonuses: { defenseBonus: 9, speedBonus: 0.8, attackBonus: 3 },
  },

  // ── Hands ──────────────────────────────────────────────────────────────────
  rootWraps: {
    defId: 'rootWraps', name: 'Root Wraps', slot: 'hands',
    color: '#4e342e', abbr: 'RWr', rarity: 'common', stackable: false,
    description: 'Root-fibre wraps that improve grip without sacrificing feel.',
    bonuses: { attackBonus: 3, strengthBonus: 2 },
  },
  droneGauntlets: {
    defId: 'droneGauntlets', name: 'Drone Gauntlets', slot: 'hands',
    color: '#37474f', abbr: 'DGt', rarity: 'uncommon', stackable: false,
    description: 'Salvaged drone limb actuators repurposed as gauntlets.',
    bonuses: { attackBonus: 5, strengthBonus: 3, defenseBonus: 2 },
  },
  mycelialGloves: {
    defId: 'mycelialGloves', name: 'Mycelial Gloves', slot: 'hands',
    color: '#6a1b9a', abbr: 'MGl', rarity: 'rare', stackable: false,
    description: 'Living gloves threaded with fungal nerve-fibre. Highly responsive.',
    bonuses: { attackBonus: 8, strengthBonus: 5 },
  },

  // ── Amulets ────────────────────────────────────────────────────────────────
  wornCircuit: {
    defId: 'wornCircuit', name: 'Worn Circuit', slot: 'amulet',
    color: '#f57f17', abbr: 'WCr', rarity: 'common', stackable: false,
    description: 'A scavenged circuit that hums faintly. Sharpens your aim.',
    bonuses: { attackBonus: 3 },
  },
  sporePendant: {
    defId: 'sporePendant', name: 'Spore Pendant', slot: 'amulet',
    color: '#7b1fa2', abbr: 'SPn', rarity: 'uncommon', stackable: false,
    description: 'A sealed spore cluster on a root-cord. Amplifies mycelial resonance.',
    bonuses: { attackBonus: 5, strengthBonus: 2 },
  },
  solarAmulet: {
    defId: 'solarAmulet', name: 'Solar Amulet', slot: 'amulet',
    color: '#e65100', abbr: 'SAm', rarity: 'legendary', stackable: false,
    description: 'A concentrated solar lens on a copper chain. Radiates warmth.',
    bonuses: { attackBonus: 12, strengthBonus: 8, defenseBonus: 4 },
  },

  // ── Rings ──────────────────────────────────────────────────────────────────
  mycelialBand: {
    defId: 'mycelialBand', name: 'Mycelial Band', slot: 'ring',
    color: '#6a1b9a', abbr: 'MBd', rarity: 'uncommon', stackable: false,
    description: 'A ring of compressed mycelium. Pulses faintly underground.',
    bonuses: { attackBonus: 4, strengthBonus: 1 },
  },
  circuitRing: {
    defId: 'circuitRing', name: 'Circuit Ring', slot: 'ring',
    color: '#1565c0', abbr: 'CRg', rarity: 'rare', stackable: false,
    description: 'A ring etched with a functioning microprocessor loop.',
    bonuses: { attackBonus: 6, defenseBonus: 3 },
  },
  rootweaverSigil: {
    defId: 'rootweaverSigil', name: 'Rootweaver Sigil', slot: 'ring',
    color: '#b71c1c', abbr: 'RSg', rarity: 'artifact', stackable: false,
    description: 'A living ring that grew around the finger of the first Rootweaver elder.',
    bonuses: { attackBonus: 10, strengthBonus: 8, defenseBonus: 8 },
  },

  // ── Relics ─────────────────────────────────────────────────────────────────
  solarCell: {
    defId: 'solarCell', name: 'Solar Cell', slot: 'relic',
    color: '#f9a825', abbr: 'SC', rarity: 'uncommon', stackable: false,
    description: 'A compact photovoltaic cell. Charges your Attunement faster in open areas.',
    effect: 'Attunement regenerates 20% faster outdoors.',
    bonuses: { attackBonus: 2 },
  },
  droneCore: {
    defId: 'droneCore', name: 'Drone Core', slot: 'relic',
    color: '#1565c0', abbr: 'DCr', rarity: 'rare', stackable: false,
    description: 'A reprogrammed drone CPU. Still processing — now for you.',
    effect: 'Combat tick fires 100ms faster (500ms total).',
    bonuses: { attackBonus: 5, strengthBonus: 3 },
  },
  rootFragment: {
    defId: 'rootFragment', name: 'Root Fragment', slot: 'relic',
    color: '#2e7d32', abbr: 'RFr', rarity: 'epic', stackable: false,
    description: 'A fragment from the oldest living root network. Pulses with memory.',
    effect: 'Regenerate 2 HP per combat tick in forested zones.',
    bonuses: { defenseBonus: 6, strengthBonus: 4 },
  },
  extinctionShard: {
    defId: 'extinctionShard', name: 'Extinction Shard', slot: 'relic',
    color: '#b71c1c', abbr: 'ExS', rarity: 'artifact', stackable: false,
    description: 'A fragment from the Extinction Engine itself. Throbs with cold energy.',
    effect: 'All damage increased by 15%. Biome health slowly drains near you.',
    bonuses: { attackBonus: 18, strengthBonus: 14, defenseBonus: 8 },
  },
}

/**
 * Create a live item instance from a definition ID.
 * @param {string} defId
 * @param {number} [quantity=1]
 * @returns {object}
 */
export function createItem(defId, quantity = 1) {
  const def = ITEM_DEFS[defId]
  if (!def) throw new Error(`Unknown item: ${defId}`)
  return { ...def, instanceId: `item_${_uid++}`, quantity: def.stackable ? quantity : 1 }
}

import { Engine }             from './engine/Engine.js'
import { GameLoop }           from './engine/GameLoop.js'
import { World }              from './world/World.js'
import { Player }             from './player/Player.js'
import { CombatManager }      from './combat/CombatManager.js'
import { EnemyManager }       from './enemies/EnemyManager.js'
import { XPSystem }           from './skills/XPSystem.js'
import { Woodcutting }        from './skills/Woodcutting.js'
import { Mining }             from './skills/Mining.js'
import { Foundry }            from './skills/Foundry.js'
import { FoundryPanel }       from './ui/FoundryPanel.js'
import { Chemistry }          from './skills/Chemistry.js'
import { ChemistryPanel }     from './ui/ChemistryPanel.js'
import { Construction }       from './skills/Construction.js'
import { ConstructionPanel }  from './ui/ConstructionPanel.js'
import { Technology }         from './skills/Technology.js'
import { TechPanel }          from './ui/TechPanel.js'
import { Marksmanship }       from './combat/Marksmanship.js'
import { MarksmanshipBar }    from './ui/MarksmanshipBar.js'
import { Inventory }          from './inventory/Inventory.js'
import { Equipment }          from './inventory/Equipment.js'
import { HUD }                from './ui/HUD.js'
import { GamePanel }          from './ui/GamePanel.js'
import { BiomeState }         from './world/BiomeState.js'
import { AttunementSystem }   from './attunement/AttunementSystem.js'
import { AttunementBar }      from './ui/AttunementBar.js'
import { ContextMenu }        from './ui/ContextMenu.js'
import { Tooltip }            from './ui/Tooltip.js'
import { AttackStylePanel }   from './ui/AttackStylePanel.js'
import { createItem }         from './inventory/ItemDefs.js'
import { ModalManager }       from './ui/modals/ModalManager.js'
import { UILayer }            from './ui/phaser/UILayer.js'
import { bus }                from './utils/EventBus.js'

async function init() {
  const container = document.getElementById('canvas-container')

  // ── Engine + loop ────────────────────────────────────────────────────────
  const engine   = new Engine(container)
  const gameLoop = new GameLoop()

  // ── World ────────────────────────────────────────────────────────────────
  const world = new World(engine.scene, engine)

  // ── Player ───────────────────────────────────────────────────────────────
  const player = new Player(world.navmesh)
  player.object.position.set(0, 0, 0)
  engine.scene.add(player.object)
  engine.followTarget(player.object)
  engine.setPlayerRef(player)

  // Base stats (unguilded, bare-handed)
  player.stats.attack      = 20
  player.stats.defense     = 15
  player.stats.combatStyle = 'biomech'

  // ── Inventory + Equipment ────────────────────────────────────────────────
  const inventory = new Inventory()
  const equipment = new Equipment(inventory)

  // Attach equipment to player so DamageCalc and CombatManager can read it
  player.equipment = equipment

  // Keep player.stats.combatStyle in sync with equipped weapon
  bus.on('equipment:changed', ({ slot, item }) => {
    if (slot === 'weapon') {
      player.stats.combatStyle = item?.style ?? 'biomech'
    }
  })

  // ── Biome + Attunement ───────────────────────────────────────────────────
  const biomeState       = new BiomeState()
  const attunementSystem = new AttunementSystem(player, biomeState)
  const attunementBar    = new AttunementBar(attunementSystem)

  // ── Combat ───────────────────────────────────────────────────────────────
  const combat = new CombatManager(attunementSystem)
  combat.registerEntity('player', player)

  // ── Enemies ──────────────────────────────────────────────────────────────
  const enemies = new EnemyManager(world.navmesh, engine, combat)
  enemies.setPlayerRef(player.object)
  enemies.spawnDrones(6)

  // ── XP / Skills ──────────────────────────────────────────────────────────
  const xp         = new XPSystem(player)
  const woodcutting = new Woodcutting(player, inventory, world.trees)
  const mining      = new Mining(player, inventory, world.oreNodes)
  const foundryPanel    = new FoundryPanel(inventory)
  const foundry         = new Foundry(player, inventory, world.foundryStations)
  const chemistryPanel    = new ChemistryPanel(inventory)
  const chemistry         = new Chemistry(player, inventory, world.chemBenches)
  const construction      = new Construction(player, inventory, engine, engine.scene)
  const constructionPanel = new ConstructionPanel(inventory, player)
  const techPanel         = new TechPanel(inventory)
  const technology        = new Technology(player, inventory, world.techBenches)
  const marksmanship      = new Marksmanship(player, combat, engine.scene)
  const marksmanshipBar   = new MarksmanshipBar(marksmanship)

  // Show/hide the ability bar when weapon style changes
  bus.on('equipment:changed', ({ slot, item }) => {
    if (slot !== 'weapon') return
    if (item?.style === 'marksmanship') marksmanshipBar.show()
    else marksmanshipBar.hide()
  })

  // Attunement restore (from Chemistry tinctures)
  bus.on('attunement:restore', ({ amount }) => attunementSystem.restore(amount))

  // Drop item from inventory
  bus.on('item:drop', ({ instanceId }) => {
    inventory.removeItem(instanceId)
    bus.emit('inventory:changed', {})
  })

  // Gather handler — herb/fungi patches (no skill level needed)
  bus.on('skill:action', ({ type, target }) => {
    if (type !== 'gather') return
    const node = world.gatherNodes.get(target.entityId)
    if (!node?.isAvailable) {
      const el = document.getElementById('status')
      if (el) el.textContent = 'Nothing to gather here yet.'
      return
    }
    bus.emit('player:click-move', { worldPos: node.position.clone(), _internal: true })
    const itemId = node.gather()
    if (itemId) {
      const item  = createItem(itemId, 1)
      const added = inventory.addItem(item)
      if (added) bus.emit('inventory:item-received', { item })
      const el = document.getElementById('status')
      if (el) el.textContent = `You gather some ${item.name.toLowerCase()}.`
    }
  })

  // ── HUD ──────────────────────────────────────────────────────────────────
  const hud = new HUD(engine)
  hud.registerEntity('player', player)

  // ── Minimap layers ───────────────────────────────────────────────────────
  const mm = hud.minimap
  mm.addLayer('trees',    () => [...world.trees.values()].map(t => t.position),            '#2e7d32', 1.5)
  mm.addLayer('oreNodes', () => [...world.oreNodes.values()].map(o => o.position),         '#78909c', 2)
  mm.addLayer('gather',   () => [...world.gatherNodes.values()].filter(g => g.isAvailable).map(g => g.position), '#81c784', 2)
  mm.addLayer('enemies',  () => [...enemies.enemies.values()].filter(e => e.object).map(e => e.object.position), '#ef5350', 3)
  mm.addLayer('foundry',  () => [...world.foundryStations.values()].map(s => s.position),  '#ff8a65', 2)
  mm.addLayer('chemBench',() => [...world.chemBenches.values()].map(s => s.position),      '#00e676', 2)
  mm.addLayer('techBench',() => [...world.techBenches.values()].map(s => s.position),      '#00bcd4', 2)

  // ── Unified Game Panel (inventory / equipment / skills / attunements) ───
  const gamePanel = new GamePanel(inventory, equipment, player, attunementSystem)
  bus.on('ui:open-attunements', () => gamePanel.openTab('attunements'))

  // ── Attack Style panel (Q key) ───────────────────────────────────────────
  const attackStylePanel = new AttackStylePanel(player)

  // ── Context menu + tooltip ───────────────────────────────────────────────
  const contextMenu   = new ContextMenu()
  const tooltip       = new Tooltip()
  const modalManager  = new ModalManager()
  const uiLayer       = new UILayer(gameLoop, engine)

  // Examine text → status bar (acts like OSRS chat)
  bus.on('ui:examine', ({ text }) => {
    const el = document.getElementById('status')
    if (el) {
      el.textContent = text
      clearTimeout(el._examineTimer)
      el._examineTimer = setTimeout(() => {
        el.textContent = 'Move: click · Attack: click drone · Skills: Tab · Inventory: I · Attunements: A'
      }, 5000)
    }
  })

  // ── Register systems ─────────────────────────────────────────────────────
  gameLoop.register('player',     delta => player.update(delta))
  gameLoop.register('woodcutting',delta => woodcutting.update(delta))
  gameLoop.register('mining',       delta => mining.update(delta))
  gameLoop.register('construction',  delta => construction.update(delta))
  gameLoop.register('marksmanship',  delta => marksmanship.update(delta))
  gameLoop.register('attackStyle',   delta => attackStylePanel.update(delta))
  gameLoop.register('attunement', delta => attunementSystem.update(delta, player.object.position))
  gameLoop.register('combat',     delta => combat.update(delta))
  gameLoop.register('enemies',    delta => enemies.update(delta))
  gameLoop.register('hud',        delta => hud.update(delta))
  gameLoop.register('engine',     delta => engine.update(delta))

  // ── Boot ─────────────────────────────────────────────────────────────────
  const loading = document.getElementById('loading')
  if (loading) setTimeout(() => loading.classList.add('hidden'), 400)

  gameLoop.start()

  window._vp = { engine, gameLoop, world, player, combat, enemies, xp, woodcutting, mining, foundry, foundryPanel, chemistry, chemistryPanel, construction, constructionPanel, technology, techPanel, marksmanship, marksmanshipBar, inventory, equipment, hud, gamePanel, biomeState, attunementSystem, attunementBar, contextMenu, modalManager, uiLayer }
  console.log('[Verdant Protocol] Booted. Debug via window._vp')
}

init().catch(err => {
  console.error('[Verdant Protocol] Fatal boot error:', err)
  const p = document.getElementById('loading')?.querySelector('p')
  if (p) p.textContent = 'Boot failed: ' + err.message
})

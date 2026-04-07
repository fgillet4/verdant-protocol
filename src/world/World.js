import * as THREE from 'three'
import { bus }    from '../utils/EventBus.js'
import { GridNav } from '../pathfinding/GridNav.js'
import { Tree }             from './Tree.js'
import { TREE_TIERS, TREE_SPAWN_WEIGHTS } from './TreeDefs.js'
import { OreNode }          from './OreNode.js'
import { ORE_TIERS, ORE_SPAWN_WEIGHTS } from './OreNodeDefs.js'
import { FoundryStation }   from './FoundryStation.js'
import { ChemBench }        from './ChemBench.js'
import { GatherNode }       from './GatherNode.js'
import { TechBench }        from './TechBench.js'

const ZONE_SIZE = 60      // world units each side
const CELL_SIZE = 2       // navmesh cell size (2-unit cells → 30×30 grid)

/**
 * World — builds the starter zone.
 * Owns terrain mesh, navmesh, and scene decoration.
 * OWNED BY: world-agent
 */
export class World {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../engine/Engine.js').Engine} engine
   */
  constructor(scene, engine) {
    this.scene = scene
    this.engine = engine

    /** @type {Map<string, Tree>} id → Tree (exposed for Woodcutting) */
    this.trees = new Map()

    /** @type {Map<string, OreNode>} id → OreNode (exposed for Mining) */
    this.oreNodes = new Map()

    /** @type {Map<string, FoundryStation>} id → FoundryStation (exposed for Foundry) */
    this.foundryStations = new Map()

    /** @type {Map<string, ChemBench>} id → ChemBench (exposed for Chemistry) */
    this.chemBenches = new Map()

    /** @type {Map<string, GatherNode>} id → GatherNode (exposed for gather interactions) */
    this.gatherNodes = new Map()

    /** @type {Map<string, TechBench>} id → TechBench (exposed for Technology) */
    this.techBenches = new Map()

    // Build grid nav (Dijkstra on weighted tile grid)
    this.navmesh = new GridNav(ZONE_SIZE, CELL_SIZE)

    // Build terrain
    this._buildTerrain()
    this._buildDecoration()

    // Listen for debug object requests from other systems
    bus.on('world:add-debug-object',    ({ object }) => scene.add(object))
    bus.on('world:remove-debug-object', ({ object }) => scene.remove(object))
  }

  _buildTerrain() {
    // Ground plane — this is what the raycaster hits for click-to-move
    const geo = new THREE.PlaneGeometry(ZONE_SIZE, ZONE_SIZE, 32, 32)
    geo.rotateX(-Math.PI / 2)

    // Subtle height variation via vertex displacement
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // Simple noise-ish height variation
      const y = Math.sin(x * 0.3) * 0.15 + Math.cos(z * 0.25) * 0.12 +
                Math.sin(x * 0.8 + z * 0.6) * 0.06
      pos.setY(i, y)
    }
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d5a1b,
      roughness: 0.95,
      metalness: 0.0,
    })

    this.groundMesh = new THREE.Mesh(geo, mat)
    this.groundMesh.receiveShadow = true
    this.groundMesh.name = 'ground'
    this.scene.add(this.groundMesh)

    // Register as walkable with the engine's raycaster
    this.engine.addWalkableMesh(this.groundMesh)
  }

  _buildDecoration() {
    // Trees (individual objects — each is raycasted and choppable)
    this._addTrees(80)
    // Ore nodes (interactable, tiered)
    this._addOreNodes(40)
    // Bioluminescent mushrooms — solarpunk aesthetic
    this._addMushrooms(30)
    // Foundry stations (2 forges, one per side of the zone)
    this._addFoundryStations()
    // Chemistry benches (2, near spawn and far corner)
    this._addChemBenches()
    // Tech benches (2, offset from chem benches)
    this._addTechBenches()
    // Gather nodes (herbs + fungi scattered across the zone)
    this._addGatherNodes(25, 20)
  }

  _addTrees(count) {
    const half = ZONE_SIZE / 2 - 2
    // Build cumulative weight table for O(1) tier selection
    const cumulative = []
    let sum = 0
    for (const [tierId, w] of TREE_SPAWN_WEIGHTS) {
      sum += w
      cumulative.push({ tierId, threshold: sum })
    }
    const tierById = new Map(TREE_TIERS.map(t => [t.id, t]))

    let placed = 0
    while (placed < count) {
      const x = (Math.random() * 2 - 1) * half
      const z = (Math.random() * 2 - 1) * half
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue

      // Pick tier by weight
      const roll = Math.random()
      const entry = cumulative.find(c => roll < c.threshold) ?? cumulative[0]
      const tierDef = tierById.get(entry.tierId)

      const scale = (0.8 + Math.random() * 0.7) + (tierDef.scaleBonus ?? 0)
      const id    = `tree_${placed}`
      const tree  = new Tree(id, x, z, scale, tierDef)

      this.scene.add(tree.object)
      this.trees.set(id, tree)
      this.navmesh.blockAt(tree.position)

      this.engine.addInteractableMesh(tree.object, id, 'tree', tierDef.name)

      placed++
    }
  }

  _addOreNodes(count) {
    const half = ZONE_SIZE / 2 - 2
    // Build cumulative weight table
    const cumulative = []
    let sum = 0
    for (const [tierId, w] of ORE_SPAWN_WEIGHTS) {
      sum += w
      cumulative.push({ tierId, threshold: sum })
    }
    const tierById = new Map(ORE_TIERS.map(t => [t.id, t]))

    let placed = 0
    while (placed < count) {
      const x = (Math.random() * 2 - 1) * half
      const z = (Math.random() * 2 - 1) * half
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue

      const roll  = Math.random()
      const entry = cumulative.find(c => roll < c.threshold) ?? cumulative[0]
      const tier  = tierById.get(entry.tierId)

      const scale = 0.7 + Math.random() * 0.6
      const id    = `ore_${placed}`
      const node  = new OreNode(id, x, z, scale, tier)

      this.scene.add(node.object)
      this.oreNodes.set(id, node)
      this.navmesh.blockAt(node.position)
      this.engine.addInteractableMesh(node.object, id, 'ore', tier.name)

      placed++
    }
  }

  _addTechBenches() {
    const positions = [
      { id: 'tech_0', x: -6,  z:  16 },
      { id: 'tech_1', x:  18, z: -18 },
    ]
    for (const { id, x, z } of positions) {
      const bench = new TechBench(id, x, z)
      this.scene.add(bench.object)
      this.techBenches.set(id, bench)
      this.navmesh.blockAt(bench.position)
      this.engine.addInteractableMesh(bench.object, id, 'techbench', 'Tech Bench')
    }
  }

  _addChemBenches() {
    const positions = [
      { id: 'chem_0', x:  8, z:  14 },
      { id: 'chem_1', x: -20, z: -15 },
    ]
    for (const { id, x, z } of positions) {
      const bench = new ChemBench(id, x, z)
      this.scene.add(bench.object)
      this.chemBenches.set(id, bench)
      this.navmesh.blockAt(bench.position)
      this.engine.addInteractableMesh(bench.object, id, 'chembench', 'Chemistry Bench')
    }
  }

  _addGatherNodes(herbCount, fungiCount) {
    const half = ZONE_SIZE / 2 - 2
    let placed = 0

    const add = (type, count) => {
      let n = 0
      while (n < count) {
        const x = (Math.random() * 2 - 1) * half
        const z = (Math.random() * 2 - 1) * half
        if (Math.abs(x) < 4 && Math.abs(z) < 4) continue
        const id   = `gather_${placed++}`
        const node = new GatherNode(id, x, z, type)
        this.scene.add(node.object)
        this.gatherNodes.set(id, node)
        const label = type === 'herb' ? 'Herb Patch' : 'Fungi Patch'
        this.engine.addInteractableMesh(node.object, id, 'gather', label)
        n++
      }
    }

    add('herb',  herbCount)
    add('fungi', fungiCount)
  }

  _addFoundryStations() {
    const positions = [
      { id: 'foundry_0', x: 14, z: -10 },
      { id: 'foundry_1', x: -16, z:  12 },
    ]
    for (const { id, x, z } of positions) {
      const station = new FoundryStation(id, x, z)
      this.scene.add(station.object)
      this.foundryStations.set(id, station)
      this.navmesh.blockAt(station.position)
      this.engine.addInteractableMesh(station.object, id, 'foundry', 'Foundry')
    }
  }

  _addMushrooms(count) {
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 6)
    const capGeo  = new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xd4b896 })
    // Emissive glow for bioluminescent solarpunk mushrooms
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x00e5cc,
      emissive: 0x00b8a0,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    })

    const stemMesh = new THREE.InstancedMesh(stemGeo, stemMat, count)
    const capMesh  = new THREE.InstancedMesh(capGeo,  capMat,  count)

    const dummy = new THREE.Object3D()
    const half = ZONE_SIZE / 2 - 2
    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * half
      const z = (Math.random() * 2 - 1) * half
      const s = 0.6 + Math.random() * 1.0

      dummy.position.set(x, 0.2 * s, z)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      stemMesh.setMatrixAt(i, dummy.matrix)

      dummy.position.set(x, 0.4 * s, z)
      dummy.updateMatrix()
      capMesh.setMatrixAt(i, dummy.matrix)
    }
    stemMesh.instanceMatrix.needsUpdate = true
    capMesh.instanceMatrix.needsUpdate = true
    this.scene.add(stemMesh, capMesh)
  }
}

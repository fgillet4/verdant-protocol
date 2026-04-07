/**
 * TechBench — Technology workbench placed in the world.
 * Right-click → "Use Tech Bench" opens the Technology panel.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

export class TechBench {
  /**
   * @param {string} id
   * @param {number} x
   * @param {number} z
   */
  constructor(id, x, z) {
    this.id       = id
    this.position = new THREE.Vector3(x, 0, z)
    this.object   = this._build(x, z)
  }

  _build(x, z) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)

    // Table surface — dark metal
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6, metalness: 0.55 })
    const woodMat  = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8 })
    const top  = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.07, 0.75), metalMat)
    top.position.y = 0.84
    top.castShadow = top.receiveShadow = true

    // Legs
    for (const [lx, lz] of [[-0.6,-0.3],[0.6,-0.3],[-0.6,0.3],[0.6,0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.84, 0.06), woodMat)
      leg.position.set(lx, 0.42, lz)
      group.add(leg)
    }

    // Mounted monitor / display
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4, emissive: 0x00acc1, emissiveIntensity: 0.6, roughness: 0.2,
    })
    const monBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), metalMat)
    monBase.position.set(0.35, 1.07, -0.2)
    const screen  = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03), screenMat)
    screen.position.set(0.35, 1.3, -0.2)

    // Holographic display scanlines effect (thin horizontal slab)
    const holoMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 0.25,
      transparent: true, opacity: 0.18, depthWrite: false,
    })
    const holo = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.28), holoMat)
    holo.position.set(0.35, 0.9, 0)

    // Circuit slab on bench surface
    const circuitMat = new THREE.MeshStandardMaterial({
      color: 0x00695c, emissive: 0x004d40, emissiveIntensity: 0.3, roughness: 0.4,
    })
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.32), circuitMat)
    slab.position.set(-0.25, 0.895, 0.06)

    // Tools — small cylinders
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5, metalness: 0.7 })
    for (let i = 0; i < 3; i++) {
      const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.22, 5), toolMat)
      tool.position.set(-0.52 + i * 0.06, 0.91, -0.25)
      tool.rotation.z = 0.2
      group.add(tool)
    }

    // Ambient blue-green glow
    const light = new THREE.PointLight(0x00bcd4, 0.55, 4)
    light.position.set(0, 1.4, 0)

    group.add(top, monBase, screen, holo, slab, light)
    return group
  }
}

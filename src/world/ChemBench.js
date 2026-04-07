/**
 * ChemBench — Chemistry workbench placed in the world.
 * Right-click → "Use Chemistry Bench" opens the Chemistry panel.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

export class ChemBench {
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

    // Table surface
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.88 })
    const top     = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.7), woodMat)
    top.position.y = 0.82
    top.castShadow = top.receiveShadow = true

    // Table legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.92 })
    for (const [lx, lz] of [[-0.52, -0.28], [0.52, -0.28], [-0.52, 0.28], [0.52, 0.28]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), legMat)
      leg.position.set(lx, 0.4, lz)
      group.add(leg)
    }

    // Glassware (flasks)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x80deea, roughness: 0.1, metalness: 0.05,
      transparent: true, opacity: 0.55,
    })
    const flask1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glassMat)
    flask1.position.set(-0.35, 1.04, 0)
    const flask2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 7), glassMat)
    flask2.position.set(0.1, 1.03, 0.1)
    const flask3 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), glassMat)
    flask3.position.set(0.38, 0.99, -0.1)

    // Liquid glow inside flasks
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00e676, emissive: 0x00c853, emissiveIntensity: 0.9,
    })
    const liquid1 = new THREE.Mesh(new THREE.SphereGeometry(0.072, 7, 5), glowMat)
    liquid1.position.copy(flask1.position)
    const liquid2 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 4), glowMat)
    liquid2.position.copy(flask3.position)

    // Coil of tubing (torus)
    const coilMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.5, metalness: 0.4 })
    const coil    = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), coilMat)
    coil.position.set(-0.05, 0.88, 0)
    coil.rotation.x = Math.PI / 2

    // Solar concentrator dish
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.3, metalness: 0.7 })
    const dish    = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dishMat)
    dish.position.set(0.38, 1.13, -0.1)
    dish.rotation.x = Math.PI

    // Ambient glow
    const light = new THREE.PointLight(0x00e676, 0.5, 3)
    light.position.set(-0.35, 1.2, 0)

    group.add(top, flask1, flask2, flask3, liquid1, liquid2, coil, dish, light)
    return group
  }
}

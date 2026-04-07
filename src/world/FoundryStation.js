/**
 * FoundryStation — forge object placed in the world.
 * Raycasted as type 'foundry'; player right-clicks to open smelting panel.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

export class FoundryStation {
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

    // Stone forge body
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a5550, roughness: 0.92, metalness: 0.05 })
    const body     = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), stoneMat)
    body.position.y = 0.4
    body.castShadow = body.receiveShadow = true

    // Dark forge mouth
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x111111 })
    const mouth    = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.05), mouthMat)
    mouth.position.set(0, 0.5, 0.525)

    // Glowing fire (emissive)
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0xff6b1a, emissive: 0xff4500, emissiveIntensity: 1.4, roughness: 0.3,
    })
    const fire    = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.04), fireMat)
    fire.position.set(0, 0.5, 0.52)

    // Chimney stack
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.95 })
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.0, 6), chimMat)
    chimney.position.set(0.38, 1.3, -0.08)
    chimney.castShadow = true

    // Anvil pedestal
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6, metalness: 0.55 })
    const aBase    = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.32), anvilMat)
    aBase.position.set(-0.58, 0.87, 0)
    const aTop     = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.1, 0.38), anvilMat)
    aTop.position.set(-0.58, 1.04, 0)
    aBase.castShadow = aTop.castShadow = true

    // Warm point light
    const light = new THREE.PointLight(0xff5500, 0.9, 5)
    light.position.set(0, 0.85, 0.3)

    group.add(body, mouth, fire, chimney, aBase, aTop, light)
    return group
  }
}

/**
 * LanternPost — a procedural street lantern with a warm PointLight.
 * Solarpunk aesthetic: dark iron pole, amber solar-glass lamp.
 * OWNED BY: world-agent
 */
import * as THREE from 'three'

const POLE_MAT  = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.6 })
const LAMP_MAT  = new THREE.MeshStandardMaterial({
  color:             0xffd080,
  emissive:          0xff9900,
  emissiveIntensity: 1.4,
  roughness:         0.2,
  metalness:         0.1,
  transparent:       true,
  opacity:           0.85,
})
const CAGE_MAT  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.8 })

export class LanternPost {
  /**
   * @param {number} x
   * @param {number} z
   */
  constructor(x, z) {
    this.object = new THREE.Group()
    this.object.position.set(x, 0, z)

    // ── Pole ──────────────────────────────────────────────────────────────────
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.10, 3.6, 8)
    const pole    = new THREE.Mesh(poleGeo, POLE_MAT)
    pole.position.y = 1.8
    pole.castShadow = true
    this.object.add(pole)

    // ── Arm (horizontal bracket) ──────────────────────────────────────────────
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6)
    const arm    = new THREE.Mesh(armGeo, POLE_MAT)
    arm.rotation.z = Math.PI / 2
    arm.position.set(0.35, 3.55, 0)
    arm.castShadow = true
    this.object.add(arm)

    // ── Lamp housing (cage) ───────────────────────────────────────────────────
    const cageGeo = new THREE.BoxGeometry(0.34, 0.42, 0.34)
    const cage    = new THREE.Mesh(cageGeo, CAGE_MAT)
    cage.position.set(0.7, 3.48, 0)
    cage.castShadow = true
    this.object.add(cage)

    // ── Lamp glass (inner glow) ───────────────────────────────────────────────
    const glassGeo = new THREE.BoxGeometry(0.24, 0.32, 0.24)
    const glass    = new THREE.Mesh(glassGeo, LAMP_MAT)
    glass.position.set(0.7, 3.48, 0)
    this.object.add(glass)

    // ── Cap on top of cage ───────────────────────────────────────────────────
    const capGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.08, 8)
    const cap    = new THREE.Mesh(capGeo, CAGE_MAT)
    cap.position.set(0.7, 3.72, 0)
    this.object.add(cap)

    // Tight PointLight centred on the bulb — only illuminates directly below the lamp.
    // Short distance (6 units) keeps the pool small so fragment cost stays low.
    this.light = new THREE.PointLight(0xffa040, 40, 6, 2)
    this.light.position.set(0.7, 3.48, 0)   // same as glass centre
    this.light.castShadow = false
    this.object.add(this.light)
  }

  /** World-space position of the base for navmesh blocking. */
  get position() { return this.object.position }
}

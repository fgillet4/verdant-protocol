/**
 * DroneMesh — factory that builds the Drone Sentinel Three.js geometry.
 * Isolated so DroneEnemy.js stays focused on AI state logic.
 * @returns {{ object: THREE.Group, bodyMat: THREE.MeshStandardMaterial, sensorMat: THREE.MeshStandardMaterial }}
 */
import * as THREE from 'three'

export function buildDroneMesh() {
  const object = new THREE.Group()

  // Central body disc
  const bodyGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.14, 8)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.85, roughness: 0.25 })
  const body    = new THREE.Mesh(bodyGeo, bodyMat)
  body.castShadow = true

  // Four rotor arms (two perpendicular)
  const armGeo = new THREE.BoxGeometry(1.5, 0.06, 0.12)
  const armMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 })
  const arm1   = new THREE.Mesh(armGeo, armMat)
  const arm2   = arm1.clone()
  arm2.rotation.y = Math.PI / 2

  // Rotor tip discs at arm ends
  const rotorGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8)
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 })
  for (const offset of [
    new THREE.Vector3( 0.75, 0, 0), new THREE.Vector3(-0.75, 0, 0),
    new THREE.Vector3(0, 0,  0.75), new THREE.Vector3(0, 0, -0.75),
  ]) {
    const rotor = new THREE.Mesh(rotorGeo, rotorMat)
    rotor.position.copy(offset)
    object.add(rotor)
  }

  // Red sensor eye — emissive glow
  const sensorGeo = new THREE.SphereGeometry(0.09, 8, 6)
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0xff1100, emissive: 0xff0000, emissiveIntensity: 1.2,
  })
  const sensor = new THREE.Mesh(sensorGeo, sensorMat)
  sensor.position.y = -0.1

  object.add(body, arm1, arm2, sensor)
  return { object, bodyMat, sensorMat }
}

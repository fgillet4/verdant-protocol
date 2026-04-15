import * as THREE from 'three'

// Outer ring extends from the edge of the playable zone outward
const INNER_R   = 28    // just inside 60/2 = 30 so the ring overlaps slightly
const OUTER_R   = 500   // how far the fake terrain extends

// Billboard cylinder — sits just inside the outer edge so it's never clipped
const BILLBOARD_R = 460
const BILLBOARD_H = 120   // tall enough to hide sky below camera horizon

const vertexShader = /* glsl */`
  varying float vHeight;
  varying vec2  vUv;

  // Cheap FBM for gentle hill silhouette on the billboard
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }

  void main() {
    vec3 pos = position;

    // Displace billboard vertices vertically to create hill silhouette.
    // Only positive-Y offset (hills stick up, never go below ground).
    float angle  = atan(pos.z, pos.x);     // XZ angle of this vertex
    float n = noise(vec2(angle * 2.8, 0.0)) * 0.7
            + noise(vec2(angle * 5.3, 1.4)) * 0.3;
    // Push the TOP of the billboard up by 0-30 units to fake rolling hills.
    // vHeight 0 = bottom, 1 = top
    float heightT = clamp(pos.y / ${BILLBOARD_H.toFixed(1)}, 0.0, 1.0);
    pos.y += n * 30.0 * heightT;

    vHeight = heightT;
    vUv     = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float sunElevation;  // degrees, drives colour
  varying float vHeight;
  varying vec2  vUv;

  void main() {
    float sunT = clamp((sunElevation - 6.0) / 49.0, 0.0, 1.0);

    // Terrain band colours (bottom of billboard = ground continuation)
    vec3 grassDay    = vec3(0.17, 0.35, 0.11);
    vec3 grassSunset = vec3(0.22, 0.20, 0.08);
    vec3 grassColor  = mix(grassSunset, grassDay, sunT);

    // Tree canopy band above grass
    vec3 canopyDay    = vec3(0.08, 0.25, 0.06);
    vec3 canopySunset = vec3(0.18, 0.13, 0.04);
    vec3 canopyColor  = mix(canopySunset, canopyDay, sunT);

    // Sky fade at the top — transparent so sky shows through naturally
    float grassBand  = smoothstep(0.25, 0.45, vHeight);   // 0=grass, 1=canopy
    float skyFade    = smoothstep(0.55, 0.85, vHeight);   // fade to transparent

    vec3  color   = mix(grassColor, canopyColor, grassBand);
    float alpha   = 1.0 - skyFade;

    // Subtle horizontal banding variation (fake distance detail)
    float detail = sin(vUv.x * 180.0) * 0.04 + sin(vUv.x * 73.0) * 0.02;
    color += detail;

    gl_FragColor = vec4(color, alpha);
  }
`

/**
 * HorizonTerrain — extends the visible world beyond the 60×60 playable zone.
 *
 * Two components:
 *  1. Outer ring (RingGeometry, flat) — seamlessly continues the ground texture
 *     from the zone edge outward to 500 units, preventing sky bleed-through.
 *  2. Billboard cylinder — a tall ring at ~460 units with a hills shader that
 *     fades from terrain green (bottom) to transparent (top), giving the
 *     illusion of a distant forested landscape.
 *
 * Neither is walkable — they are pure visual extensions.
 * OWNED BY: world-agent
 */
export class HorizonTerrain {
  /**
   * @param {THREE.Scene} scene
   * @param {number}      [zoneSize=60] — must match World.js ZONE_SIZE
   */
  constructor(scene, zoneSize = 60) {
    this._scene = scene
    this._billboard = null
    this._sunElevation = 18

    this._buildOuterRing(zoneSize)
    this._buildBillboard()
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Update sun elevation so billboard colours match the sky.
   * Call this from DayCycle / Engine.onElevationChange.
   * @param {number} elevationDeg
   */
  setSunElevation(elevationDeg) {
    this._sunElevation = elevationDeg
    if (this._billboard) {
      this._billboard.material.uniforms.sunElevation.value = elevationDeg
    }
  }

  dispose() {
    for (const obj of this._objects) {
      this._scene.remove(obj)
      obj.geometry.dispose()
      if (obj.material.dispose) obj.material.dispose()
    }
    this._objects = []
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _buildOuterRing(zoneSize) {
    this._objects = []

    // Flat ring extending the ground far into the distance.
    // innerRadius is a touch smaller than zone half-size so it overlaps the
    // inner terrain and leaves no gap. Slight Y offset keeps it below.
    const geo = new THREE.RingGeometry(INNER_R, OUTER_R, 128, 6)
    geo.rotateX(-Math.PI / 2)

    const mat = new THREE.MeshStandardMaterial({
      color:     0x243d14,   // slightly darker — distance atmospheric dimming
      roughness: 1.0,
      metalness: 0.0,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y   = -0.05   // fractionally below inner terrain
    mesh.receiveShadow = false   // outer ring is never close enough to cast visible shadows
    mesh.name = 'horizon-ground'
    this._scene.add(mesh)
    this._objects.push(mesh)
  }

  _buildBillboard() {
    // Cylinder with inward-facing faces so the camera (inside the cylinder)
    // sees the hills.  side = BackSide flips normals inward.
    const geo = new THREE.CylinderGeometry(
      BILLBOARD_R, BILLBOARD_R,
      BILLBOARD_H,
      128,     // segments around — high so hills look smooth
      4,       // height segments — enough for the vertex shader hills
      true,    // open-ended (no caps)
    )

    const mat = new THREE.ShaderMaterial({
      uniforms:    { sunElevation: { value: this._sunElevation } },
      vertexShader,
      fragmentShader,
      side:        THREE.BackSide,   // camera is inside the cylinder
      transparent: true,
      depthWrite:  false,
    })

    this._billboard = new THREE.Mesh(geo, mat)
    this._billboard.position.y = -5   // sink it so the base is below ground level
    this._billboard.renderOrder = 0
    this._billboard.name = 'horizon-billboard'
    this._scene.add(this._billboard)
    this._objects.push(this._billboard)
  }
}

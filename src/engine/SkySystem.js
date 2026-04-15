import * as THREE from 'three'
import { Sky }   from 'three/examples/jsm/objects/Sky.js'

// ── Time-of-day presets ───────────────────────────────────────────────────────
// Preetham sky model params + matching light + fog values for each moment.
const PRESETS = {
  sunset: {
    elevation:       6,         // degrees above horizon
    azimuth:         185,
    turbidity:       8,         // atmospheric haze (2=alpine clear, 20=smoggy)
    rayleigh:        4,         // Rayleigh scatter — drives blue sky & red/orange sunset
    mieCoefficient:  0.006,     // Mie scatter — overall milky haze
    mieDirectionalG: 0.85,      // Mie forward scatter — tightness of sun corona
    sunColor:        new THREE.Color(1.0, 0.52, 0.12),   // deep amber
    ambientColor:    new THREE.Color(0.26, 0.16, 0.20),  // dusky mauve
    ambientIntensity: 0.55,
    sunIntensity:    1.6,
    fogColor:        new THREE.Color(0.82, 0.38, 0.14),  // burnt sienna haze
    fogDensity:      0.0095,
    exposure:        0.5,
  },
  golden: {
    elevation:       18,
    azimuth:         195,
    turbidity:       6,
    rayleigh:        3.5,
    mieCoefficient:  0.005,
    mieDirectionalG: 0.80,
    sunColor:        new THREE.Color(1.0, 0.75, 0.28),   // golden
    ambientColor:    new THREE.Color(0.35, 0.24, 0.16),  // warmer shadow
    ambientIntensity: 0.9,
    sunIntensity:    2.2,
    fogColor:        new THREE.Color(0.90, 0.60, 0.30),  // golden haze
    fogDensity:      0.0075,
    exposure:        0.65,
  },
  noon: {
    elevation:       55,
    azimuth:         180,
    turbidity:       4,
    rayleigh:        2.5,
    mieCoefficient:  0.003,
    mieDirectionalG: 0.70,
    sunColor:        new THREE.Color(1.0, 0.97, 0.90),   // near-white warm
    ambientColor:    new THREE.Color(0.28, 0.38, 0.25),  // solarpunk green-sky
    ambientIntensity: 1.0,
    sunIntensity:    2.2,
    fogColor:        new THREE.Color(0.52, 0.70, 0.83),  // pale blue haze
    fogDensity:      0.006,
    exposure:        0.55,
  },
  overcast: {
    elevation:       45,
    azimuth:         180,
    turbidity:       18,
    rayleigh:        1.5,
    mieCoefficient:  0.05,
    mieDirectionalG: 0.55,
    sunColor:        new THREE.Color(0.85, 0.85, 0.90),  // cool diffuse
    ambientColor:    new THREE.Color(0.38, 0.38, 0.42),  // flat grey-blue
    ambientIntensity: 1.2,
    sunIntensity:    1.0,
    fogColor:        new THREE.Color(0.72, 0.73, 0.76),  // grey mist
    fogDensity:      0.012,
    exposure:        0.45,
  },
}

/**
 * SkySystem — Preetham sky model with Rayleigh + Mie atmospheric scattering.
 * Drives DirectionalLight position, color, and FogExp2 to match the sky.
 * OWNED BY: engine-agent
 *
 * Usage:
 *   const sky = new SkySystem(scene, renderer, sunLight, ambientLight)
 *   sky.applyPreset('sunset')          // snap to a preset
 *   sky.setSunAngle(12, 180)           // manually set elevation + azimuth
 */
export class SkySystem {
  /**
   * @param {THREE.Scene}            scene
   * @param {THREE.WebGLRenderer}    renderer
   * @param {THREE.DirectionalLight} sunLight
   * @param {THREE.AmbientLight}     ambientLight
   */
  constructor(scene, renderer, sunLight, ambientLight) {
    this._scene    = scene
    this._renderer = renderer
    this._sun      = sunLight
    this._ambient  = ambientLight
    this._sunDir   = new THREE.Vector3()

    this._sky = new Sky()
    this._sky.scale.setScalar(450000)
    scene.add(this._sky)

    // Sky shader writes to the scene background — remove any flat color
    scene.background = null

    // Sun disc mesh — GodRaysEffect light source anchor.
    // Small warm sphere. depthWrite:false so it doesn't corrupt depth buffer.
    const sunGeo = new THREE.SphereGeometry(6, 8, 8)
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false, depthWrite: false })
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat)
    scene.add(this._sunMesh)

    // Moon — opposite the sun, visible only at low sun elevations (dusk/dawn).
    const moonGeo = new THREE.SphereGeometry(4, 8, 8)
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xe8eeff, fog: false, depthWrite: false,
      transparent: true, opacity: 0,
    })
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat)
    scene.add(this._moonMesh)

    // Optional callback so PostFX can react to sun elevation changes
    // (e.g. fade god rays in/out). Set by Engine after PostFX is created.
    this.onElevationChange = null

    this.applyPreset('sunset')
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Snap to a named preset: 'sunset' | 'golden' | 'noon' | 'overcast'
   * @param {string} name
   */
  applyPreset(name) {
    const p = PRESETS[name]
    if (!p) { console.warn(`[SkySystem] Unknown preset "${name}"`) ; return }
    this._activePreset = name
    this._applyAll(p)
  }

  /**
   * Set sun by elevation + azimuth (degrees).
   * Lights and fog are interpolated between sunset ↔ noon presets.
   * @param {number} elevationDeg  0 = on horizon, 90 = zenith
   * @param {number} azimuthDeg   compass bearing (180 = south)
   */
  setSunAngle(elevationDeg, azimuthDeg = 180) {
    this._updateSkyUniforms(this._blendPresets(elevationDeg))
    this._moveSun(elevationDeg, azimuthDeg)
    this._interpolateLights(elevationDeg)
    this._interpolateFog(elevationDeg)
    this._interpolateExposure(elevationDeg)
  }

  /** Three.js Sky mesh (scene background shader). */
  get mesh() { return this._sky }

  /**
   * Enable or disable the dynamic Preetham sky shader.
   * When disabled the Sky/sun/moon meshes are hidden and the scene uses a
   * plain dark-teal background — cheaper for low-end hardware.
   * Lighting is frozen at the golden preset when off.
   * @param {boolean} enabled
   */
  setDynamic(enabled) {
    this._sky.visible      = enabled
    this._sunMesh.visible  = enabled
    this._moonMesh.visible = enabled
    if (enabled) {
      this._scene.background = null
    } else {
      this._scene.background = new THREE.Color(0x1a3a2a)
      // Apply a fixed mid-day lighting so the world stays readable
      this._interpolateLights(30)
      this._interpolateFog(30)
      this._interpolateExposure(30)
    }
  }

  /** Warm sphere used by GodRaysEffect as the light source anchor. */
  get sunMesh() { return this._sunMesh }

  /** Moon mesh — blue-white, fades in at low sun elevation. */
  get moonMesh() { return this._moonMesh }

  dispose() {
    for (const obj of [this._sky, this._sunMesh, this._moonMesh]) {
      this._scene.remove(obj)
      obj.geometry.dispose()
      obj.material.dispose()
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _applyAll(p) {
    this._updateSkyUniforms(p)
    this._moveSun(p.elevation, p.azimuth)
    this._sun.color.copy(p.sunColor)
    this._sun.intensity      = p.sunIntensity
    this._ambient.color.copy(p.ambientColor)
    this._ambient.intensity  = p.ambientIntensity
    this._scene.fog          = new THREE.FogExp2(p.fogColor.clone(), p.fogDensity)
    this._renderer.toneMappingExposure = p.exposure
  }

  _updateSkyUniforms({ turbidity, rayleigh, mieCoefficient, mieDirectionalG }) {
    const u = this._sky.material.uniforms
    u['turbidity'].value       = turbidity
    u['rayleigh'].value        = rayleigh
    u['mieCoefficient'].value  = mieCoefficient
    u['mieDirectionalG'].value = mieDirectionalG
  }

  _moveSun(elevationDeg, azimuthDeg) {
    const phi   = THREE.MathUtils.degToRad(90 - elevationDeg)
    const theta = THREE.MathUtils.degToRad(azimuthDeg)
    this._sunDir.setFromSphericalCoords(1, phi, theta)
    this._sky.material.uniforms['sunPosition'].value.copy(this._sunDir)
    this._sun.position.copy(this._sunDir).multiplyScalar(200)
    this._sunMesh.position.copy(this._sunDir).multiplyScalar(390)

    // Moon sits opposite the sun — always at least 20° above horizon
    const moonDir = this._sunDir.clone().negate()
    moonDir.y = Math.max(moonDir.y, 0.35)
    moonDir.normalize()
    this._moonMesh.position.copy(moonDir).multiplyScalar(380)

    // Moon fades in as sun gets low (fully visible below 15°, gone above 30°)
    this._moonMesh.material.opacity = 1 - THREE.MathUtils.clamp((elevationDeg - 15) / 15, 0, 1)

    // Sun disc colour shifts: cool white at noon → warm amber at sunset
    const t = THREE.MathUtils.clamp((elevationDeg - 6) / 49, 0, 1)
    this._sunMesh.material.color.setRGB(1.0, 0.88 + 0.10 * t, 0.55 + 0.40 * t)

    this.onElevationChange?.(elevationDeg)
  }

  /**
   * Linear blend of sunset (elev=6) ↔ noon (elev=55) preset values.
   * Returns a partial preset object suitable for _updateSkyUniforms.
   */
  _blendPresets(elevDeg) {
    const t  = Math.max(0, Math.min(1, (elevDeg - 6) / 49))  // 0 at sunset, 1 at noon
    const ps = PRESETS.sunset
    const pn = PRESETS.noon
    return {
      turbidity:       ps.turbidity      + (pn.turbidity      - ps.turbidity)      * t,
      rayleigh:        ps.rayleigh       + (pn.rayleigh        - ps.rayleigh)       * t,
      mieCoefficient:  ps.mieCoefficient + (pn.mieCoefficient  - ps.mieCoefficient) * t,
      mieDirectionalG: ps.mieDirectionalG + (pn.mieDirectionalG - ps.mieDirectionalG) * t,
    }
  }

  _interpolateLights(elevDeg) {
    const t  = Math.max(0, Math.min(1, (elevDeg - 6) / 49))
    const ps = PRESETS.sunset
    const pn = PRESETS.noon
    this._sun.color.lerpColors(ps.sunColor, pn.sunColor, t)
    this._sun.intensity = ps.sunIntensity + (pn.sunIntensity - ps.sunIntensity) * t
    this._ambient.color.lerpColors(ps.ambientColor, pn.ambientColor, t)
    this._ambient.intensity = ps.ambientIntensity + (pn.ambientIntensity - ps.ambientIntensity) * t
  }

  _interpolateFog(elevDeg) {
    const t  = Math.max(0, Math.min(1, (elevDeg - 6) / 49))
    const ps = PRESETS.sunset
    const pn = PRESETS.noon
    if (!this._scene.fog) this._scene.fog = new THREE.FogExp2(0x000000, 0.008)
    this._scene.fog.color.lerpColors(ps.fogColor, pn.fogColor, t)
    this._scene.fog.density = ps.fogDensity + (pn.fogDensity - ps.fogDensity) * t
  }

  _interpolateExposure(elevDeg) {
    const t  = Math.max(0, Math.min(1, (elevDeg - 6) / 49))
    const ps = PRESETS.sunset
    const pn = PRESETS.noon
    this._renderer.toneMappingExposure = ps.exposure + (pn.exposure - ps.exposure) * t
  }
}

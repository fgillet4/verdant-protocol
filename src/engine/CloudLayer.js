import * as THREE from 'three'

const CLOUD_Y       = 90    // world units above ground
const CLOUD_EXTENT  = 1800  // plane half-size — large enough to fill the horizon

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float time;
  uniform float sunElevation;   // degrees, 4–55
  varying vec2 vUv;

  // ── Noise helpers ──────────────────────────────────────────────────────────
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),               hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * vnoise(p); p *= 2.02;
    f += 0.2500 * vnoise(p); p *= 2.01;
    f += 0.1250 * vnoise(p); p *= 2.03;
    f += 0.0625 * vnoise(p); p *= 2.01;
    f += 0.0312 * vnoise(p);
    return f / 0.9687;
  }
  // ── End noise ──────────────────────────────────────────────────────────────

  void main() {
    // Two scrolling cloud layers at different speeds — gives natural parallax
    vec2 uv1 = vUv * 4.0  + vec2(time * 0.018,  time * 0.005);
    vec2 uv2 = vUv * 2.2  + vec2(time * 0.009, -time * 0.004);

    float c1 = fbm(uv1);
    float c2 = fbm(uv2);
    float cloud = c1 * 0.6 + c2 * 0.4;

    // Soft shape — threshold controls coverage (~45% sky cover)
    cloud = smoothstep(0.46, 0.68, cloud);

    // Radial edge fade so the plane boundary is never visible
    float edgeDist = length(vUv - 0.5) * 2.0;
    cloud *= 1.0 - smoothstep(0.60, 1.0, edgeDist);

    // ── Colour ─────────────────────────────────────────────────────────────
    // sunT: 0 at sunrise/sunset (elev 6°), 1 at noon (55°)
    float sunT = clamp((sunElevation - 6.0) / 49.0, 0.0, 1.0);

    // Top / lit face colours
    vec3 dayTop     = vec3(1.00, 0.99, 0.97);          // off-white
    vec3 sunsetTop  = vec3(1.00, 0.58, 0.22);          // burnt orange
    vec3 topColor   = mix(sunsetTop, dayTop,  sunT);

    // Underside — always a shade darker / cooler
    vec3 dayBot     = vec3(0.72, 0.75, 0.80);          // cool grey-blue
    vec3 sunsetBot  = vec3(0.60, 0.28, 0.12);          // dark russet
    vec3 botColor   = mix(sunsetBot, dayBot,  sunT);

    // Blend top/bottom using a warped version of the cloud shape
    float shade = mix(0.0, 1.0, smoothstep(0.3, 0.7, c1));
    vec3 cloudColor = mix(botColor, topColor, shade);

    gl_FragColor = vec4(cloudColor, cloud * 0.82);
  }
`

/**
 * CloudLayer — procedural FBM cloud plane above the world.
 * Two scrolling noise layers for parallax drift.
 * Cloud colour automatically tints warm orange at sunset, white at noon.
 * OWNED BY: engine-agent
 *
 * Usage:
 *   const clouds = new CloudLayer(scene)
 *   // In game loop or DayCycle callback:
 *   clouds.update(delta, sunElevation)
 */
export class CloudLayer {
  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this._scene = scene

    const geo = new THREE.PlaneGeometry(CLOUD_EXTENT, CLOUD_EXTENT, 1, 1)
    geo.rotateX(-Math.PI / 2)

    this._mat = new THREE.ShaderMaterial({
      uniforms: {
        time:         { value: 0 },
        sunElevation: { value: 18 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite:  false,
      fog:         false,     // clouds handle their own edge fade
      side:        THREE.DoubleSide,
    })

    this._mesh = new THREE.Mesh(geo, this._mat)
    this._mesh.position.y = CLOUD_Y
    this._mesh.renderOrder = 1   // after sky, before opaque geo
    scene.add(this._mesh)
  }

  /**
   * @param {number} delta        — seconds since last frame
   * @param {number} sunElevation — degrees (from SkySystem / DayCycle)
   */
  update(delta, sunElevation) {
    this._mat.uniforms.time.value         += delta
    this._mat.uniforms.sunElevation.value  = sunElevation
  }

  dispose() {
    this._scene.remove(this._mesh)
    this._mesh.geometry.dispose()
    this._mat.dispose()
  }
}

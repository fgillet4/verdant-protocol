import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SMAAPass }        from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'

/**
 * PostFX — post-processing pipeline using THREE.js's own EffectComposer.
 *
 * Switched from the `postprocessing` npm package (v6.39) which has a
 * DepthTexture.clone() Source-sharing bug with Three.js r160+ that causes
 * GL_INVALID_OPERATION: glBlitFramebuffer every frame.
 *
 * Pass order:
 *   RenderPass        → scene into HalfFloat buffer
 *   UnrealBloomPass   → luminance-threshold bloom (sun disc halo)
 *   SMAAPass          → edge anti-aliasing
 *   OutputPass        → tone-map + sRGB encode → screen
 *
 * OWNED BY: engine-agent
 */
export class PostFX {
  /**
   * @param {THREE.WebGLRenderer}     renderer
   * @param {THREE.Scene}             scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(renderer, scene, camera) {
    this._renderer = renderer
    this._camera   = camera

    const { width, height } = renderer.getDrawingBufferSize(new THREE.Vector2())

    // fp16 render target — needed so bloom can capture values > 1
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type:          THREE.HalfFloatType,
      depthBuffer:   true,
      stencilBuffer: false,
    })
    this._composer = new EffectComposer(renderer, rt)

    // ── Pass 1: render scene ───────────────────────────────────────────────
    this._composer.addPass(new RenderPass(scene, camera))

    // ── Pass 2: bloom ─────────────────────────────────────────────────────
    // strength drives halo brightness — lower than before because fp16 is
    // linear and values are already amplified by ACES on the renderer.
    // threshold 0.97 → only the sun disc (>>1) blooms, not regular sky.
    this._bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      /* strength   */ 0.6,
      /* radius     */ 0.5,
      /* threshold  */ 0.97,
    )
    this._composer.addPass(this._bloom)

    // ── Pass 3: SMAA anti-aliasing ─────────────────────────────────────────
    const smaa = new SMAAPass(width, height)
    this._composer.addPass(smaa)

    // ── Pass 4: tone-map + sRGB output to screen ───────────────────────────
    // OutputPass applies renderer.toneMapping (ACES set in Engine.js) and
    // encodes to sRGB for display.
    this._composer.addPass(new OutputPass())
  }

  /** Called instead of renderer.render() each frame. */
  render(delta) {
    this._composer.render(delta)
  }

  /** Call on canvas resize. */
  resize(width, height) {
    this._composer.setSize(width, height)
    this._bloom.setSize(width, height)
  }

  /**
   * Adjust bloom strength at runtime — driven by sun elevation.
   * Sunset: stronger (1.0), noon: subtler (0.3).
   * @param {number} intensity
   */
  setBloomIntensity(intensity) {
    this._bloom.strength = intensity
  }

  /** No-op — kept so Engine.js callers don't break. */
  setGodRaysWeight(_weight) {}

  dispose() {
    this._composer.dispose()
  }
}

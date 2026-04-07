import * as THREE          from 'three'
import { ClickRaycaster }  from './ClickRaycaster.js'

// Camera orbit constants
const CAM_RADIUS_INIT = 25         // starting distance from player
const CAM_RADIUS_MIN  = 6          // max zoom in
const CAM_RADIUS_MAX  = 60         // max zoom out
const CAM_ZOOM_SPEED  = 0.04       // fraction of radius per scroll tick
const CAM_SPEED       = 1.3        // radians / sec (peak velocity)
const CAM_SMOOTH      = 10         // velocity lerp rate — higher = snappier
const CAM_PHI_MIN     = 0.18       // max tilt up  (~10°)
const CAM_PHI_MAX     = 1.45       // max tilt down (~83°)
const CAM_PHI_INIT    = Math.PI / 4 // 45° — matches original offset

/**
 * Engine — Three.js renderer, scene, camera, lighting, and camera follow.
 * WASD orbits the camera around the follow target.
 * Click raycasting delegated to ClickRaycaster.
 * OWNED BY: engine-agent
 */
export class Engine {
  constructor(container) {
    this.container = container

    // ── Renderer ────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    // ── Scene ────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a2e1a)
    this.scene.fog = new THREE.Fog(0x1a2e1a, 40, 120)

    // ── Camera ───────────────────────────────────────────────────────────────
    const aspect = container.clientWidth / container.clientHeight
    this.camera  = new THREE.PerspectiveCamera(45, aspect, 0.1, 500)

    this._cameraTarget = new THREE.Vector3()
    this._cameraOffset = new THREE.Vector3()

    // Spherical orbit state
    this._camRadius       = CAM_RADIUS_INIT
    this._camRadiusTarget = CAM_RADIUS_INIT
    this._camTheta    = 0              // yaw — horizontal angle around target
    this._camPhi      = CAM_PHI_INIT   // pitch — vertical angle from top
    this._camThetaVel = 0              // smoothed angular velocity (rad/s)
    this._camPhiVel   = 0
    this._orbiting    = false
    this._orbitLast   = { x: 0, y: 0 }

    this._updateCameraOffset()
    this.camera.position.copy(this._cameraOffset)
    this.camera.lookAt(0, 0, 0)

    // ── Key tracking ─────────────────────────────────────────────────────────
    this._keys = new Set()
    const _arrowMap = { arrowleft:'a', arrowright:'d', arrowup:'w', arrowdown:'s' }
    window.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const key = _arrowMap[e.key.toLowerCase()] ?? e.key.toLowerCase()
      if (key in { a:1,d:1,w:1,s:1 } && e.key.startsWith('Arrow')) e.preventDefault()
      this._keys.add(key)
    })
    window.addEventListener('keyup', e => {
      const key = _arrowMap[e.key.toLowerCase()] ?? e.key.toLowerCase()
      this._keys.delete(key)
    })

    // ── Lighting ─────────────────────────────────────────────────────────────
    this._buildLighting()

    // ── Raycaster (click-to-move + enemy targeting) ──────────────────────────
    this._raycaster = new ClickRaycaster(this.renderer, this.camera)

    this.renderer.domElement.addEventListener('wheel',       e => this._onScroll(e), { passive: true })
    this.renderer.domElement.addEventListener('pointerdown', e => this._onMiddleDown(e))
    window.addEventListener('pointermove', e => this._onMiddleMove(e))
    window.addEventListener('pointerup',   e => this._onMiddleUp(e))
    window.addEventListener('resize', () => this._onResize())
  }

  _buildLighting() {
    this.scene.add(new THREE.AmbientLight(0x4a6741, 0.8))

    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0)
    sun.position.set(30, 50, 20)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near   = 0.5
    sun.shadow.camera.far    = 200
    sun.shadow.camera.left   = -60
    sun.shadow.camera.right  = 60
    sun.shadow.camera.top    = 60
    sun.shadow.camera.bottom = -60
    sun.shadow.bias = -0.0005
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0x7ab8e8, 0.4)
    fill.position.set(-20, 10, -30)
    this.scene.add(fill)
  }

  // ── Raycaster proxy (unchanged API) ───────────────────────────────────────
  addWalkableMesh(mesh) {
    this._walkable = this._walkable ?? []
    this._walkable.push(...(Array.isArray(mesh) ? mesh : [mesh]))
    this._raycaster.addWalkable(mesh)
  }
  addInteractableMesh(obj, id, type, label, meta)  { this._raycaster.addInteractable(obj, id, type, label, meta) }
  removeInteractableMesh(id)                       { this._raycaster.removeInteractable(id) }
  /** Provide player ref so ClickRaycaster can colour enemy tooltips by relative level. */
  setPlayerRef(player)                             { this._raycaster.setPlayerRef(player) }

  /**
   * Raycast against walkable ground from screen coordinates.
   * Used by Construction placement mode to position ghost mesh.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {THREE.Vector3|null}
   */
  raycastGround(clientX, clientY) {
    if (!this._walkable?.length) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    this._groundRc = this._groundRc ?? new THREE.Raycaster()
    this._groundRc.setFromCamera(mouse, this.camera)
    const hits = this._groundRc.intersectObjects(this._walkable, true)
    return hits.length > 0 ? hits[0].point.clone() : null
  }

  // ── Camera follow + orbit ─────────────────────────────────────────────────

  /** Current camera horizontal azimuth in radians. Used by Minimap compass. */
  get camTheta() { return this._camTheta }

  /** @param {THREE.Object3D} target */
  followTarget(target) { this._followTarget = target }

  /** Called by GameLoop every frame. @param {number} delta */
  update(delta) {
    this._handleCameraKeys(delta)

    // Smooth zoom — lerp actual radius toward scroll target
    if (Math.abs(this._camRadiusTarget - this._camRadius) > 0.01) {
      this._camRadius += (this._camRadiusTarget - this._camRadius) * Math.min(delta * 8, 1)
      this._updateCameraOffset()
    }

    if (this._followTarget) {
      this._cameraTarget.lerp(this._followTarget.position, Math.min(delta * 8, 1))
      this.camera.position.copy(this._cameraTarget).add(this._cameraOffset)
      this.camera.lookAt(this._cameraTarget)
    }

    this.renderer.render(this.scene, this.camera)
  }

  _handleCameraKeys(delta) {
    const k = this._keys
    const thetaTarget = ((k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)) * CAM_SPEED
    const phiTarget   = ((k.has('s') ? 1 : 0) - (k.has('w') ? 1 : 0)) * CAM_SPEED

    const t = Math.min(CAM_SMOOTH * delta, 1)
    this._camThetaVel += (thetaTarget - this._camThetaVel) * t
    this._camPhiVel   += (phiTarget   - this._camPhiVel)   * t

    this._camTheta += this._camThetaVel * delta
    this._camPhi    = Math.max(CAM_PHI_MIN, Math.min(CAM_PHI_MAX, this._camPhi + this._camPhiVel * delta))

    if (Math.abs(this._camThetaVel) > 0.0005 || Math.abs(this._camPhiVel) > 0.0005) {
      this._updateCameraOffset()
    }
  }

  _onMiddleDown(e) {
    if (e.button !== 1) return
    e.preventDefault()
    this._orbiting  = true
    this._orbitLast = { x: e.clientX, y: e.clientY }
    this.renderer.domElement.style.cursor = 'grabbing'
  }

  _onMiddleMove(e) {
    if (!this._orbiting) return
    const dx = e.clientX - this._orbitLast.x
    const dy = e.clientY - this._orbitLast.y
    this._orbitLast = { x: e.clientX, y: e.clientY }

    const sensitivity = 0.005
    this._camTheta += dx * sensitivity
    this._camPhi    = Math.max(CAM_PHI_MIN, Math.min(CAM_PHI_MAX, this._camPhi + dy * sensitivity))
    this._updateCameraOffset()
  }

  _onMiddleUp(e) {
    if (e.button !== 1) return
    this._orbiting = false
    this.renderer.domElement.style.cursor = ''
  }

  _onScroll(e) {
    const dir = e.deltaY > 0 ? 1 : -1   // 1 = scroll down = zoom out
    this._camRadiusTarget = Math.max(CAM_RADIUS_MIN,
      Math.min(CAM_RADIUS_MAX, this._camRadiusTarget * (1 + dir * CAM_ZOOM_SPEED)))
  }

  /** Recompute the cartesian offset from spherical (theta, phi, radius). */
  _updateCameraOffset() {
    const r = this._camRadius
    this._cameraOffset.set(
      r * Math.sin(this._camPhi) * Math.sin(this._camTheta),
      r * Math.cos(this._camPhi),
      r * Math.sin(this._camPhi) * Math.cos(this._camTheta),
    )
  }

  _onResize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  dispose() {
    this.renderer.dispose()
    window.removeEventListener('resize', this._onResize)
  }
}

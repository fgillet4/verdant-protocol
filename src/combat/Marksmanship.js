/**
 * Marksmanship — ranged combat system.
 * Takes over player's outgoing damage from CombatManager when combatStyle = 'marksmanship'.
 * 900ms tick, 14-unit range, projectile visuals, 4 abilities.
 * OWNED BY: combat-agent
 */
import * as THREE      from 'three'
import { bus }         from '../utils/EventBus.js'
import { DamageCalc }  from './DamageCalc.js'

const RANGED_TICK_MS  = 900
const RANGED_RANGE    = 14    // max attack distance
const SNIPE_RANGE     = 20

const ABILITY_CD = {
  piercingShot: 5_000,
  volley:       8_000,
  eagleEye:    12_000,
  snipe:       15_000,
}

export class Marksmanship {
  /**
   * @param {import('../player/Player.js').Player}             player
   * @param {import('./CombatManager.js').CombatManager}       combat
   * @param {THREE.Scene}                                       scene
   */
  constructor(player, combat, scene) {
    this._player  = player
    this._combat  = combat
    this._scene   = scene

    this._targetId   = null
    this._tickAccum  = 0
    this._active     = false   // true when we own the player→target pair

    /** @type {{ mesh: THREE.Mesh, to: THREE.Vector3, t: number }[]} */
    this._projectiles = []

    /** cooldown end timestamps */
    this._cd = { piercingShot: 0, volley: 0, eagleEye: 0, snipe: 0 }

    /** Eagle Eye buff — next shot is guaranteed crit */
    this._eagleEyeActive = false

    bus.on('player:attack-target', ({ targetId }) => this._onAttackTarget(targetId))
    bus.on('combat:death',         ({ entityId }) => { if (entityId === this._targetId) this._stop() })
    bus.on('equipment:changed',    ({ slot })     => { if (slot === 'weapon') this._onWeaponChange() })
    bus.on('marksmanship:ability', ({ id })       => this._useAbility(id))
  }

  // ── Game loop ─────────────────────────────────────────────────────────────

  /** @param {number} delta seconds */
  update(delta) {
    this._updateProjectiles(delta)

    if (!this._active || !this._targetId) return

    // Disengage if style changed away from marksmanship
    if ((this._player.stats.combatStyle ?? '') !== 'marksmanship') { this._stop(); return }

    const target = this._combat.getEntity(this._targetId)
    if (!target || target.stats.hp <= 0) { this._stop(); return }

    this._tickAccum += delta * 1000
    if (this._tickAccum < RANGED_TICK_MS) return
    this._tickAccum -= RANGED_TICK_MS

    const dist = this._player.position.distanceTo(target.object?.position ?? this._player.position)
    if (dist > RANGED_RANGE) return   // too far — keep accumulating until in range

    this._fireShot(target)
  }

  // ── Attack initiation ─────────────────────────────────────────────────────

  _onAttackTarget(targetId) {
    if (this._player.stats.combatStyle !== 'marksmanship') return

    const target = this._combat.getEntity(targetId)
    if (!target) return

    // Stop previous target's pair if different
    if (this._targetId && this._targetId !== targetId) this._stop()

    this._targetId  = targetId
    this._tickAccum = RANGED_TICK_MS * 0.5   // first shot after half a tick (responsive feel)
    this._active    = true

    // Take over player→target from CombatManager
    this._combat.removeAttackPair('player', targetId)

    // CombatManager still handles target→player (melee, if drone closes distance)
    this._combat._addPair(targetId, 'player')
  }

  _stop() {
    this._targetId  = null
    this._active    = false
    this._tickAccum = 0
  }

  _onWeaponChange() {
    if (this._player.stats.combatStyle !== 'marksmanship') this._stop()
  }

  // ── Abilities ─────────────────────────────────────────────────────────────

  _useAbility(id) {
    if (!this._targetId || !this._active) return
    const now = Date.now()
    if (now < (this._cd[id] ?? 0)) return

    const target = this._combat.getEntity(this._targetId)
    if (!target || target.stats.hp <= 0) return

    const dist = this._player.position.distanceTo(target.object?.position ?? this._player.position)

    switch (id) {
      case 'piercingShot':
        if (dist > RANGED_RANGE) { this._status('Too far for Piercing Shot.'); return }
        this._fireShot(target, { ignoreDefense: true, damageMultiplier: 1.6, color: 0xffffff })
        this._status('Piercing Shot!')
        break

      case 'volley': {
        if (dist > RANGED_RANGE) { this._status('Too far for Volley.'); return }
        const delays = [0, 150, 300]
        delays.forEach((ms, i) => setTimeout(() => {
          const t = this._combat.getEntity(this._targetId)
          if (t && t.stats.hp > 0) this._fireShot(t, { damageMultiplier: 0.7, color: 0xffcc02 })
        }, ms))
        this._status('Volley!')
        break
      }

      case 'eagleEye':
        this._eagleEyeActive = true
        this._status('Eagle Eye — next shot crits!')
        // Will be consumed on next auto-attack via _applyEagleEye
        setTimeout(() => { this._eagleEyeActive = false }, 10_000)
        break

      case 'snipe':
        if (dist > SNIPE_RANGE) { this._status('Target out of snipe range.'); return }
        this._fireShot(target, { damageMultiplier: 2.5, color: 0xff4444 })
        this._combat.addDoT(this._targetId, 4, 4)   // bleed: 4 dmg × 4 ticks
        this._status('Snipe! Target is bleeding.')
        break

      default: return
    }

    this._cd[id] = now + ABILITY_CD[id]
    bus.emit('marksmanship:ability-used', { id, cdMs: ABILITY_CD[id] })
  }

  /** Apply Eagle Eye buff to next auto-attack */
  _fireShot(target, opts = {}) {
    if (this._eagleEyeActive && !opts.damageMultiplier) {
      opts = { ...opts, ignoreDefense: true, damageMultiplier: 3.0 }
      this._eagleEyeActive = false
    }
    const damage = DamageCalc.roll(this._player, target, opts)
    target.stats.hp = Math.max(0, target.stats.hp - damage)
    bus.emit('combat:tick', {
      attackerId: 'player', targetId: this._targetId,
      damage, type: 'marksmanship',
      targetPos: target.object?.position,
    })
    this._spawnProjectile(
      this._player.position.clone().setY(1.2),
      (target.object?.position ?? this._player.position).clone().setY(1.0),
      opts.color ?? 0x76ff03,
    )
    if (target.stats.hp <= 0) bus.emit('combat:death', { entityId: this._targetId })
  }

  // ── Projectiles ───────────────────────────────────────────────────────────

  _spawnProjectile(from, to, color = 0x76ff03) {
    const mat  = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.0 })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat)
    mesh.position.copy(from)
    this._scene.add(mesh)
    this._projectiles.push({ mesh, from: from.clone(), to: to.clone(), t: 0 })
  }

  _updateProjectiles(delta) {
    const SPEED = 18   // units/sec
    const done  = []
    for (const p of this._projectiles) {
      const totalDist = p.from.distanceTo(p.to)
      p.t += (delta * SPEED) / Math.max(totalDist, 0.01)
      p.mesh.position.lerpVectors(p.from, p.to, Math.min(p.t, 1))
      if (p.t >= 1) done.push(p)
    }
    for (const p of done) {
      this._scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      p.mesh.material.dispose()
    }
    this._projectiles = this._projectiles.filter(p => !done.includes(p))
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _status(text) {
    bus.emit('ui:examine', { text })
  }

  /** Cooldown remaining for an ability (0 = ready). */
  cdRemaining(id) { return Math.max(0, (this._cd[id] ?? 0) - Date.now()) }

  get isActive()   { return this._active }
  get targetId()   { return this._targetId }
}

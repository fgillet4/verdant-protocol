/**
 * BiomeState — circular health zones scattered across the world.
 * healthAt(pos) returns 0-100 for attunement recharge rate.
 * Damaged zones (extraction sites) return < 30 — no recharge there.
 *
 * Structure: { name, cx, cz, radius, health }
 *   cx/cz   — world-space centre coords
 *   radius  — zone radius in metres
 *   health  — base health 0-100
 */
export const BIOME_ZONES = [
  { name: 'Central Grove',      cx:   0, cz:   0, radius: 18, health: 80 },
  { name: 'Ancient Oak Ring',   cx:  22, cz: -18, radius: 14, health: 90 },
  { name: 'Moss Basin',         cx: -20, cz:  16, radius: 12, health: 85 },
  { name: 'Extraction Site α',  cx:  26, cz:  22, radius:  8, health: 20 },
  { name: 'Smog Hollow',        cx: -26, cz: -20, radius:  9, health: 15 },
]

/**
 * BiomeState — manages runtime health (can be damaged by events).
 * OWNED BY: world-agent
 */
export class BiomeState {
  constructor() {
    /** Runtime mutable health per zone (0-100) */
    this._health = BIOME_ZONES.map(z => z.health)
  }

  /**
   * Returns biome health 0-100 at world position.
   * Uses the highest-health overlapping zone (zones stack positively).
   * Returns 0 if outside all zones.
   * @param {{ x: number, z: number }} pos
   * @returns {number} 0-100
   */
  healthAt(pos) {
    let best = 0
    for (let i = 0; i < BIOME_ZONES.length; i++) {
      const z = BIOME_ZONES[i]
      const dx = pos.x - z.cx
      const dz = pos.z - z.cz
      if (dx * dx + dz * dz <= z.radius * z.radius) {
        best = Math.max(best, this._health[i])
      }
    }
    return best
  }

  /**
   * Damage a zone by name (e.g. from world events, boss actions).
   * @param {string} name @param {number} amount
   */
  damageZone(name, amount) {
    const idx = BIOME_ZONES.findIndex(z => z.name === name)
    if (idx !== -1) this._health[idx] = Math.max(0, this._health[idx] - amount)
  }

  /**
   * Heal a zone (players can restore biomes via ecology actions).
   * @param {string} name @param {number} amount
   */
  healZone(name, amount) {
    const idx = BIOME_ZONES.findIndex(z => z.name === name)
    if (idx !== -1) this._health[idx] = Math.min(100, this._health[idx] + amount)
  }

  /** @returns {Array<{ name: string, health: number, cx: number, cz: number, radius: number }>} */
  getAll() {
    return BIOME_ZONES.map((z, i) => ({ ...z, health: this._health[i] }))
  }
}

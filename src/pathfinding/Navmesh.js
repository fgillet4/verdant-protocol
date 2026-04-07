import * as THREE from 'three'

/**
 * A single convex polygon in the navmesh.
 */
export class NavPoly {
  /**
   * @param {number} id
   * @param {THREE.Vector3[]} vertices  — ordered vertices of the convex polygon
   */
  constructor(id, vertices) {
    this.id = id
    this.vertices = vertices
    /** @type {NavPoly[]} */
    this.neighbours = []
    /** @type {boolean} — false when an obstacle occupies this cell */
    this.walkable = true

    // Precompute centroid
    this.centroid = new THREE.Vector3()
    for (const v of vertices) this.centroid.add(v)
    this.centroid.divideScalar(vertices.length)
  }

  /**
   * Returns true if the XZ projection of point is inside this polygon.
   * Uses winding-number test.
   * @param {THREE.Vector3} point
   */
  containsPoint(point) {
    const verts = this.vertices
    const n = verts.length
    let inside = false
    let j = n - 1
    for (let i = 0; i < n; i++) {
      const xi = verts[i].x, zi = verts[i].z
      const xj = verts[j].x, zj = verts[j].z
      const intersect = ((zi > point.z) !== (zj > point.z)) &&
        (point.x < (xj - xi) * (point.z - zi) / (zj - zi) + xi)
      if (intersect) inside = !inside
      j = i
    }
    return inside
  }

  /**
   * Returns the closest point on this polygon's boundary to the given point (XZ).
   * @param {THREE.Vector3} point
   * @returns {THREE.Vector3}
   */
  closestPointOnBoundary(point) {
    let best = null
    let bestDist = Infinity
    const n = this.vertices.length
    for (let i = 0; i < n; i++) {
      const a = this.vertices[i]
      const b = this.vertices[(i + 1) % n]
      const pt = closestPointOnSegment(point, a, b)
      const d = pt.distanceToSquared(point)
      if (d < bestDist) { bestDist = d; best = pt }
    }
    return best
  }
}

/** @param {THREE.Vector3} p @param {THREE.Vector3} a @param {THREE.Vector3} b */
function closestPointOnSegment(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a)
  const ap = new THREE.Vector3().subVectors(p, a)
  const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)))
  return new THREE.Vector3().addVectors(a, ab.multiplyScalar(t))
}

/**
 * Navmesh — a graph of convex polygons.
 * For now built manually/procedurally.
 * TODO: replace with Recast/Detour WASM for production.
 */
export class Navmesh {
  constructor() {
    /** @type {NavPoly[]} */
    this.polygons = []
  }

  /** @param {NavPoly} poly */
  addPolygon(poly) {
    this.polygons.push(poly)
  }

  /**
   * Connect two polygons as neighbours (bidirectional).
   * @param {number} idA @param {number} idB
   */
  connect(idA, idB) {
    const a = this.polygons[idA]
    const b = this.polygons[idB]
    if (!a || !b) return
    if (!a.neighbours.includes(b)) a.neighbours.push(b)
    if (!b.neighbours.includes(a)) b.neighbours.push(a)
  }

  /**
   * Find which polygon contains this world point.
   * Falls back to nearest centroid if none contains it.
   * @param {THREE.Vector3} point
   * @returns {NavPoly|null}
   */
  polyAt(point) {
    for (const poly of this.polygons) {
      if (poly.containsPoint(point)) return poly
    }
    // fallback: nearest centroid
    let nearest = null, nearestDist = Infinity
    for (const poly of this.polygons) {
      const d = poly.centroid.distanceToSquared(point)
      if (d < nearestDist) { nearestDist = d; nearest = poly }
    }
    return nearest
  }

  /**
   * Like polyAt, but always returns a walkable polygon.
   * If the polygon under `point` is non-walkable, returns the closest
   * walkable neighbour (by centroid distance). Falls back to a global
   * nearest-walkable search if no walkable neighbour exists.
   * @param {THREE.Vector3} point
   * @returns {NavPoly|null}
   */
  nearestWalkablePoly(point) {
    const poly = this.polyAt(point)
    if (!poly || poly.walkable) return poly

    // Try neighbours first (cheap, usually sufficient)
    let best = null, bestDist = Infinity
    for (const n of poly.neighbours) {
      if (!n.walkable) continue
      const d = n.centroid.distanceToSquared(point)
      if (d < bestDist) { bestDist = d; best = n }
    }
    if (best) return best

    // Full search fallback
    for (const p of this.polygons) {
      if (!p.walkable) continue
      const d = p.centroid.distanceToSquared(point)
      if (d < bestDist) { bestDist = d; best = p }
    }
    return best
  }

  /**
   * Mark the polygon(s) under a world position as non-walkable.
   * Call this after placing any solid obstacle (tree, rock, bench, ore node).
   * @param {THREE.Vector3} position — world-space position of the obstacle
   */
  blockAt(position) {
    const poly = this.polyAt(position)
    if (poly) poly.walkable = false
  }

  /**
   * Build a simple flat grid navmesh for the starter zone.
   * Each cell is a quad split into a NavPoly.
   * @param {number} width — world units
   * @param {number} depth
   * @param {number} cellSize
   */
  static buildGrid(width, depth, cellSize) {
    const nm = new Navmesh()
    const cols = Math.floor(width / cellSize)
    const rows = Math.floor(depth / cellSize)
    const ox = -width / 2
    const oz = -depth / 2

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = ox + c * cellSize
        const z0 = oz + r * cellSize
        const x1 = x0 + cellSize
        const z1 = z0 + cellSize
        const id = r * cols + c
        const poly = new NavPoly(id, [
          new THREE.Vector3(x0, 0, z0),
          new THREE.Vector3(x1, 0, z0),
          new THREE.Vector3(x1, 0, z1),
          new THREE.Vector3(x0, 0, z1),
        ])
        nm.addPolygon(poly)
      }
    }

    // Connect neighbours (cardinal directions)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c
        if (c + 1 < cols) nm.connect(id, id + 1)        // right
        if (r + 1 < rows) nm.connect(id, id + cols)     // down
        if (c + 1 < cols && r + 1 < rows) {             // diagonal
          nm.connect(id, id + cols + 1)
          nm.connect(id + 1, id + cols)
        }
      }
    }

    return nm
  }
}

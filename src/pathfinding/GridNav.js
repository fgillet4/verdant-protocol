import * as THREE from 'three'

/**
 * GridNav — weighted grid pathfinding (Dijkstra) matching Realm-of-Frank approach.
 *
 * The world is divided into a flat 2D grid of square cells.
 * Each cell has a weight (1.0 = walkable) or null (impassable obstacle).
 * Dijkstra finds least-cost paths; 8-directional movement for smooth 3D paths.
 *
 * OWNED BY: pathfinding-agent
 */
export class GridNav {
  /**
   * @param {number} zoneSize  — world units across (square zone)
   * @param {number} cellSize  — world units per cell
   */
  constructor(zoneSize, cellSize) {
    this.zoneSize = zoneSize
    this.cellSize = cellSize
    this.cols     = Math.floor(zoneSize / cellSize)
    this.rows     = Math.floor(zoneSize / cellSize)

    // null = impassable, 1.0 = normal walkable cost
    /** @type {(number|null)[]} */
    this._weights = new Array(this.rows * this.cols).fill(1.0)
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** @param {THREE.Vector3} worldPos @returns {{row:number, col:number}} */
  worldToCell(worldPos) {
    const col = Math.floor((worldPos.x + this.zoneSize / 2) / this.cellSize)
    const row = Math.floor((worldPos.z + this.zoneSize / 2) / this.cellSize)
    return {
      row: Math.max(0, Math.min(this.rows - 1, row)),
      col: Math.max(0, Math.min(this.cols - 1, col)),
    }
  }

  /** @param {number} row @param {number} col @returns {THREE.Vector3} */
  cellToWorld(row, col) {
    return new THREE.Vector3(
      -this.zoneSize / 2 + col * this.cellSize + this.cellSize / 2,
      0,
      -this.zoneSize / 2 + row * this.cellSize + this.cellSize / 2
    )
  }

  _idx(row, col)         { return row * this.cols + col }
  _inBounds(row, col)    { return row >= 0 && row < this.rows && col >= 0 && col < this.cols }
  _isWalkable(row, col)  { return this._weights[this._idx(row, col)] !== null }

  // ── Obstacle marking ──────────────────────────────────────────────────────

  /**
   * Mark the cell under worldPos as impassable.
   * Call this after placing any solid world object (tree, rock, bench, ore).
   * @param {THREE.Vector3} worldPos
   */
  blockAt(worldPos) {
    const { row, col } = this.worldToCell(worldPos)
    this._weights[this._idx(row, col)] = null
  }

  // ── Nearest walkable cell ─────────────────────────────────────────────────

  /**
   * Returns the nearest walkable {row, col} to worldPos via BFS.
   * If the cell directly under worldPos is walkable, returns it immediately.
   * @param {THREE.Vector3} worldPos
   * @returns {{row:number, col:number}}
   */
  nearestWalkableCell(worldPos) {
    const { row, col } = this.worldToCell(worldPos)
    if (this._isWalkable(row, col)) return { row, col }

    const queue = [[row, col]]
    const seen  = new Set([this._idx(row, col)])

    while (queue.length) {
      const [r, c] = queue.shift()
      for (const [dr, dc] of _DIRS4) {
        const nr = r + dr, nc = c + dc
        if (!this._inBounds(nr, nc)) continue
        const ni = this._idx(nr, nc)
        if (seen.has(ni)) continue
        seen.add(ni)
        if (this._isWalkable(nr, nc)) return { row: nr, col: nc }
        queue.push([nr, nc])
      }
    }
    return { row, col }   // fallback: no walkable cell found (shouldn't happen)
  }

  // ── Dijkstra pathfinding ──────────────────────────────────────────────────

  /**
   * Find the shortest walkable path between two world positions.
   * Returns an array of world-space Vector3 waypoints (cell centres, y=0).
   * Returns [] if no path exists.
   *
   * @param {THREE.Vector3} startWorldPos
   * @param {THREE.Vector3} endWorldPos
   * @returns {THREE.Vector3[]}
   */
  findPath(startWorldPos, endWorldPos) {
    const start = this.worldToCell(startWorldPos)
    const end   = this.nearestWalkableCell(endWorldPos)

    const n    = this.rows * this.cols
    const dist    = new Float32Array(n).fill(Infinity)
    const prevIdx = new Int32Array(n).fill(-1)
    const visited = new Uint8Array(n)

    const si = this._idx(start.row, start.col)
    const ei = this._idx(end.row,   end.col)

    if (si === ei) return [this.cellToWorld(start.row, start.col)]

    dist[si] = 0
    const heap = new _MinHeap()
    heap.push(0, start.row, start.col)

    while (!heap.isEmpty()) {
      const [cost, r, c] = heap.pop()
      const i = this._idx(r, c)
      if (visited[i]) continue
      visited[i] = 1
      if (i === ei) break

      for (const [dr, dc, moveCost] of _DIRS8) {
        const nr = r + dr, nc = c + dc
        if (!this._inBounds(nr, nc)) continue
        if (!this._isWalkable(nr, nc)) continue
        const ni = this._idx(nr, nc)
        if (visited[ni]) continue

        const w       = this._weights[ni]
        const newCost = cost + moveCost * w
        if (newCost < dist[ni]) {
          dist[ni]    = newCost
          prevIdx[ni] = i
          heap.push(newCost, nr, nc)
        }
      }
    }

    if (dist[ei] === Infinity) return []   // no path

    // Reconstruct path → world positions
    const path = []
    let cur = ei
    while (cur !== -1) {
      const r = Math.floor(cur / this.cols)
      const c = cur % this.cols
      path.unshift(this.cellToWorld(r, c))
      cur = prevIdx[cur]
    }
    return path
  }
}

// ── Direction tables ─────────────────────────────────────────────────────────

const _DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]]

const _DIRS8 = [
  [-1,  0, 1.0],
  [ 1,  0, 1.0],
  [ 0, -1, 1.0],
  [ 0,  1, 1.0],
  [-1, -1, Math.SQRT2],
  [-1,  1, Math.SQRT2],
  [ 1, -1, Math.SQRT2],
  [ 1,  1, Math.SQRT2],
]

// ── Min-heap ─────────────────────────────────────────────────────────────────

class _MinHeap {
  constructor() { this._d = [] }

  push(cost, row, col) {
    this._d.push([cost, row, col])
    this._up(this._d.length - 1)
  }

  pop() {
    const top  = this._d[0]
    const last = this._d.pop()
    if (this._d.length > 0) { this._d[0] = last; this._dn(0) }
    return top
  }

  isEmpty() { return this._d.length === 0 }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this._d[p][0] <= this._d[i][0]) break
      ;[this._d[p], this._d[i]] = [this._d[i], this._d[p]]
      i = p
    }
  }

  _dn(i) {
    const n = this._d.length
    for (;;) {
      let s = i, l = 2*i+1, r = 2*i+2
      if (l < n && this._d[l][0] < this._d[s][0]) s = l
      if (r < n && this._d[r][0] < this._d[s][0]) s = r
      if (s === i) break
      ;[this._d[s], this._d[i]] = [this._d[i], this._d[s]]
      i = s
    }
  }
}

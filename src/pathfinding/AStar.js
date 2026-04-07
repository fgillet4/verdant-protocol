import * as THREE from 'three'
import { MinHeap } from '../utils/MinHeap.js'

/**
 * A* pathfinding on the navmesh polygon graph.
 * Returns an array of NavPoly centroids from start to goal.
 * Caller should apply funnel smoothing after.
 */
export class AStar {
  /**
   * Find a path from startPoly to goalPoly.
   * @param {import('./Navmesh.js').NavPoly} startPoly
   * @param {import('./Navmesh.js').NavPoly} goalPoly
   * @returns {import('./Navmesh.js').NavPoly[]} ordered polygon path, empty if no path
   */
  static findPolyPath(startPoly, goalPoly) {
    if (startPoly === goalPoly) return [startPoly]

    // Node state maps
    const gScore = new Map()   // poly.id → cost from start
    const fScore = new Map()   // poly.id → g + h
    const cameFrom = new Map() // poly.id → NavPoly

    gScore.set(startPoly.id, 0)
    fScore.set(startPoly.id, heuristic(startPoly, goalPoly))

    const open = new MinHeap((a, b) =>
      (fScore.get(a.id) ?? Infinity) - (fScore.get(b.id) ?? Infinity)
    )
    const openSet = new Set()

    open.push(startPoly)
    openSet.add(startPoly.id)

    while (!open.isEmpty()) {
      const current = open.pop()
      openSet.delete(current.id)

      if (current === goalPoly) return reconstructPath(cameFrom, current)

      for (const neighbour of current.neighbours) {
        // Skip blocked cells (obstacles: trees, rocks, benches)
        if (!neighbour.walkable) continue

        // Edge cost = distance between centroids
        const edgeCost = current.centroid.distanceTo(neighbour.centroid)
        const tentativeG = (gScore.get(current.id) ?? Infinity) + edgeCost

        if (tentativeG < (gScore.get(neighbour.id) ?? Infinity)) {
          cameFrom.set(neighbour.id, current)
          gScore.set(neighbour.id, tentativeG)
          fScore.set(neighbour.id, tentativeG + heuristic(neighbour, goalPoly))

          if (!openSet.has(neighbour.id)) {
            open.push(neighbour)
            openSet.add(neighbour.id)
          }
        }
      }
    }

    return [] // no path
  }
}

/**
 * Euclidean distance heuristic in XZ plane.
 * Admissible (never overestimates) so A* is optimal.
 */
function heuristic(poly, goal) {
  const dx = poly.centroid.x - goal.centroid.x
  const dz = poly.centroid.z - goal.centroid.z
  return Math.sqrt(dx * dx + dz * dz)
}

/** Reconstruct ordered path from cameFrom map */
function reconstructPath(cameFrom, current) {
  const path = [current]
  while (cameFrom.has(current.id)) {
    current = cameFrom.get(current.id)
    path.unshift(current)
  }
  return path
}

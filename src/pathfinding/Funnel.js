import * as THREE from 'three'

/**
 * Funnel (string-pull) path smoother.
 * Takes a raw polygon path and returns smooth world-space waypoints
 * that hug corners properly instead of jumping between centroids.
 *
 * Simplified funnel: projects through shared edges between successive polygons.
 * Full Simple Stupid Funnel Algorithm (SSFA) can replace this for precision.
 */
export class Funnel {
  /**
   * Smooth a polygon path into world-space waypoints.
   * @param {THREE.Vector3} startPos — exact start position
   * @param {THREE.Vector3} endPos   — exact end position
   * @param {import('./Navmesh.js').NavPoly[]} polyPath — output of A*
   * @returns {THREE.Vector3[]} smooth waypoints including start and end
   */
  static smooth(startPos, endPos, polyPath) {
    if (polyPath.length <= 1) return [startPos.clone(), endPos.clone()]
    if (polyPath.length === 2) return [startPos.clone(), endPos.clone()]

    const waypoints = [startPos.clone()]

    // Build portal edges (shared edges between successive polygons)
    const portals = []
    for (let i = 0; i < polyPath.length - 1; i++) {
      const edge = sharedEdge(polyPath[i], polyPath[i + 1])
      if (edge) portals.push(edge)
    }

    // String-pull: for each portal, check if we can go straight through
    // If not, add a corner waypoint at the tightest portal vertex
    let apex = startPos.clone()
    let portalLeft = portals.length > 0 ? portals[0].left.clone() : endPos.clone()
    let portalRight = portals.length > 0 ? portals[0].right.clone() : endPos.clone()

    for (let i = 1; i < portals.length; i++) {
      const newLeft = portals[i].left
      const newRight = portals[i].right

      // Check right
      if (triArea2D(apex, portalRight, newRight) <= 0) {
        if (vEqual(apex, portalRight) || triArea2D(apex, portalLeft, newRight) > 0) {
          portalRight = newRight.clone()
        } else {
          waypoints.push(portalLeft.clone())
          apex = portalLeft.clone()
          portalLeft = apex.clone()
          portalRight = apex.clone()
          i = portals.findIndex((p, j) => j > i && !vEqual(p.left, apex) && !vEqual(p.right, apex))
          if (i === -1) break
          portalLeft = portals[i].left.clone()
          portalRight = portals[i].right.clone()
          continue
        }
      }

      // Check left
      if (triArea2D(apex, portalLeft, newLeft) >= 0) {
        if (vEqual(apex, portalLeft) || triArea2D(apex, portalRight, newLeft) < 0) {
          portalLeft = newLeft.clone()
        } else {
          waypoints.push(portalRight.clone())
          apex = portalRight.clone()
          portalLeft = apex.clone()
          portalRight = apex.clone()
          i = portals.findIndex((p, j) => j > i && !vEqual(p.left, apex) && !vEqual(p.right, apex))
          if (i === -1) break
          portalLeft = portals[i].left.clone()
          portalRight = portals[i].right.clone()
          continue
        }
      }
    }

    waypoints.push(endPos.clone())

    // Snap all Y values to 0 (terrain Y handled by PathFollower)
    for (const wp of waypoints) wp.y = 0
    return waypoints
  }
}

/**
 * Find the shared edge between two adjacent polygons.
 * Returns { left, right } in XZ plane (left/right from walking direction).
 */
function sharedEdge(polyA, polyB) {
  const shared = []
  for (const va of polyA.vertices) {
    for (const vb of polyB.vertices) {
      if (Math.abs(va.x - vb.x) < 0.001 && Math.abs(va.z - vb.z) < 0.001) {
        shared.push(va)
      }
    }
  }
  if (shared.length < 2) return null
  return { left: shared[0], right: shared[1] }
}

/** 2D signed triangle area in XZ plane */
function triArea2D(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)
}

/** Vector equality (XZ) */
function vEqual(a, b) {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.z - b.z) < 0.001
}

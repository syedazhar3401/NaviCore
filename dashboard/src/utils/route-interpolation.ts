import type { MaritimeWaypoint } from '@/config/maritime-routes'

// Haversine — returns nautical miles
function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface RoutePosition {
  lat: number
  lng: number
  waypointIndex: number
  distanceFromStart: number
  distanceToDestination: number
}

// Pre-compute cumulative distances at each waypoint
export function computeCumulativeDistances(waypoints: MaritimeWaypoint[]): number[] {
  const result = [0]
  for (let i = 1; i < waypoints.length; i++) {
    result.push(
      result[i - 1] +
        haversineNm(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng),
    )
  }
  return result
}

// Find position along route at a given distance from origin
export function getPositionAtDistance(
  waypoints: MaritimeWaypoint[],
  cumDistances: number[],
  distanceNm: number,
): RoutePosition {
  const totalDist = cumDistances[cumDistances.length - 1]

  // Clamp to route bounds
  if (distanceNm <= 0) {
    return {
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      waypointIndex: 0,
      distanceFromStart: 0,
      distanceToDestination: totalDist,
    }
  }
  if (distanceNm >= totalDist) {
    const last = waypoints[waypoints.length - 1]
    return {
      lat: last.lat,
      lng: last.lng,
      waypointIndex: waypoints.length - 1,
      distanceFromStart: totalDist,
      distanceToDestination: 0,
    }
  }

  // Find which segment the distance falls in
  let idx = 0
  for (let i = 1; i < cumDistances.length; i++) {
    if (cumDistances[i] >= distanceNm) {
      idx = i - 1
      break
    }
  }

  const segStart = cumDistances[idx]
  const segEnd = cumDistances[idx + 1]
  const segLen = segEnd - segStart
  const f = segLen > 0 ? (distanceNm - segStart) / segLen : 0

  // Rhumb-line interpolation (constant bearing — straight on Mercator)
  const lat1 = waypoints[idx].lat
  const lon1 = waypoints[idx].lng
  const lat2 = waypoints[idx + 1].lat
  const lon2 = waypoints[idx + 1].lng

  let deltaLon = lon2 - lon1
  if (Math.abs(deltaLon) > 180) {
    deltaLon = deltaLon > 0 ? deltaLon - 360 : deltaLon + 360
  }

  const lat = lat1 + f * (lat2 - lat1)
  const lng = lon1 + f * deltaLon

  return {
    lat,
    lng: lng < -180 ? lng + 360 : lng > 180 ? lng - 360 : lng,
    waypointIndex: idx,
    distanceFromStart: distanceNm,
    distanceToDestination: totalDist - distanceNm,
  }
}

// Generate a dense polyline from waypoints for map rendering
// Uses rhumb-line interpolation between waypoints (straight lines on Mercator)
export function generateRoutePolyline(
  waypoints: MaritimeWaypoint[],
  resolutionNm: number = 10,
): [number, number][] {
  const coords: [number, number][] = []

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i]
    const wp2 = waypoints[i + 1]
    const dist = haversineNm(wp1.lat, wp1.lng, wp2.lat, wp2.lng)
    const numSteps = Math.max(Math.ceil(dist / resolutionNm), 1)

    for (let j = 0; j <= numSteps; j++) {
      if (j === 0 && coords.length > 0) continue // skip duplicate join points

      const f = j / numSteps

      let deltaLon = wp2.lng - wp1.lng
      if (Math.abs(deltaLon) > 180) {
        deltaLon = deltaLon > 0 ? deltaLon - 360 : deltaLon + 360
      }

      const lat = wp1.lat + f * (wp2.lat - wp1.lat)
      const lng = wp1.lng + f * deltaLon
      const normalizedLng = lng < -180 ? lng + 360 : lng > 180 ? lng - 360 : lng

      coords.push([normalizedLng, lat])
    }
  }

  return coords
}

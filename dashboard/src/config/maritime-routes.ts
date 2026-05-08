export interface MaritimeWaypoint {
  lat: number
  lng: number
  name?: string
  type?: 'port' | 'chokepoint' | 'waypoint' | 'bunker'
}

export interface MaritimeRoute {
  id: string
  name: string
  origin: string
  destination: string
  waypoints: MaritimeWaypoint[]
  totalDistanceNm: number
}

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

// Singapore → Rotterdam via Suez Canal
// Follows real commercial shipping lane: Malacca Strait → Indian Ocean →
// Bab el-Mandeb → Red Sea → Suez → Mediterranean → Gibraltar → English Channel
export const SINGAPORE_ROTTERDAM_ROUTE: MaritimeRoute = (() => {
  const waypoints: MaritimeWaypoint[] = [
    // --- Singapore departure ---
    { lat: 1.29, lng: 103.85, name: 'Port of Singapore', type: 'port' },

    // --- Malacca Strait (dense points to stay in shipping lane) ---
    { lat: 1.35, lng: 103.45, type: 'waypoint' },
    { lat: 1.60, lng: 103.00, type: 'waypoint' },
    { lat: 2.10, lng: 102.20, type: 'waypoint' },
    { lat: 2.60, lng: 101.40, name: 'Malacca Strait', type: 'chokepoint' },
    { lat: 3.20, lng: 100.70, type: 'waypoint' },
    { lat: 4.20, lng: 99.80, type: 'waypoint' },
    { lat: 5.40, lng: 98.90, type: 'waypoint' },

    // --- Andaman Sea / Bay of Bengal ---
    { lat: 7.00, lng: 96.80, type: 'waypoint' },
    { lat: 8.20, lng: 94.20, type: 'waypoint' },
    { lat: 8.90, lng: 91.50, type: 'waypoint' },
    { lat: 8.60, lng: 88.50, type: 'waypoint' },
    { lat: 7.90, lng: 85.80, type: 'waypoint' },
    { lat: 6.80, lng: 83.20, type: 'waypoint' },

    // --- Sri Lanka rounding ---
    { lat: 5.92, lng: 80.59, name: 'Dondra Head (Sri Lanka)', type: 'waypoint' },
    { lat: 7.30, lng: 78.50, type: 'waypoint' },

    // --- Arabian Sea west of India ---
    { lat: 8.80, lng: 76.20, type: 'waypoint' },
    { lat: 10.80, lng: 73.60, type: 'waypoint' },
    { lat: 12.80, lng: 70.80, type: 'waypoint' },
    { lat: 14.40, lng: 67.50, type: 'waypoint' },
    { lat: 15.50, lng: 64.00, type: 'waypoint' },
    { lat: 15.70, lng: 60.30, type: 'waypoint' },
    { lat: 15.20, lng: 57.00, type: 'waypoint' },

    // --- Gulf of Aden entry ---
    { lat: 13.90, lng: 53.50, type: 'waypoint' },
    { lat: 13.20, lng: 50.50, type: 'waypoint' },
    { lat: 12.80, lng: 46.80, type: 'waypoint' },

    // --- Bab el-Mandeb ---
    { lat: 12.50, lng: 43.30, name: 'Bab el-Mandeb', type: 'chokepoint' },

    // --- Red Sea transit ---
    { lat: 13.70, lng: 42.80, type: 'waypoint' },
    { lat: 15.20, lng: 42.00, type: 'waypoint' },
    { lat: 17.00, lng: 40.70, type: 'waypoint' },
    { lat: 19.00, lng: 39.00, type: 'waypoint' },
    { lat: 21.00, lng: 38.50, type: 'waypoint' },
    { lat: 23.50, lng: 36.80, type: 'waypoint' },
    { lat: 25.80, lng: 34.90, type: 'waypoint' },
    { lat: 27.80, lng: 33.60, type: 'waypoint' },

    // --- Suez Canal ---
    { lat: 29.97, lng: 32.55, name: 'Suez Canal (South)', type: 'chokepoint' },
    { lat: 30.25, lng: 32.43, type: 'waypoint' },
    { lat: 30.55, lng: 32.35, type: 'waypoint' },
    { lat: 30.88, lng: 32.32, type: 'waypoint' },
    { lat: 31.26, lng: 32.30, name: 'Port Said (Suez North)', type: 'chokepoint' },

    // --- Mediterranean toward Gibraltar ---
    { lat: 32.00, lng: 31.00, type: 'waypoint' },
    { lat: 33.20, lng: 28.50, type: 'waypoint' },
    { lat: 34.60, lng: 25.20, type: 'waypoint' },
    { lat: 35.50, lng: 21.50, type: 'waypoint' },
    { lat: 36.10, lng: 17.80, type: 'waypoint' },
    { lat: 36.20, lng: 14.20, type: 'waypoint' },
    { lat: 35.95, lng: 8.00, type: 'waypoint' },
    { lat: 35.90, lng: 3.00, type: 'waypoint' },
    { lat: 35.88, lng: -1.50, type: 'waypoint' },
    { lat: 35.90, lng: -5.60, name: 'Strait of Gibraltar', type: 'chokepoint' },

    // --- Atlantic west of Iberia / Bay of Biscay ---
    { lat: 36.20, lng: -7.50, type: 'waypoint' },
    { lat: 37.40, lng: -9.60, type: 'waypoint' },
    { lat: 40.00, lng: -10.00, type: 'waypoint' },
    { lat: 43.00, lng: -9.20, type: 'waypoint' },
    { lat: 45.50, lng: -6.80, type: 'waypoint' },

    // --- English Channel and North Sea ---
    { lat: 48.45, lng: -5.10, name: 'Ushant', type: 'waypoint' },
    { lat: 49.50, lng: -3.00, type: 'waypoint' },
    { lat: 50.15, lng: -1.00, type: 'waypoint' },
    { lat: 51.00, lng: 1.50, name: 'Dover Strait', type: 'chokepoint' },
    { lat: 51.45, lng: 2.50, type: 'waypoint' },
    { lat: 51.70, lng: 3.50, type: 'waypoint' },

    // --- Rotterdam ---
    { lat: 51.92, lng: 4.48, name: 'Port of Rotterdam', type: 'port' },
  ]

  let totalDistanceNm = 0
  for (let i = 1; i < waypoints.length; i++) {
    totalDistanceNm += haversineNm(
      waypoints[i - 1].lat,
      waypoints[i - 1].lng,
      waypoints[i].lat,
      waypoints[i].lng,
    )
  }

  return {
    id: 'singapore-rotterdam-suez',
    name: 'Singapore → Rotterdam (Suez)',
    origin: 'Port of Singapore',
    destination: 'Port of Rotterdam',
    waypoints,
    totalDistanceNm: Math.round(totalDistanceNm),
  }
})()

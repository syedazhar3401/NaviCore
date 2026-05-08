import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { io } from 'socket.io-client'
import AppStatusPill from './components/AppStatusPill'
import TopDock from './components/TopDock'
import FleetMap from './components/FleetMap'
import VoyageCard from './components/VoyageCard'
import CargoFeed from './components/CargoFeed'
import FuelOptimizer from './components/FuelOptimizer'
import CrewRoster from './components/CrewRoster'
import CostLedger from './components/CostLedger'
import WeatherRisk from './components/WeatherRisk'
import CargoArrangement from './components/CargoArrangement'
import { SINGAPORE_ROTTERDAM_ROUTE } from './config/maritime-routes'
import { computeCumulativeDistances, getPositionAtDistance } from './utils/route-interpolation'
import './App.css'

const BACKEND_URL = 'http://localhost:4000'

const MOCK_VESSELS = [
  { id: '1', name: 'NaviCore One', currentLat: 1.29, currentLng: 103.85, status: 'IN_TRANSIT' },
]

const CREW_ROSTER = [
  { id: 1, name: 'Captain Ahab', role: 'Captain', zone: 'Bridge', shiftStart: '06:00', dailyRate: 850, avatar: '👨‍✈️' },
  { id: 2, name: 'Jane Doe', role: 'Chief Engineer', zone: 'Engine Room', shiftStart: '08:00', dailyRate: 720, avatar: '👩‍🔧' },
  { id: 3, name: 'John Smith', role: 'Deckhand', zone: 'Port Deck', shiftStart: '06:00', dailyRate: 380, avatar: '👷' },
  { id: 4, name: 'Maria Santos', role: 'Navigation Officer', zone: 'Bridge', shiftStart: '14:00', dailyRate: 620, avatar: '👩‍✈️' },
  { id: 5, name: 'Arjun Patel', role: 'Cargo Handler', zone: 'Cargo Hold', shiftStart: '08:00', dailyRate: 400, avatar: '🦺' },
  { id: 6, name: 'Lee Wei', role: 'Chief Mate', zone: 'Bridge', shiftStart: '06:00', dailyRate: 680, avatar: '🧑‍✈️' },
]

const SHARED_MOCK_CARGO = [
  { id: 'cargo-1', cargoId: 'CARGO-1001', voyageId: 'voyage-1', label: 'Electronics Container', weightKg: 2500, type: 'STANDARD', loadStatus: 'MANIFESTED', deckSlotId: null, contents: 'Consumer Electronics', owner: 'TechCorp Logistics', destinationPort: 'Rotterdam', isPlanned: true },
  { id: 'cargo-2', cargoId: 'CARGO-1002', voyageId: 'voyage-1', label: 'Auto Parts', weightKg: 3200, type: 'STANDARD', loadStatus: 'LOADED', deckSlotId: 'B3-R2-C1', contents: 'Engine Components', owner: 'Global Auto Mfg', destinationPort: 'Rotterdam', isPlanned: false },
  { id: 'cargo-3', cargoId: 'CARGO-1003', voyageId: 'voyage-1', label: 'Textile Goods', weightKg: 1800, type: 'STANDARD', loadStatus: 'MANIFESTED', deckSlotId: null, contents: 'Apparel & Fabrics', owner: 'Fashion Freight', destinationPort: 'Rotterdam', isPlanned: true },
  { id: 'cargo-4', cargoId: 'CARGO-1004', voyageId: 'voyage-1', label: 'Machinery Parts', weightKg: 4500, type: 'STANDARD', loadStatus: 'LOADED', deckSlotId: 'B5-R3-C2', contents: 'Industrial Drilling Eq.', owner: 'HeavyInd Corp', destinationPort: 'Rotterdam', isPlanned: false },
  { id: 'cargo-5', cargoId: 'CARGO-1005', voyageId: 'voyage-1', label: 'Chemical Drums', weightKg: 2100, type: 'HAZMAT', loadStatus: 'MANIFESTED', deckSlotId: null, contents: 'Industrial Solvents', owner: 'ChemLogix', destinationPort: 'Rotterdam', isPlanned: true },
  { id: 'cargo-6', cargoId: 'CARGO-1006', voyageId: 'voyage-1', label: 'Food Products', weightKg: 1500, type: 'REFRIGERATED', loadStatus: 'LOADED', deckSlotId: 'B2-R1-C2', contents: 'Frozen Seafood', owner: 'Oceanic Foods', destinationPort: 'Rotterdam', isPlanned: false },
];

// Haversine — same formula as backend, returns NM
function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function moveTowardTargetByNm(startLat, startLng, targetLat, targetLng, stepNm) {
  const distanceToTarget = haversineNm(startLat, startLng, targetLat, targetLng)
  if (distanceToTarget <= stepNm || distanceToTarget === 0) {
    return { lat: targetLat, lng: targetLng, arrived: true }
  }

  const f = stepNm / distanceToTarget
  let deltaLng = targetLng - startLng
  if (Math.abs(deltaLng) > 180) {
    deltaLng = deltaLng > 0 ? deltaLng - 360 : deltaLng + 360
  }

  const lat = startLat + (targetLat - startLat) * f
  const lng = startLng + deltaLng * f
  const normalizedLng = lng < -180 ? lng + 360 : lng > 180 ? lng - 360 : lng

  return { lat, lng: normalizedLng, arrived: false }
}

function getNearestRouteDistance(waypoints, cumulativeDistances, lat, lng) {
  let nearestIdx = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i < waypoints.length; i++) {
    const distance = haversineNm(lat, lng, waypoints[i].lat, waypoints[i].lng)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIdx = i
    }
  }

  return cumulativeDistances[nearestIdx]
}

function getNearestWaypointIndex(waypoints, lat, lng) {
  let nearestIdx = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  for (let i = 0; i < waypoints.length; i++) {
    const distance = haversineNm(lat, lng, waypoints[i].lat, waypoints[i].lng)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIdx = i
    }
  }

  return nearestIdx
}

const BUNKER_APPROACH_CORRIDORS = {
  'Port of Colombo': [
    { lat: 5.75, lng: 80.05 },
    { lat: 6.10, lng: 79.70 },
    { lat: 6.55, lng: 79.70 },
  ],
  'Port of Cochin': [
    { lat: 9.20, lng: 75.20 },
    { lat: 9.70, lng: 75.75 },
  ],
  'Port of Chennai': [
    { lat: 12.20, lng: 81.05 },
    { lat: 12.80, lng: 80.75 },
  ],
  'Port of Salalah': [
    { lat: 16.35, lng: 54.30 },
    { lat: 16.95, lng: 54.05 },
  ],
}

function buildSeaDiversionPath(startPos, stop) {
  const startIndex = getNearestWaypointIndex(ROUTE_WAYPOINTS, startPos.lat, startPos.lng)
  const stopIndex = getNearestWaypointIndex(ROUTE_WAYPOINTS, stop.lat, stop.lng)
  const path = [{ lat: startPos.lat, lng: startPos.lng }]

  if (stopIndex >= startIndex) {
    for (let i = startIndex; i <= stopIndex; i++) {
      path.push({ lat: ROUTE_WAYPOINTS[i].lat, lng: ROUTE_WAYPOINTS[i].lng })
    }
  } else {
    for (let i = startIndex; i >= stopIndex; i--) {
      path.push({ lat: ROUTE_WAYPOINTS[i].lat, lng: ROUTE_WAYPOINTS[i].lng })
    }
  }

  const approach = BUNKER_APPROACH_CORRIDORS[stop.name] || []
  approach.forEach(point => path.push(point))
  path.push({ lat: stop.lat, lng: stop.lng })

  return path.filter((point, idx, arr) => {
    if (idx === 0) return true
    const prev = arr[idx - 1]
    return prev.lat !== point.lat || prev.lng !== point.lng
  })
}

// Build rerouted maritime waypoints that detour through a bunker port
// Uses existing sea-lane waypoints + approach corridors to stay over water
function buildReroutedWaypoints(bunkerStop) {
  if (!bunkerStop) return ROUTE_WAYPOINTS

  const bunkerIdx = getNearestWaypointIndex(ROUTE_WAYPOINTS, bunkerStop.lat, bunkerStop.lng)
  const approach = BUNKER_APPROACH_CORRIDORS[bunkerStop.name] || []

  // Build the rerouted path: origin waypoints → approach to bunker → bunker → return to route → remaining waypoints
  const rerouted = []

  // Waypoints up to the nearest route point before the bunker
  for (let i = 0; i <= bunkerIdx; i++) {
    rerouted.push(ROUTE_WAYPOINTS[i])
  }

  // Approach corridor into the port (from sea lane to port)
  approach.forEach(pt => {
    rerouted.push({ lat: pt.lat, lng: pt.lng, type: 'waypoint' })
  })

  // The bunker port itself
  rerouted.push({ lat: bunkerStop.lat, lng: bunkerStop.lng, name: bunkerStop.name, type: 'bunker' })

  // Return from bunker back to the nearest route waypoint (reverse approach)
  const reverseApproach = [...approach].reverse()
  reverseApproach.forEach(pt => {
    rerouted.push({ lat: pt.lat, lng: pt.lng, type: 'waypoint' })
  })

  // Continue with remaining waypoints from the route (skip the bunkerIdx to avoid duplicate)
  for (let i = bunkerIdx + 1; i < ROUTE_WAYPOINTS.length; i++) {
    rerouted.push(ROUTE_WAYPOINTS[i])
  }

  // Deduplicate consecutive identical points
  return rerouted.filter((wp, idx) => {
    if (idx === 0) return true
    const prev = rerouted[idx - 1]
    return Math.abs(prev.lat - wp.lat) > 0.001 || Math.abs(prev.lng - wp.lng) > 0.001
  })
}

// Maritime route distance (via Suez — follows actual shipping lanes)
const TOTAL_ROUTE_NM = SINGAPORE_ROTTERDAM_ROUTE.totalDistanceNm
const ROUTE_WAYPOINTS = SINGAPORE_ROTTERDAM_ROUTE.waypoints
const ROUTE_CUM_DISTANCES = computeCumulativeDistances(ROUTE_WAYPOINTS)

// Simulation: 1 tick = 3s real time = 1 hour voyage time
// Vessel speed ~14 knots → distance per tick = 14 NM
// 250T fuel at 0.15 T/NM = 1,667 NM range = ~119 ticks = ~6 min demo
const TICK_INTERVAL_MS = 3000
const TICK_HOURS = 1
const TICK_DAYS = TICK_HOURS / 24
const DISTANCE_PER_TICK = 14
const LOW_FUEL_THRESHOLD = 50
const BUNKER_ARRIVAL_RADIUS_NM = 20

const VOYAGE_CONFIG = {
  origin: 'Port of Singapore',
  destination: 'Port of Rotterdam',
  originCoords: { lat: 1.29, lng: 103.85 },
  destCoords: { lat: 51.92, lng: 4.48 },
  totalRouteNm: TOTAL_ROUTE_NM,
  fuelRemaining: 1000,
  fuelConsumptionRate: 0.15,
  fuelPricePerTonne: 755,
  portFees: 15000,
  distancePerTick: DISTANCE_PER_TICK,
  tickDays: TICK_DAYS,
}

const PAGE_META = {
  fleet: {
    title: 'Global Maritime Intelligence',
    subtitle: 'Real-time threat monitoring and vessel tracking',
  },
  voyage: {
    title: 'Voyage Overview',
    subtitle: 'Live vessel status and route monitoring',
  },
  weather: {
    title: 'Weather & Risk Intel',
    subtitle: 'Maritime weather intelligence and route risk analysis',
  },
  fuel: {
    title: 'Fuel Stop Optimizer',
    subtitle: 'Compare bunker ports and optimize refueling decisions',
  },
  cost: {
    title: 'Voyage Cost Ledger',
    subtitle: 'Live running total — NaviCore One · Singapore → Rotterdam',
  },
  arrangement: {
    title: 'Cargo Arrangement',
    subtitle: 'Plan deck slot placement and vessel stability',
  },
  feed: {
    title: 'Live Loading Feed',
    subtitle: 'Real-time deckhand QR scan events',
  },
  crew: {
    title: 'Crew Roster',
    subtitle: 'Crew assignments and live duty status',
  },
}

export default function App() {
  const [activeView, setActiveView] = useState('fleet')
  const [feedEvents, setFeedEvents] = useState([])
  const [vessels, setVessels] = useState(MOCK_VESSELS)
  const [costUpdates, setCostUpdates] = useState({})
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [fuelRemaining, setFuelRemaining] = useState(VOYAGE_CONFIG.fuelRemaining)
  const [distanceTraveled, setDistanceTraveled] = useState(0)
  const [voyageTicks, setVoyageTicks] = useState(0)
  const [reachablePortsCount, setReachablePortsCount] = useState(null)
  const [globalCargo, setGlobalCargo] = useState(SHARED_MOCK_CARGO)
  const socketRef = useRef(null)
  const pollingRef = useRef(null)
  const fuelRef = useRef(fuelRemaining)
  const distanceTraveledRef = useRef(distanceTraveled)
  const bunkerStopsRef = useRef([])
  const manualVesselPosRef = useRef(null)
  const activeDiversionRef = useRef(null)
  const tightPortStatusRef = useRef(false)
  fuelRef.current = fuelRemaining
  distanceTraveledRef.current = distanceTraveled

  // --- Bunker stop state (single bunker stop at a time) ---
  // Each stop: { name, lat, lng, status: active|reached|refueled, reached: boolean, refueled: boolean }
  const [bunkerStops, setBunkerStops] = useState([])
  const [manualVesselPos, setManualVesselPos] = useState(null)
  const [activeDiversion, setActiveDiversion] = useState(null)

  useEffect(() => {
    bunkerStopsRef.current = bunkerStops
  }, [bunkerStops])

  useEffect(() => {
    manualVesselPosRef.current = manualVesselPos
  }, [manualVesselPos])

  useEffect(() => {
    activeDiversionRef.current = activeDiversion
  }, [activeDiversion])

  useEffect(() => {
    setBunkerStops(prev => prev.map(bs => {
      if (bs.status) return bs
      if (bs.refueled) return { ...bs, status: 'refueled' }
      if (bs.reached) return { ...bs, status: 'reached' }
      return { ...bs, status: 'active' }
    }))
  }, [])

  // Build the full route waypoints: origin → bunker stops → destination
  const routeWaypoints = useMemo(() => {
    const points = [{ name: VOYAGE_CONFIG.origin, lat: VOYAGE_CONFIG.originCoords.lat, lng: VOYAGE_CONFIG.originCoords.lng, type: 'origin' }]
    bunkerStops.forEach(bs => {
      points.push({ name: bs.name, lat: bs.lat, lng: bs.lng, type: bs.refueled ? 'completed_bunker' : 'bunker' })
    })
    points.push({ name: VOYAGE_CONFIG.destination, lat: VOYAGE_CONFIG.destCoords.lat, lng: VOYAGE_CONFIG.destCoords.lng, type: 'destination' })
    return points
  }, [bunkerStops])

  // Build rerouted maritime waypoints when a bunker stop is active (not yet refueled)
  const activeBunkerStop = bunkerStops.find(bs => !bs.refueled)
  const reroutedWaypoints = useMemo(() => {
    return activeBunkerStop ? buildReroutedWaypoints(activeBunkerStop) : ROUTE_WAYPOINTS
  }, [activeBunkerStop])

  // Add a bunker stop from FuelOptimizer (only 1 at a time — replaces any existing)
  const addBunkerStop = useCallback((port) => {
    setBunkerStops(prev => {
      if (prev.some(bs => bs.name === port.name)) return prev

      // If there's already an in-progress stop, replace it
      const hasInProgress = prev.some(bs => {
        const status = bs.status || 'active'
        return status === 'active' || status === 'reached'
      })

      if (hasInProgress) {
        // Clear diversion for the old stop
        setActiveDiversion(null)
        setManualVesselPos(null)
      }

      return [{
        name: port.name,
        lat: port.lat,
        lng: port.lng,
        status: 'active',
        reached: false,
        refueled: false,
      }]
    })
  }, [])

  // Remove current bunker stop and restore original route
  const removeBunkerStop = useCallback(() => {
    const vesselPos = manualVesselPosRef.current ?? getPositionAtDistance(
      ROUTE_WAYPOINTS,
      ROUTE_CUM_DISTANCES,
      distanceTraveledRef.current,
    )
    const snappedDistance = getNearestRouteDistance(
      ROUTE_WAYPOINTS,
      ROUTE_CUM_DISTANCES,
      vesselPos.lat,
      vesselPos.lng,
    )
    setDistanceTraveled(snappedDistance)
    setActiveDiversion(null)
    setManualVesselPos(null)
    setBunkerStops([])
  }, [])

  const handleReachablePortsChange = useCallback((count) => {
    setReachablePortsCount(count)
  }, [])

  // Refuel at a bunker stop — mark completed and clear diversion
  const refuelAtStop = useCallback((stopName) => {
    setFuelRemaining(VOYAGE_CONFIG.fuelRemaining)
    setBunkerStops(prev => prev.map(bs =>
      bs.name === stopName
        ? { ...bs, status: 'refueled', reached: true, refueled: true }
        : bs
    ))

    const vesselPos = manualVesselPosRef.current ?? getPositionAtDistance(
      ROUTE_WAYPOINTS,
      ROUTE_CUM_DISTANCES,
      distanceTraveledRef.current,
    )

    const snappedDistance = getNearestRouteDistance(
      ROUTE_WAYPOINTS,
      ROUTE_CUM_DISTANCES,
      vesselPos.lat,
      vesselPos.lng,
    )
    setDistanceTraveled(snappedDistance)

    setActiveDiversion(null)
    setManualVesselPos(null)
    setVessels(prev => prev.map(v =>
      v.status === 'STRANDED' ? { ...v, status: 'IN_TRANSIT' } : v
    ))
  }, [])

  // --- Derived vessel position from route interpolation ---
  const vesselRoutePos = useMemo(() => {
    return getPositionAtDistance(ROUTE_WAYPOINTS, ROUTE_CUM_DISTANCES, distanceTraveled)
  }, [distanceTraveled])

  // Build the diversion path line (vessel → bunker port) for the red line on the map
  const bunkerDiversionPath = useMemo(() => {
    if (!activeBunkerStop || activeBunkerStop.reached) return null
    const startPos = manualVesselPos ?? vesselRoutePos
    return buildSeaDiversionPath(startPos, activeBunkerStop)
  }, [activeBunkerStop, manualVesselPos, vesselRoutePos])

  // Derive vessel lat/lng from route position
  const vesselsWithPosition = useMemo(() => {
    const liveLat = manualVesselPos?.lat ?? vesselRoutePos.lat
    const liveLng = manualVesselPos?.lng ?? vesselRoutePos.lng

    return vessels.map(v => ({
      ...v,
      currentLat: liveLat,
      currentLng: liveLng,
    }))
  }, [vessels, vesselRoutePos, manualVesselPos])

  // --- Derived operational state (never stored independently) ---
  const isOutOfFuel = fuelRemaining <= 0
  const isTightPortStatus = reachablePortsCount !== null && reachablePortsCount <= 5 && reachablePortsCount > 0
  const isZeroReachablePorts = reachablePortsCount === 0
  const fuelConsumed = VOYAGE_CONFIG.fuelRemaining - fuelRemaining
  const remainingDistance = Math.max(vesselRoutePos.distanceToDestination, 0)
  const voyageDays = voyageTicks * VOYAGE_CONFIG.tickDays
  const fuelCostAccrued = fuelConsumed * VOYAGE_CONFIG.fuelPricePerTonne
  const crewPayrollAccrued = CREW_ROSTER.reduce((sum, c) => sum + c.dailyRate, 0) * voyageDays
  const projectedFuelCost = remainingDistance * VOYAGE_CONFIG.fuelConsumptionRate * VOYAGE_CONFIG.fuelPricePerTonne
  const projectedCrewPayroll = CREW_ROSTER.reduce((sum, c) => sum + c.dailyRate, 0) * (remainingDistance / (DISTANCE_PER_TICK / VOYAGE_CONFIG.tickDays))
  const estimatedFinalFuelCost = fuelCostAccrued + projectedFuelCost
  const totalVoyageCost = fuelCostAccrued + VOYAGE_CONFIG.portFees + crewPayrollAccrued

  useEffect(() => {
    tightPortStatusRef.current = isTightPortStatus
  }, [isTightPortStatus])

  // --- Fetch latest state via HTTP (fallback for socket disconnects) ---
  const fetchLatestState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`)
      if (res.ok) {
        console.log('[Fallback] HTTP poll OK — waiting for socket reconnect')
      }
    } catch {
      console.warn('[Fallback] Backend unreachable via HTTP')
    }
  }, [])


  useEffect(() => {
    // Connect to backend WebSocket
    const socket = io(BACKEND_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('NaviCore Dashboard connected to backend')
      setConnectionStatus('connected')

      // Stop HTTP polling fallback if it was running
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        console.log('[Socket] Reconnected — stopped HTTP polling')
      }
    })

    // --- Connection Drop Resilience ---
    socket.on('disconnect', () => {
      console.warn('[Socket] Disconnected — starting HTTP polling fallback')
      setConnectionStatus('disconnected')

      // Start polling every 5 seconds until reconnected
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchLatestState, 5000)
      }
    })

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting')
    })

    // THE MAGIC LOOP: Listen for deckhand QR scan events
    socket.on('CARGO_SCANNED', (data) => {
      setFeedEvents(prev => [{
        id: Date.now(),
        qrCode: data.qrCode,
        status: data.loadStatus || data.status,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
        voyageId: data.voyageId,
      }, ...prev].slice(0, 50))
    })

    // --- Targeted COST_UPDATE rendering ---
    // Only update state for the specific voyage that changed
    socket.on('COST_UPDATE', (data) => {
      setCostUpdates(prev => ({
        ...prev,
        [data.voyageId]: data,
      }))
    })

    // --- System Alerts ---
    socket.on('SYSTEM_ALERT', (data) => {
      console.warn('[SYSTEM_ALERT]', data.message)
    })

    // Simulate vessel movement and fuel consumption
    const moveInterval = setInterval(() => {
      if (fuelRef.current <= 0) {
        setVessels(prev => prev.map(v =>
          v.status !== 'STRANDED' ? { ...v, status: 'STRANDED' } : v
        ))
        return
      }

      const waitingRefuelStop = bunkerStopsRef.current.find(bs => bs.reached && !bs.refueled)
      if (waitingRefuelStop) {
        // Vessel has arrived at bunker stop and must refuel before continuing
        return
      }

      const activeBunkerStop = bunkerStopsRef.current.find(bs => bs.status === 'active' && !bs.refueled)
      if (activeBunkerStop) {
        const startPos = manualVesselPosRef.current ?? getPositionAtDistance(
          ROUTE_WAYPOINTS,
          ROUTE_CUM_DISTANCES,
          distanceTraveledRef.current,
        )

        let diversion = activeDiversionRef.current
        if (!diversion || diversion.stopName !== activeBunkerStop.name || !diversion.path?.length) {
          diversion = {
            stopName: activeBunkerStop.name,
            path: buildSeaDiversionPath(startPos, activeBunkerStop),
            segmentIndex: 0,
          }
          setActiveDiversion(diversion)
        }

        const targetPoint = diversion.path[diversion.segmentIndex + 1]
        if (!targetPoint) {
          setBunkerStops(prev => prev.map(bs =>
            bs.name === activeBunkerStop.name
              ? { ...bs, status: 'reached', reached: true }
              : bs
          ))
          setActiveDiversion(null)
          return
        }

        const nextPos = moveTowardTargetByNm(
          startPos.lat,
          startPos.lng,
          targetPoint.lat,
          targetPoint.lng,
          VOYAGE_CONFIG.distancePerTick,
        )

        const fuelBurned = VOYAGE_CONFIG.fuelConsumptionRate * VOYAGE_CONFIG.distancePerTick
        setFuelRemaining(prev => Math.max(prev - fuelBurned, 0))
        setVoyageTicks(prev => prev + 1)
        setManualVesselPos({ lat: nextPos.lat, lng: nextPos.lng })

        if (nextPos.arrived) {
          const isFinalLeg = diversion.segmentIndex + 1 >= diversion.path.length - 1
          if (isFinalLeg) {
            setBunkerStops(prev => prev.map(bs =>
              bs.name === activeBunkerStop.name
                ? { ...bs, status: 'reached', reached: true }
                : bs
            ))
            setActiveDiversion(null)
          } else {
            setActiveDiversion(prev => {
              if (!prev || prev.stopName !== activeBunkerStop.name) {
                return prev
              }
              return { ...prev, segmentIndex: prev.segmentIndex + 1 }
            })
          }
        }

        return
      }

      setActiveDiversion(null)
      setManualVesselPos(null)
      const fuelBurned = VOYAGE_CONFIG.fuelConsumptionRate * VOYAGE_CONFIG.distancePerTick
      setFuelRemaining(prev => Math.max(prev - fuelBurned, 0))
      setDistanceTraveled(prev => Math.min(prev + VOYAGE_CONFIG.distancePerTick, VOYAGE_CONFIG.totalRouteNm))
      setVoyageTicks(prev => prev + 1)
      setVessels(prev => prev.map(v =>
        v.status === 'STRANDED' ? { ...v, status: 'IN_TRANSIT' } : v
      ))
    }, TICK_INTERVAL_MS)

    return () => {
      socket.disconnect()
      clearInterval(moveInterval)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [fetchLatestState])

  // --- Detect when vessel reaches an active bunker stop ---
  useEffect(() => {
    const vessel = vesselsWithPosition[0]
    if (!vessel) return

    setBunkerStops(prev => prev.map(bs => {
      if (bs.refueled) return bs
      if ((bs.status || 'pending') !== 'active') return bs

      const dist = haversineNm(vessel.currentLat, vessel.currentLng, bs.lat, bs.lng)
      if (dist < BUNKER_ARRIVAL_RADIUS_NM) {
        return { ...bs, status: 'reached', reached: true }
      }

      return bs
    }))
  }, [vesselsWithPosition])

  // Build the display route string for VoyageCard
  const routeDisplay = useMemo(() => {
    const parts = [VOYAGE_CONFIG.origin]
    bunkerStops.forEach(bs => {
      parts.push(`${bs.name}${bs.refueled ? ' ✓' : ' (Bunker)'}`)
    })
    parts.push(VOYAGE_CONFIG.destination)
    return parts.join(' → ')
  }, [bunkerStops])

  const views = {
    fleet: <FleetMap vessels={vesselsWithPosition} routeWaypoints={routeWaypoints} maritimeWaypoints={ROUTE_WAYPOINTS} bunkerDiversionPath={bunkerDiversionPath} isOutOfFuel={isOutOfFuel} isTightPortStatus={isTightPortStatus} bunkerStops={bunkerStops} />,
    voyage: <VoyageCard vessels={vesselsWithPosition} fuelRemaining={fuelRemaining} fuelConsumptionRate={VOYAGE_CONFIG.fuelConsumptionRate} origin={VOYAGE_CONFIG.origin} destination={VOYAGE_CONFIG.destination} destCoords={VOYAGE_CONFIG.destCoords} isOutOfFuel={isOutOfFuel} bunkerStops={bunkerStops} routeDisplay={routeDisplay} remainingDistanceNm={remainingDistance} vesselRoutePos={vesselRoutePos} totalRouteNm={VOYAGE_CONFIG.totalRouteNm} onRemoveBunkerStop={removeBunkerStop} cargo={globalCargo} />,
    fuel: <FuelOptimizer vessels={vesselsWithPosition} fuelRemaining={fuelRemaining} fuelConsumptionRate={VOYAGE_CONFIG.fuelConsumptionRate} isOutOfFuel={isOutOfFuel} isZeroPorts={isZeroReachablePorts} bunkerStops={bunkerStops} onAddBunkerStop={addBunkerStop} onRefuelAtStop={refuelAtStop} onRemoveBunkerStop={removeBunkerStop} onReachablePortsChange={handleReachablePortsChange} />,
    feed: <CargoFeed events={feedEvents} />,
    crew: <CrewRoster crew={CREW_ROSTER} />,
    cost: <CostLedger
      fuelCostAccrued={fuelCostAccrued}
      crewPayrollAccrued={crewPayrollAccrued}
      portFees={VOYAGE_CONFIG.portFees}
      totalVoyageCost={totalVoyageCost}
      fuelConsumed={fuelConsumed}
      fuelRemaining={fuelRemaining}
      fuelPricePerTonne={VOYAGE_CONFIG.fuelPricePerTonne}
      projectedFuelCost={projectedFuelCost}
      estimatedFinalFuelCost={estimatedFinalFuelCost}
      crewCount={CREW_ROSTER.length}
      crewRoster={CREW_ROSTER}
      distanceTraveled={distanceTraveled}
      remainingDistance={remainingDistance}
      totalRouteNm={VOYAGE_CONFIG.totalRouteNm}
      voyageDays={voyageDays}
      isOutOfFuel={isOutOfFuel}
    />,
    weather: <WeatherRisk vessels={vesselsWithPosition} fuelRemaining={fuelRemaining} destination={VOYAGE_CONFIG.destination} isOutOfFuel={isOutOfFuel} />,
    arrangement: <CargoArrangement globalCargo={globalCargo} setGlobalCargo={setGlobalCargo} />,
  }

  const activePage = PAGE_META[activeView] || PAGE_META.fleet

  return (
    <div className="app-layout">
      <div className="app-page-title-panel">
        <h1 className="app-page-title">{activePage.title}</h1>
        <p className="app-page-subtitle">{activePage.subtitle}</p>
      </div>
      <AppStatusPill connectionStatus={connectionStatus} />
      <TopDock
        activeView={activeView}
        onNavigate={setActiveView}
        feedEvents={feedEvents}
      />
      <main className={`app-main ${activeView === 'fleet' ? 'app-main-full' : ''}`}>
        {connectionStatus === 'disconnected' && activeView !== 'fleet' && (
          <div className="connection-banner connection-banner-warn">
            <span className="dot dot-amber pulse" style={{ width: 8, height: 8, minWidth: 8 }}></span>
            Connection lost — attempting to reconnect…
          </div>
        )}
        <div className={activeView !== 'fleet' ? 'fade-in' : ''} key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { SINGAPORE_ROTTERDAM_ROUTE } from '@/config/maritime-routes'

const BACKEND_URL = 'http://localhost:4000'
const AUTO_REFRESH_MS = 5000
const ROUTE_PROXIMITY_NM = 200

// Haversine distance in nautical miles
function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = v => (v * Math.PI) / 180
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Find minimum distance from a point to any waypoint on the route
function minDistanceToRoute(lat, lng, waypoints) {
  let minDist = Infinity
  for (const wp of waypoints) {
    const d = haversineNm(lat, lng, wp.lat, wp.lng)
    if (d < minDist) minDist = d
  }
  return minDist
}

// --- Emergency Voyage Assistance Module ---
function EmergencyVoyageAssistance({ vessels, fuelRemaining, fuelConsumptionRate = 0.15 }) {
  const [riskData, setRiskData] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [nearestPortData, setNearestPortData] = useState(null)
  const vessel = vessels?.[0]

  // Fetch live risk + weather + nearest port data for the stranded vessel
  useEffect(() => {
    if (!vessel) return
    const fetchData = async () => {
      try {
        const [riskRes, weatherRes, portRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/mcp/analyze-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: vessel.currentLat,
              lng: vessel.currentLng,
              fuelRemaining: Number(fuelRemaining),
              destination: 'Port of Rotterdam',
            }),
          }),
          fetch(`${BACKEND_URL}/api/weather?lat=${vessel.currentLat}&lng=${vessel.currentLng}`),
          fetch(`${BACKEND_URL}/api/mcp/recommend-fuel-stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: vessel.currentLat,
              lng: vessel.currentLng,
              fuelRemaining: Number(fuelRemaining),
              fuelConsumptionRate: Number(fuelConsumptionRate),
              destinationLat: 51.92,
              destinationLng: 4.48,
            }),
          }),
        ])
        if (riskRes.ok) setRiskData(await riskRes.json())
        if (weatherRes.ok) setWeatherData(await weatherRes.json())
        if (portRes.ok) {
          const portJson = await portRes.json()
          const recommendedFromList = portJson.allPorts?.find(p => p.isRecommended)
          const synthesizedRecommended = portJson.recommendedPort
            ? {
                name: portJson.recommendedPort,
                distance: portJson.distance,
                country: portJson.country,
                lat: portJson.lat,
                lng: portJson.lng,
              }
            : null
          setNearestPortData(recommendedFromList || synthesizedRecommended || portJson.allPorts?.[0] || null)
        }
      } catch (err) {
        console.error('Emergency data fetch error:', err)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [vessel, fuelRemaining, fuelConsumptionRate])

  const driftSpeedKn = weatherData ? (weatherData.windSpeed * 0.02 * 1.944) : 0
  const driftBearing = weatherData?.windDirection || 0
  const driftPerHourNm = driftSpeedKn * 1
  const driftDirection = weatherData ? `${driftPerHourNm.toFixed(1)} kn @ ${driftBearing}°` : 'Calculating…'

  const riskLevel = riskData ? (riskData.riskScore > 0.7 ? 'CRITICAL' : riskData.riskScore > 0.4 ? 'HIGH' : 'MODERATE') : 'ASSESSING'
  const riskColor = riskLevel === 'CRITICAL' ? 'var(--red-alert)' : riskLevel === 'HIGH' ? 'var(--amber-warn)' : '#FFC107'

  const shallowWaterRisk = nearestPortData ? (nearestPortData.distance < 50 ? 0.7 : nearestPortData.distance < 100 ? 0.4 : 0.1) : 0.1

  const generateRecommendations = () => {
    const recs = []
    recs.push('Broadcast PAN-PAN on VHF Channel 16')
    recs.push('Maintain AIS transmission for collision avoidance')

    if (weatherData?.windSpeed > 15) {
      recs.push(`Severe wind ${weatherData.windSpeed.toFixed(1)} m/s — drop anchor if depth permits`)
    } else if (weatherData?.windSpeed > 8) {
      recs.push('Moderate wind — consider anchoring to prevent uncontrolled drift')
    } else {
      recs.push('Conditions allow anchoring — drop anchor to prevent drift')
    }

    if (nearestPortData) {
      if (nearestPortData.distance > 200) {
        recs.push(`Nearest port ${nearestPortData.name} is ${nearestPortData.distance} NM — arrange towing assistance`)
      } else if (nearestPortData.distance > 50) {
        recs.push(`Nearest port ${nearestPortData.name} is ${nearestPortData.distance} NM — drift toward port if feasible`)
      } else {
        recs.push(`${nearestPortData.name} is only ${nearestPortData.distance} NM — prepare for emergency port entry`)
      }
    }

    if (riskData?.seaRisk > 0.5) recs.push('Rough sea state — secure all deck cargo and hatch covers')
    if (riskData?.weatherRisk > 0.5) recs.push('Adverse weather — reduce non-essential power to preserve battery')
    if (weatherData?.windDirection !== undefined) {
      recs.push(`Drift bearing ${driftBearing}° at ${driftPerHourNm.toFixed(1)} kn — monitor for shipping lanes`)
    }

    return recs
  }

  const recommendations = generateRecommendations()

  return (
    <div className="fo-emergency-card">
      <div className="fo-emergency-header">
        <span className="fo-emergency-icon">🚨</span>
        <span className="fo-emergency-title">Emergency Voyage Assistance</span>
      </div>

      <div className="fo-emergency-stats">
        <div className="fo-stat-box">
          <div className="fo-stat-label">Current Coordinates</div>
          <div className="fo-stat-value">{vessel?.currentLat?.toFixed(4)}°N, {vessel?.currentLng?.toFixed(4)}°E</div>
        </div>
        <div className="fo-stat-box">
          <div className="fo-stat-label">Drift Direction & Speed</div>
          <div className="fo-stat-value">{driftDirection}</div>
        </div>
        <div className="fo-stat-box">
          <div className="fo-stat-label">AIS Status</div>
          <div className="fo-stat-value" style={{ color: 'var(--red-alert)' }}>Not Under Command</div>
        </div>
        <div className="fo-stat-box">
          <div className="fo-stat-label">Risk Level</div>
          <div className="fo-stat-value" style={{ color: riskColor }}>{riskLevel}</div>
        </div>
      </div>

      <div className="fo-section">
        <div className="fo-section-title">Nearest Assistance</div>
        <div className="fo-assistance-list">
          <div className="fo-assistance-item">
            <span className="fo-assistance-label">Safe Harbor</span>
            <span className="fo-assistance-value">
              {nearestPortData ? `${nearestPortData.name} (${nearestPortData.distance} NM)` : 'Calculating…'}
            </span>
          </div>
          <div className="fo-assistance-item">
            <span className="fo-assistance-label">Anchorage</span>
            <span className="fo-assistance-value">
              {nearestPortData ? `${nearestPortData.name} harbor — ${nearestPortData.distance} NM` : 'Calculating…'}
            </span>
          </div>
          <div className="fo-assistance-item">
            <span className="fo-assistance-label">Nearest AIS Traffic</span>
            <span className="fo-assistance-value">
              {riskData?.weather?.condition === 'Fog' ? 'Reduced visibility — AIS critical' : 'Monitoring AIS transceivers'}
            </span>
          </div>
        </div>
      </div>

      {weatherData && (
        <div className="fo-section">
          <div className="fo-section-title">Weather & Sea Condition</div>
          <div className="fo-weather-tags">
            <span className="fo-badge fo-badge--cyan">{weatherData.weather}</span>
            <span className="fo-badge">Wind: {weatherData.windSpeed?.toFixed(1)} m/s</span>
            <span className="fo-badge">Temp: {weatherData.temp?.toFixed(1)}°C</span>
          </div>
        </div>
      )}

      <div className="fo-section">
        <div className="fo-section-title">AI Recommendations</div>
        <div className="fo-recommendations">
          {recommendations.map((rec, i) => (
            <div key={i} className="fo-recommendation-item">
              <span className="fo-recommendation-num">{i + 1}.</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {riskData && (
        <div className="fo-section">
          <div className="fo-section-title">Continuous Risk Monitoring</div>
          <div className="fo-risk-list">
            {[
              { label: 'Drift Trajectory', value: riskData.distanceRisk, color: riskData.distanceRisk > 0.6 ? 'var(--red-alert)' : 'var(--amber-warn)' },
              { label: 'Collision Risk', value: riskData.weatherRisk, color: riskData.weatherRisk > 0.6 ? 'var(--red-alert)' : 'var(--amber-warn)' },
              { label: 'Shallow Water Danger', value: shallowWaterRisk, color: shallowWaterRisk > 0.5 ? 'var(--red-alert)' : shallowWaterRisk > 0.3 ? 'var(--amber-warn)' : 'var(--green-signal)' },
              { label: 'Severe Weather', value: riskData.weatherRisk, color: riskData.weatherRisk > 0.5 ? 'var(--red-alert)' : 'var(--green-signal)' },
            ].map((item, i) => (
              <div key={i} className="fo-risk-item">
                <span>{item.label}</span>
                <span style={{ color: item.color, fontWeight: 700 }}>{Math.round(item.value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fo-section">
        <div className="fo-section-title">Emergency Actions</div>
        <div className="fo-emergency-actions">
          {[
            { label: 'Request Tow Assistance', icon: '🚢', color: 'var(--red-alert)' },
            { label: 'Transmit Distress Signal', icon: '📡', color: 'var(--red-alert)' },
            { label: 'Locate Safe Anchorage', icon: '⚓', color: 'var(--amber-warn)' },
            { label: 'Notify Maritime Authority', icon: '🏛️', color: '#FFC107' },
          ].map((action, i) => (
            <button key={i} className="fo-emergency-btn" style={{ borderColor: `${action.color}33`, color: action.color }}
              onClick={() => console.log(`[EMERGENCY] ${action.label} activated`)}>
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FuelOptimizer({ vessels, fuelRemaining, fuelConsumptionRate, isOutOfFuel, isZeroPorts: isZeroPortsFromApp, bunkerStops, onAddBunkerStop, onRefuelAtStop, onRemoveBunkerStop, onReachablePortsChange }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [selectedPort, setSelectedPort] = useState(null)
  const [manuallySelected, setManuallySelected] = useState(false)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)
  const manuallySelectedRef = useRef(false)
  const selectedPortNameRef = useRef(null)

  useEffect(() => { manuallySelectedRef.current = manuallySelected }, [manuallySelected])
  useEffect(() => { selectedPortNameRef.current = selectedPort?.name }, [selectedPort?.name])

  useEffect(() => {
    if (vessels?.length > 0 && !selectedVessel) setSelectedVessel(vessels[0])
  }, [vessels])

  useEffect(() => {
    if (selectedVessel) {
      const updated = vessels?.find(v => v.id === selectedVessel.id)
      if (updated) setSelectedVessel(updated)
    }
  }, [vessels])

  const fetchRecommendation = useCallback(async () => {
    if (!selectedVessel) return
    setLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/mcp/recommend-fuel-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedVessel.currentLat,
          lng: selectedVessel.currentLng,
          fuelRemaining: Number(fuelRemaining),
          fuelConsumptionRate: Number(fuelConsumptionRate),
          destinationLat: 51.92,
          destinationLng: 4.48,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRecommendation(data)
        if (!manuallySelectedRef.current) {
          const recommended = data.allPorts?.find(p => p.isRecommended) || data
          setSelectedPort(recommended)
        } else {
          const updatedPort = data.allPorts?.find(p => p.name === selectedPortNameRef.current)
          if (updatedPort) setSelectedPort(updatedPort)
        }
        onReachablePortsChange?.(typeof data.reachableCount === 'number' ? data.reachableCount : null)
      } else {
        console.error(data.error)
        onReachablePortsChange?.(null)
      }
    } catch (err) {
      console.error('Fuel recommendation fetch error:', err)
      onReachablePortsChange?.(null)
    } finally {
      setLoading(false)
    }
  }, [selectedVessel, fuelRemaining, fuelConsumptionRate, onReachablePortsChange])

  useEffect(() => {
    if (!selectedVessel) return
    fetchRecommendation()
    intervalRef.current = setInterval(fetchRecommendation, AUTO_REFRESH_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [selectedVessel?.id, fetchRecommendation, onReachablePortsChange])

  const fuelRangeNm = Number(fuelConsumptionRate) > 0 ? Math.round(Number(fuelRemaining) / Number(fuelConsumptionRate)) : 0
  const reachableCount = recommendation?.reachableCount ?? null
  const isLowPorts = reachableCount !== null && reachableCount <= 5 && reachableCount > 0
  const isZeroPorts = isZeroPortsFromApp || reachableCount === 0
  const reachedBunkerStops = bunkerStops?.filter(bs => bs.reached && !bs.refueled) || []

  const routeWaypoints = SINGAPORE_ROTTERDAM_ROUTE.waypoints
  const portsAlongRoute = useMemo(() => {
    if (!recommendation?.allPorts) return []
    return recommendation.allPorts
      .filter(p => {
        const routeDistance = Math.round(minDistanceToRoute(p.lat, p.lng, routeWaypoints))
        return routeDistance <= ROUTE_PROXIMITY_NM
      })
      .map(p => p.name)
  }, [recommendation?.allPorts])

  return (
    <div className="fo-container">
      {/* Emergency Alerts */}
      {isOutOfFuel && (
        <div className="fo-alert fo-alert--emergency">
          <span className="dot dot-red pulse"></span>
          EMERGENCY — Fuel depleted. Vessel stranded. Emergency Voyage Assistance activated.
        </div>
      )}

      {isZeroPorts && !isOutOfFuel && (
        <div className="fo-alert fo-alert--emergency">
          <span className="dot dot-red pulse"></span>
          EMERGENCY — No reachable ports ahead. Immediate assistance required.
        </div>
      )}

      {isLowPorts && !isOutOfFuel && (
        <div className="fo-alert fo-alert--urgent">
          <span className="dot dot-gold pulse"></span>
          URGENT — Select a bunker stop before options run out.
        </div>
      )}

      {/* Bunker stop reached */}
      {reachedBunkerStops.length > 0 && (
        <div className="fo-bunker-reached">
          <div className="fo-bunker-header">
            <span className="dot dot-cyan pulse"></span>
            BUNKER STOP REACHED
          </div>
          {reachedBunkerStops.map(bs => (
            <div key={bs.name} className="fo-bunker-item">
              <div>
                <div className="fo-bunker-name">{bs.name}</div>
                <div className="fo-bunker-sub">Vessel within 20 NM of port</div>
              </div>
              <button className="btn btn-primary fo-refuel-btn" onClick={() => onRefuelAtStop(bs.name)}>⛽ Refuel Here</button>
            </div>
          ))}
        </div>
      )}

      {/* Top Bar */}
      <div className="fo-top-bar">
        <div className="fo-vessel-chips">
          {vessels?.map(v => (
            <button key={v.id} className={`fo-vessel-chip ${selectedVessel?.id === v.id ? 'active' : ''}`}
              onClick={() => setSelectedVessel(v)}>
              <span className={`dot ${v.status === 'IN_TRANSIT' ? 'dot-cyan' : v.status === 'STRANDED' ? 'dot-red' : 'dot-gold'}`}></span>
              <span className="fo-vessel-name">{v.name}</span>
              <span className="fo-vessel-coords">{v.currentLat?.toFixed(2)}°N, {v.currentLng?.toFixed(2)}°E</span>
            </button>
          ))}
        </div>
        <div className="fo-actions">
          {loading && <span className="badge badge-cyan"><span className="spinner"></span> Updating…</span>}
          <span className="fo-auto-badge">Auto-refresh 5s</span>
          <button className="btn btn-primary" onClick={fetchRecommendation} disabled={loading}>🔄 Refresh Now</button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="fo-layout">
        {/* Left Sidebar */}
        <div className="fo-sidebar">
          {/* Vessel Parameters */}
          <div className="fo-card">
            <div className="fo-card-header">
              <svg className="fo-card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 6.34L2.1 2.1m17.9 9.9h-6m-6 0H2.1m16.12 4.24l4.24 4.24M6.34 17.66l-4.24 4.24"/>
              </svg>
              <span className="fo-card-title">Vessel Parameters</span>
            </div>
            <div className="fo-param-list">
              <div className="fo-param-item">
                <span className="fo-param-label">Current Coordinates</span>
                <span className="fo-param-value">{selectedVessel?.currentLat?.toFixed(3)}°N, {selectedVessel?.currentLng?.toFixed(3)}°E</span>
              </div>
              <div className="fo-param-item">
                <span className="fo-param-label">Fuel Remaining (Tonnes)</span>
                <span className="fo-param-value fo-param-value--strong">{Number(fuelRemaining).toFixed(1)} T</span>
              </div>
              <div className="fo-param-item">
                <span className="fo-param-label">Fuel Consumption (Tonnes/NM)</span>
                <span className="fo-param-value">{fuelConsumptionRate}</span>
              </div>
            </div>
          </div>

          {/* Fuel Range */}
          <div className="fo-card fo-range-card">
            <div className="fo-card-header">
              <svg className="fo-card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/>
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
              </svg>
              <span className="fo-card-title">Fuel Range Estimate</span>
            </div>
            <div className="fo-range-value" style={{
              color: fuelRangeNm < 500 ? 'var(--red-alert)' : fuelRangeNm < 1000 ? 'var(--amber-warn)' : 'var(--green-signal)'
            }}>
              {fuelRangeNm.toLocaleString()}
            </div>
            <div className="fo-range-label">NAUTICAL MILES RANGE</div>
            <div className="fo-range-bar">
              <div className="fo-range-fill" style={{
                width: `${Math.min((fuelRangeNm / 2000) * 100, 100)}%`,
                background: fuelRangeNm < 500 ? 'var(--red-alert)' : fuelRangeNm < 1000 ? 'var(--amber-warn)' : 'var(--green-signal)'
              }}></div>
            </div>
          </div>

          {/* Reachable Ports */}
          {recommendation && (
            <div className="fo-card fo-ports-card">
              <div className="fo-card-header">
                <svg className="fo-card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span className="fo-card-title">Reachable Ports Ahead</span>
              </div>
              <div className="fo-ports-count" style={{
                color: (isZeroPorts || isOutOfFuel) ? 'var(--red-alert)' : isLowPorts ? '#FFC107' : 'var(--green-signal)'
              }}>
                {reachableCount ?? '—'}
              </div>
              <div className="fo-ports-sub">of {recommendation.allPorts?.length ?? '—'} forward ports reachable</div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="fo-main">
          {(isOutOfFuel || isZeroPorts) ? (
            <EmergencyVoyageAssistance vessels={vessels} fuelRemaining={fuelRemaining} fuelConsumptionRate={fuelConsumptionRate} />
          ) : (
            <div className="fo-content">
              {recommendation ? (
                <>
                  {/* Selected Port Header */}
                  <div className="fo-selected-header">
                    <div className="fo-selected-icon">⛽</div>
                    <div className="fo-selected-title">Selected Refuel Port</div>
                  </div>

                  {/* Port Stats Grid */}
                  <div className="fo-stats-grid">
                    <div className="fo-stat-card">
                      <div className="fo-stat-label">SELECTED PORT</div>
                      <div className="fo-stat-value fo-stat-value--large">{selectedPort?.name || recommendation.recommendedPort}</div>
                      <div className="fo-stat-sub">{selectedPort?.country || recommendation.country}</div>
                    </div>
                    <div className="fo-stat-card">
                      <div className="fo-stat-label">DISTANCE</div>
                      <div className="fo-stat-value fo-stat-value--large">{(selectedPort?.distance ?? recommendation.distance)?.toLocaleString()}</div>
                      <div className="fo-stat-sub">Nautical Miles</div>
                    </div>
                    <div className="fo-stat-card">
                      <div className="fo-stat-label">EST. FUEL NEEDED</div>
                      <div className="fo-stat-value fo-stat-value--large">{selectedPort?.estimatedFuelNeeded ?? recommendation.estimatedFuelNeeded}</div>
                      <div className="fo-stat-sub">Tonnes</div>
                    </div>
                    <div className="fo-stat-card">
                      <div className="fo-stat-label">FUEL PRICE</div>
                      <div className="fo-stat-value fo-stat-value--large">${selectedPort?.fuelPrice ?? recommendation.fuelPrice}</div>
                      <div className="fo-stat-sub">Per Tonne</div>
                    </div>
                  </div>

                  {/* Add Bunker Stop Button */}
                  {selectedPort && selectedPort.reachable && !bunkerStops?.some(bs => bs.name === selectedPort.name) && bunkerStops?.filter(bs => !bs.refueled).length === 0 && (
                    <button className="fo-bunker-btn fo-bunker-btn--primary" onClick={() => onAddBunkerStop(selectedPort)}>
                      <span>⛽</span> Add as Bunker Stop
                    </button>
                  )}

                  {/* Replace Bunker Stop Button */}
                  {selectedPort && selectedPort.reachable && !bunkerStops?.some(bs => bs.name === selectedPort.name) && bunkerStops?.filter(bs => !bs.refueled).length > 0 && (
                    <button className="fo-bunker-btn fo-bunker-btn--warning" onClick={() => onAddBunkerStop(selectedPort)}>
                      <span>⛽</span> Replace Bunker Stop
                    </button>
                  )}

                  {/* Active Bunker Stop */}
                  {bunkerStops?.filter(bs => !bs.refueled).length > 0 && (
                    <div className="fo-active-bunker">
                      <div className="fo-active-bunker-info">
                        <span>⛽</span>
                        <span>{bunkerStops.filter(bs => !bs.refueled)[0]?.name}</span>
                        {bunkerStops.filter(bs => !bs.refueled)[0]?.reached && <span className="fo-reached-badge">REACHED</span>}
                      </div>
                      {!bunkerStops.filter(bs => !bs.refueled)[0]?.reached && (
                        <button className="fo-remove-btn" onClick={() => onRemoveBunkerStop?.()}>Remove</button>
                      )}
                    </div>
                  )}

                  {/* Port Comparison Matrix Header */}
                  <div className="fo-matrix-header">
                    <div>
                      <div className="fo-matrix-title">Port Comparison Matrix</div>
                      <div className="fo-matrix-subtitle">Forward ports only, sorted by estimated fuel requirement.</div>
                    </div>
                  </div>

                  {/* Scrollable Port List - Combined */}
                  <div className="fo-port-list">
                    {recommendation.allPorts.map((p, idx) => {
                      const isSelected = selectedPort?.name === p.name
                      const isFuelRisk = !p.reachable
                      const isAlreadyBunker = bunkerStops?.some(bs => bs.name === p.name && !bs.refueled)
                      const isAlongRoute = portsAlongRoute.includes(p.name)

                      return (
                        <div key={idx} className={`fo-port-item ${isSelected ? 'selected' : ''} ${isFuelRisk ? 'unreachable' : ''}`}
                          onClick={() => !isFuelRisk && (setSelectedPort(p), setManuallySelected(true))}>
                          {/* Column 1: Port Info */}
                          <div className="fo-port-main">
                            <div className="fo-port-name">
                              {p.name} {isSelected && <span className="fo-port-arrow">▸</span>}
                              {isAlreadyBunker && <span className="fo-port-tag fo-port-tag--bunker">BUNKER</span>}
                              {isFuelRisk && <span className="fo-port-tag fo-port-tag--risk">UNREACHABLE</span>}
                              {isAlongRoute && <span className="fo-port-tag fo-port-tag--route">ROUTE</span>}
                            </div>
                            <div className="fo-port-details">
                              {p.country} · {p.distance?.toLocaleString()} NM · Fees: ${p.portFees} · Fuel: ${p.fuelPrice}/T
                            </div>
                          </div>
                          {/* Column 2: Distance */}
                          <div className="fo-port-col">
                            <div className="fo-port-col-label">Distance</div>
                            <div className="fo-port-col-value">{p.distance?.toLocaleString()} NM</div>
                          </div>
                          {/* Column 3: Cost Profile */}
                          <div className="fo-port-col">
                            <div className="fo-port-col-label">Cost Profile</div>
                            <div className="fo-port-col-value">${p.portFees} + ${p.fuelPrice}/T</div>
                          </div>
                          {/* Column 4: Fuel Needed + Status */}
                          <div className="fo-port-fuel-col">
                            <div className="fo-port-fuel-value">{p.estimatedFuelNeeded}<span className="fo-port-fuel-unit"> T</span></div>
                            <div className={`fo-port-status ${isFuelRisk ? 'risk' : p.estimatedFuelNeeded > Number(fuelRemaining) * 0.8 ? 'warning' : 'ok'}`}>
                              {isFuelRisk ? '⚠ Fuel Risk' : p.estimatedFuelNeeded > Number(fuelRemaining) * 0.8 ? '⚡ Tight' : '✓ OK'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="fo-empty">
                  <div className="fo-empty-icon">⛽</div>
                  <div>Loading fuel stop analysis…</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'

export default function WeatherRisk({ vessels }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [weather, setWeather] = useState(null)
  const [marine, setMarine] = useState(null)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Independent parameters for each vessel
  const [fuelInputs, setFuelInputs] = useState({})
  const [destInputs, setDestInputs] = useState({})
  
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-select first vessel
  useEffect(() => {
    if (vessels?.length > 0 && !selectedVessel) {
      setSelectedVessel(vessels[0])
    }
  }, [vessels])

  // Update selected vessel position from live data
  useEffect(() => {
    if (selectedVessel) {
      const updated = vessels?.find(v => v.id === selectedVessel.id)
      if (updated) setSelectedVessel(updated)
    }
  }, [vessels])

  const currentFuel = selectedVessel ? (fuelInputs[selectedVessel.id] || '250') : '250'
  const currentDest = selectedVessel ? (destInputs[selectedVessel.id] || 'Singapore') : 'Singapore'

  const handleFuelChange = (e) => {
    if (!selectedVessel) return
    setFuelInputs(prev => ({ ...prev, [selectedVessel.id]: e.target.value }))
  }

  const handleDestChange = (e) => {
    if (!selectedVessel) return
    setDestInputs(prev => ({ ...prev, [selectedVessel.id]: e.target.value }))
  }

  // Fetch weather + risk when vessel changes, inputs change, or auto-refresh
  useEffect(() => {
    if (!selectedVessel) return
    
    // Debounce the fetch slightly to prevent spamming while typing fuel amount
    const timeoutId = setTimeout(() => {
      fetchData()
    }, 400)

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000) // refresh every 30s
    }

    return () => {
      clearTimeout(timeoutId)
      if (interval) clearInterval(interval)
    }
  }, [selectedVessel?.id, currentFuel, currentDest, autoRefresh])

  const fetchData = async () => {
    if (!selectedVessel) return
    setLoading(true)

    try {
      // Fetch weather
      const wRes = await fetch(
        `${BACKEND_URL}/api/weather?lat=${selectedVessel.currentLat}&lng=${selectedVessel.currentLng}`
      )
      const wData = await wRes.json()
      if (wRes.ok) setWeather(wData)

      // Fetch marine data
      try {
        const mRes = await fetch(
          `${BACKEND_URL}/api/weather/marine?lat=${selectedVessel.currentLat}&lng=${selectedVessel.currentLng}`
        )
        const mData = await mRes.json()
        if (mRes.ok) setMarine(mData)
      } catch {
        setMarine(null)
      }

      // Fetch risk analysis using continuous formula
      const rRes = await fetch(`${BACKEND_URL}/api/mcp/analyze-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedVessel.currentLat,
          lng: selectedVessel.currentLng,
          fuelRemaining: Number(currentFuel),
          destination: currentDest,
        }),
      })
      const rData = await rRes.json()
      if (rRes.ok) setRisk(rData)
    } catch (err) {
      console.error('Weather/Risk fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score) => {
    if (score > 0.7) return 'var(--red-alert)'
    if (score > 0.4) return 'var(--amber-warn)'
    return 'var(--green-signal)'
  }

  const getRiskLabel = (score) => {
    if (score > 0.7) return 'HIGH'
    if (score > 0.4) return 'MODERATE'
    return 'LOW'
  }

  const getWeatherIcon = (condition) => {
    const icons = {
      Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
      Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Haze: '🌫️',
      Fog: '🌫️', Storm: '🌪️',
    }
    return icons[condition] || '🌤️'
  }

  const getWindDirection = (deg) => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    return dirs[Math.round(deg / 22.5) % 16]
  }

  const riskScore = risk?.riskScore ?? 0
  const riskPct = Math.round(riskScore * 100)
  const riskColor = getRiskColor(riskScore)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Weather & Risk Intel</h1>
          <p className="page-subtitle">
            Live weather conditions and continuous AI voyage risk assessment
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading && (
            <span className="badge badge-cyan">
              <span className="spinner"></span> Updating…
            </span>
          )}
          <button
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ fontSize: 12 }}
          >
            {autoRefresh ? '🔄 Auto (30s)' : '⏸ Paused'}
          </button>
        </div>
      </div>

      {/* Vessel Selector */}
      <div className="wr-vessel-selector">
        {vessels?.map(v => (
          <button
            key={v.id}
            className={`wr-vessel-chip ${selectedVessel?.id === v.id ? 'active' : ''}`}
            onClick={() => setSelectedVessel(v)}
          >
            <span className={`dot ${v.status === 'IN_TRANSIT' ? 'dot-cyan' : 'dot-gold'}`}></span>
            <span style={{ fontWeight: 600 }}>{v.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {v.currentLat.toFixed(2)}°N, {v.currentLng.toFixed(2)}°E
            </span>
          </button>
        ))}
      </div>

      <div className="wr-grid">
        {/* Left Column: Weather + Marine + Inputs */}
        <div className="wr-left">
          {/* Weather Card */}
          <div className="card wr-weather-card">
            <div className="wr-card-header">
              <span>🌊 Current Weather</span>
              {weather && (
                <span className="badge badge-cyan">{selectedVessel?.name}</span>
              )}
            </div>
            {weather ? (
              <div className="wr-weather-body">
                <div className="wr-weather-main">
                  <span className="wr-weather-icon">{getWeatherIcon(weather.weather)}</span>
                  <div>
                    <div className="wr-temp">{weather.temp.toFixed(1)}°C</div>
                    <div className="wr-condition">{weather.weather}</div>
                  </div>
                </div>
                <div className="wr-weather-stats">
                  <div className="wr-weather-stat">
                    <div className="wr-weather-stat-label">Wind Speed</div>
                    <div className="wr-weather-stat-value">
                      {weather.windSpeed.toFixed(1)}
                      <span className="wr-weather-stat-unit"> m/s</span>
                      {weather.windDirection !== undefined && (
                        <span className="wr-weather-stat-unit" style={{marginLeft: 8}}>
                          🧭 {getWindDirection(weather.windDirection)} ({weather.windDirection}°)
                        </span>
                      )}
                    </div>
                    <div className="wr-wind-bar">
                      <div
                        className="wr-wind-fill"
                        style={{
                          width: `${Math.min((weather.windSpeed / 20) * 100, 100)}%`,
                          background: weather.windSpeed > 15 ? 'var(--red-alert)' : weather.windSpeed > 8 ? 'var(--amber-warn)' : 'var(--green-signal)',
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="wr-weather-stat">
                    <div className="wr-weather-stat-label">Temperature</div>
                    <div className="wr-weather-stat-value">
                      {weather.temp.toFixed(1)}
                      <span className="wr-weather-stat-unit"> °C</span>
                    </div>
                  </div>
                  {weather.humidity !== undefined && (
                    <div className="wr-weather-stat">
                      <div className="wr-weather-stat-label">Humidity</div>
                      <div className="wr-weather-stat-value">
                        {weather.humidity}
                        <span className="wr-weather-stat-unit"> %</span>
                      </div>
                    </div>
                  )}
                  <div className="wr-weather-stat">
                    <div className="wr-weather-stat-label">Coordinates</div>
                    <div className="wr-weather-stat-value" style={{ fontSize: 14 }}>
                      {selectedVessel?.currentLat.toFixed(3)}°N, {selectedVessel?.currentLng.toFixed(3)}°E
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>🌤️</div>
                <div>Select a vessel to view weather</div>
              </div>
            )}
          </div>

          {/* Marine Conditions Card */}
          {marine && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="wr-card-header">
                <span>🌊 Sea Conditions</span>
                <span className="badge" style={{
                  background: marine.waveHeight > 2.5 ? 'rgba(255,61,61,0.12)' : 'rgba(0,230,118,0.12)',
                  color: marine.waveHeight > 2.5 ? 'var(--red-alert)' : 'var(--green-signal)',
                  border: `1px solid ${marine.waveHeight > 2.5 ? 'rgba(255,61,61,0.3)' : 'rgba(0,230,118,0.3)'}`,
                }}>
                  {marine.waveHeight > 4 ? 'Rough' : marine.waveHeight > 2.5 ? 'Moderate' : 'Calm'}
                </span>
              </div>
              <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="wr-weather-stat">
                  <div className="wr-weather-stat-label">Wave Height</div>
                  <div className="wr-weather-stat-value">
                    {marine.waveHeight?.toFixed(1) ?? '—'}
                    <span className="wr-weather-stat-unit"> m</span>
                  </div>
                </div>
                <div className="wr-weather-stat">
                  <div className="wr-weather-stat-label">Wave Period</div>
                  <div className="wr-weather-stat-value">
                    {marine.wavePeriod?.toFixed(1) ?? '—'}
                    <span className="wr-weather-stat-unit"> s</span>
                  </div>
                </div>
                <div className="wr-weather-stat">
                  <div className="wr-weather-stat-label">Swell Height</div>
                  <div className="wr-weather-stat-value">
                    {marine.swellHeight?.toFixed(1) ?? '—'}
                    <span className="wr-weather-stat-unit"> m</span>
                  </div>
                </div>
                <div className="wr-weather-stat">
                  <div className="wr-weather-stat-label">Swell Period</div>
                  <div className="wr-weather-stat-value">
                    {marine.swellPeriod?.toFixed(1) ?? '—'}
                    <span className="wr-weather-stat-unit"> s</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Parameters */}
          <div className="card" style={{ padding: 20 }}>
            <div className="wr-card-header" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
              <span>⚙️ Risk Parameters</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Fuel Remaining (Tonnes)
                </label>
                <input
                  className="input"
                  type="number"
                  value={currentFuel}
                  onChange={handleFuelChange}
                  placeholder="e.g. 250"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Destination Port
                </label>
                <select
                  className="input"
                  value={currentDest}
                  onChange={handleDestChange}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Singapore">Singapore Port</option>
                  <option value="Port Klang">Port Klang, Malaysia</option>
                  <option value="Penang">Penang Port, Malaysia</option>
                  <option value="Jakarta">Jakarta Port, Indonesia</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Risk Analysis */}
        <div className="wr-right">
          {/* Risk Score Card */}
          <div className="card wr-risk-card" style={{ '--risk-color': riskColor }}>
            <div className="wr-card-header">
              <span>🛡️ Voyage Risk Assessment</span>
              {risk && (
                <span
                  className="badge"
                  style={{
                    background: `${riskColor}18`,
                    color: riskColor,
                    border: `1px solid ${riskColor}40`,
                  }}
                >
                  {getRiskLabel(riskScore)}
                </span>
              )}
            </div>

            {risk ? (
              <div className="wr-risk-body">
                {/* Score Ring */}
                <div className="wr-score-ring-container">
                  <svg viewBox="0 0 120 120" className="wr-score-ring">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--navy-700)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={riskColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${riskPct * 3.27} 327`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s' }}
                    />
                  </svg>
                  <div className="wr-score-text">
                    <div className="wr-score-number" style={{ color: riskColor }}>{riskPct}</div>
                    <div className="wr-score-label">Risk %</div>
                  </div>
                </div>

                {/* Distance to destination */}
                {risk.distanceToDestination && (
                  <div style={{
                    textAlign: 'center', marginBottom: 20,
                    fontSize: 13, color: 'var(--text-secondary)',
                  }}>
                    📍 {risk.distanceToDestination} NM to {currentDest}
                  </div>
                )}

                {/* Recommendation */}
                <div className="wr-recommendation" style={{ borderLeftColor: riskColor }}>
                  <div className="wr-rec-label">AI Recommendation</div>
                  <div className="wr-rec-text">{risk.recommendation}</div>
                </div>

                {/* Risk Breakdown */}
                <div className="wr-breakdown">
                  <div className="wr-breakdown-title">Risk Factor Breakdown</div>
                  
                  <div className="wr-factor">
                    <div className="wr-factor-header">
                      <span>🌬️ Weather</span>
                      <span style={{ color: getRiskColor(risk.weatherRisk), fontWeight: 600, fontSize: 12 }}>
                        {Math.round((risk.weatherRisk ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: `${(risk.weatherRisk ?? 0) * 100}%`,
                        background: getRiskColor(risk.weatherRisk),
                      }}></div>
                    </div>
                  </div>
                  
                  {risk.seaRisk !== undefined && (
                    <div className="wr-factor">
                      <div className="wr-factor-header">
                        <span>🌊 Sea State</span>
                        <span style={{ color: getRiskColor(risk.seaRisk), fontWeight: 600, fontSize: 12 }}>
                          {Math.round((risk.seaRisk ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="wr-factor-bar">
                        <div className="wr-factor-fill" style={{
                          width: `${(risk.seaRisk ?? 0) * 100}%`,
                          background: getRiskColor(risk.seaRisk),
                        }}></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="wr-factor">
                    <div className="wr-factor-header">
                      <span>⛽ Fuel Level</span>
                      <span style={{ color: getRiskColor(risk.fuelRisk), fontWeight: 600, fontSize: 12 }}>
                        {Math.round((risk.fuelRisk ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: `${(risk.fuelRisk ?? 0) * 100}%`,
                        background: getRiskColor(risk.fuelRisk),
                      }}></div>
                    </div>
                  </div>
                  
                  <div className="wr-factor">
                    <div className="wr-factor-header">
                      <span>📍 Distance</span>
                      <span style={{ color: getRiskColor(risk.distanceRisk), fontWeight: 600, fontSize: 12 }}>
                        {Math.round((risk.distanceRisk ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: `${(risk.distanceRisk ?? 0) * 100}%`,
                        background: getRiskColor(risk.distanceRisk),
                      }}></div>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {risk.alerts && risk.alerts.length > 0 && (
                  <div className="wr-alerts">
                    <div className="wr-breakdown-title">⚠️ Active Alerts</div>
                    {risk.alerts.map((alert, i) => (
                      <div key={i} className="wr-alert-item">
                        <span className="wr-alert-dot"></span>
                        {alert}
                      </div>
                    ))}
                  </div>
                )}

                {/* No alerts */}
                {risk.alerts && risk.alerts.length === 0 && (
                  <div className="wr-alerts wr-alerts-clear">
                    <span>✅</span> No active alerts — conditions are favorable
                  </div>
                )}
              </div>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>🛡️</div>
                <div>Run analysis to view risk assessment</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

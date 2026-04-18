import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'

export default function WeatherRisk({ vessels }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [weather, setWeather] = useState(null)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fuelInput, setFuelInput] = useState('250')
  const [destInput, setDestInput] = useState('Singapore')
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

  // Fetch weather + risk when vessel changes or auto-refresh
  useEffect(() => {
    if (!selectedVessel) return
    fetchData()

    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000) // refresh every 30s
      return () => clearInterval(interval)
    }
  }, [selectedVessel?.id, autoRefresh])

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

      // Fetch risk analysis
      const rRes = await fetch(`${BACKEND_URL}/api/mcp/analyze-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedVessel.currentLat,
          lng: selectedVessel.currentLng,
          fuelRemaining: Number(fuelInput),
          destination: destInput,
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

  const riskScore = risk?.riskScore ?? 0
  const riskPct = Math.round(riskScore * 100)
  const riskColor = getRiskColor(riskScore)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Weather & Risk Intel</h1>
          <p className="page-subtitle">
            Live weather conditions and AI voyage risk assessment
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
          <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
            Analyze Now
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
        {/* Left Column: Weather + Inputs */}
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
                    </div>
                    <div className="wr-wind-bar">
                      <div
                        className="wr-wind-fill"
                        style={{
                          width: `${Math.min((weather.windSpeed / 20) * 100, 100)}%`,
                          background: weather.windSpeed > 8 ? 'var(--red-alert)' : weather.windSpeed > 5 ? 'var(--amber-warn)' : 'var(--green-signal)',
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
                  value={fuelInput}
                  onChange={e => setFuelInput(e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Destination Port
                </label>
                <input
                  className="input"
                  type="text"
                  value={destInput}
                  onChange={e => setDestInput(e.target.value)}
                  placeholder="e.g. Singapore"
                />
              </div>
              <button className="btn btn-primary" onClick={fetchData} disabled={loading} style={{ marginTop: 4 }}>
                🧠 Run Risk Analysis
              </button>
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
                      <span style={{ color: weather?.windSpeed > 8 ? 'var(--red-alert)' : 'var(--green-signal)' }}>
                        {weather?.windSpeed > 8 ? 'Risky' : 'Normal'}
                      </span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: `${Math.min((weather?.windSpeed || 0) / 15 * 100, 100)}%`,
                        background: weather?.windSpeed > 8 ? 'var(--red-alert)' : 'var(--green-signal)',
                      }}></div>
                    </div>
                  </div>
                  <div className="wr-factor">
                    <div className="wr-factor-header">
                      <span>⛽ Fuel Level</span>
                      <span style={{ color: Number(fuelInput) < 100 ? 'var(--red-alert)' : 'var(--green-signal)' }}>
                        {Number(fuelInput) < 100 ? 'Low' : 'Adequate'}
                      </span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: `${Math.min((Number(fuelInput) / 500) * 100, 100)}%`,
                        background: Number(fuelInput) < 100 ? 'var(--red-alert)' : Number(fuelInput) < 200 ? 'var(--amber-warn)' : 'var(--green-signal)',
                      }}></div>
                    </div>
                  </div>
                  <div className="wr-factor">
                    <div className="wr-factor-header">
                      <span>📍 Distance</span>
                      <span style={{ color: 'var(--amber-warn)' }}>Standard</span>
                    </div>
                    <div className="wr-factor-bar">
                      <div className="wr-factor-fill" style={{
                        width: '40%',
                        background: 'var(--amber-warn)',
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

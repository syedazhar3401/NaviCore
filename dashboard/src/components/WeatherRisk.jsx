import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'

export default function WeatherRisk({ vessels, fuelRemaining, destination, isOutOfFuel }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [weather, setWeather] = useState(null)
  const [marine, setMarine] = useState(null)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(false)
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

  // Fetch weather + risk when vessel changes, fuel changes, or auto-refresh
  useEffect(() => {
    if (!selectedVessel) return

    const timeoutId = setTimeout(() => {
      fetchData()
    }, 400)

    let interval
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000)
    }

    return () => {
      clearTimeout(timeoutId)
      if (interval) clearInterval(interval)
    }
  }, [selectedVessel?.id, fuelRemaining, autoRefresh])

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

      // Fetch risk analysis
      const rRes = await fetch(`${BACKEND_URL}/api/mcp/analyze-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedVessel.currentLat,
          lng: selectedVessel.currentLng,
          fuelRemaining: Number(fuelRemaining),
          destination,
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
  const coarseCoords = selectedVessel ? `${selectedVessel.currentLat.toFixed(2)}°N, ${selectedVessel.currentLng.toFixed(2)}°E` : '—'
  const preciseCoords = selectedVessel ? `${selectedVessel.currentLat.toFixed(3)}°N, ${selectedVessel.currentLng.toFixed(3)}°E` : '—'
  const seaSeverity = marine?.waveHeight > 4 ? 'rough' : marine?.waveHeight > 2.5 ? 'moderate' : 'calm'
  const seaStateLabel = seaSeverity === 'rough' ? 'Rough' : seaSeverity === 'moderate' ? 'Moderate' : 'Calm'
  const riskFactors = [
    { key: 'weatherRisk', label: 'Weather', icon: 'weather', tone: 'blue' },
    { key: 'seaRisk', label: 'Sea State', icon: 'sea', tone: 'green' },
    { key: 'fuelRisk', label: 'Fuel Level', icon: 'fuel', tone: 'red' },
    { key: 'distanceRisk', label: 'Distance', icon: 'distance', tone: 'red' },
  ]

  const renderUiIcon = (icon, className = '') => {
    switch (icon) {
      case 'weather':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 10.5a2.5 2.5 0 0 1 0-5 3.3 3.3 0 0 1 6.2-.8A2.4 2.4 0 1 1 11.8 10.5" />
            <path d="M7 9.3L6 12h1.4L6.6 14" />
          </svg>
        )
      case 'sea':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 5.5c1.2 1.2 2.8 1.2 4 0 1.2-1.2 2.8-1.2 4 0 1.2 1.2 2.8 1.2 4 0" />
            <path d="M2 8.5c1.2 1.2 2.8 1.2 4 0 1.2-1.2 2.8-1.2 4 0 1.2 1.2 2.8 1.2 4 0" />
            <path d="M2 11.5c1.2 1.2 2.8 1.2 4 0 1.2-1.2 2.8-1.2 4 0 1.2 1.2 2.8 1.2 4 0" />
          </svg>
        )
      case 'fuel':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3.5h6v9H3z" />
            <path d="M5 6h2" />
            <path d="M9 5.5h2.2l1.3 1.4v4.1a1.4 1.4 0 1 1-2.8 0V8.8" />
            <path d="M3 12.5h6" />
          </svg>
        )
      case 'distance':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8h9" />
            <path d="M8.5 4.5L14 8l-5.5 3.5" />
          </svg>
        )
      case 'location':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 14s4-3.8 4-7a4 4 0 1 0-8 0c0 3.2 4 7 4 7z" />
            <circle cx="8" cy="7" r="1.2" />
          </svg>
        )
      case 'bolt':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.2 1.8L4.8 8h3.1l-1.1 6.2L11.2 8H8.1z" />
          </svg>
        )
      case 'sliders':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3.5v9M8 3.5v9M13 3.5v9" />
            <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="13" cy="5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        )
      case 'waveHeight':
      case 'swellHeight':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 8.2c1.2 1 2.8 1 4 0 1.2-1 2.8-1 4 0 1.2 1 2.8 1 4 0" />
          </svg>
        )
      case 'wavePeriod':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="5.2" />
            <path d="M8 5.4v3.1l2 1.4" />
          </svg>
        )
      case 'swellPeriod':
        return (
          <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2.8 3.5v9M6 3.5v9M9.2 3.5v9M12.4 3.5v9" />
          </svg>
        )
      default:
        return null
    }
  }

  const renderFactor = ({ key, label, icon, tone }) => {
    const value = risk?.[key]
    if (value === undefined || value === null) return null

    const percent = Math.round((value || 0) * 100)
    const color = getRiskColor(value)

    return (
      <div className="wr-factor-row" key={key}>
        <div className="wr-factor-row-top">
          <span className={`wr-factor-iconbox wr-factor-iconbox--${tone}`} aria-hidden="true">
            {renderUiIcon(icon, 'wr-factor-icon-svg')}
          </span>
          <span className="wr-factor-row-label">{label}</span>
          <span className="wr-factor-row-pct" style={{ color }}>{percent}%</span>
        </div>
        <div className="wr-factor-bar">
          <div className="wr-factor-fill" style={{ width: `${percent}%`, background: color }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="wr-intel">
      <div className="wr-toolbar">
        <div className="wr-toolbar-left">
          {isOutOfFuel ? (
            <div className="wr-stranded-banner">
              <span className="dot dot-red pulse" style={{ width: 8, height: 8, minWidth: 8 }}></span>
              VESSEL STRANDED — Fuel depleted. Risk analysis reflects stationary position.
            </div>
          ) : (
            <>
              <div className="wr-toolbar-title">Weather &amp; Risk Intel</div>
              <div className="wr-toolbar-subtitle">
                Live conditions for {selectedVessel?.name ?? 'your fleet'} · {coarseCoords}
              </div>
            </>
          )}
        </div>
        <div className="wr-toolbar-actions">
          {loading && (
            <span className="badge badge-cyan wr-loading-badge">
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

      <div className="wr-vessel-row">
        <div className="wr-vessel-row-header">
          <span className="wr-section-title">Vessel Focus</span>
          <span className="wr-section-hint">Tap a vessel to anchor weather &amp; risk insight</span>
        </div>
        <div className="wr-vessel-selector">
          {vessels?.map(v => (
            <button
              key={v.id}
              className={`wr-vessel-chip ${selectedVessel?.id === v.id ? 'active' : ''}`}
              onClick={() => setSelectedVessel(v)}
            >
              <span className={`dot ${v.status === 'IN_TRANSIT' ? 'dot-cyan' : v.status === 'STRANDED' ? 'dot-red' : 'dot-gold'}`}></span>
              <span className="wr-vessel-chip-name">{v.name}</span>
              <span className="wr-vessel-chip-coords">
                {v.currentLat.toFixed(2)}°N · {v.currentLng.toFixed(2)}°E
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="wr-grid">
        <div className="wr-column">
          <div className="card wr-weather-card">
            <div className="wr-card-header">
              <div>
                <div className="wr-card-kicker">Current Weather</div>
                <div className="wr-card-title">{selectedVessel?.name ?? 'Select a vessel'}</div>
              </div>
            </div>

            {weather ? (
              <>
                <div className="wr-weather-hero-v2">
                  <div className="wr-hero-icon">{getWeatherIcon(weather.weather)}</div>
                  <div className="wr-hero-body">
                    <div className="wr-temp-value">{weather.temp.toFixed(1)}°C</div>
                    <div className="wr-hero-condition-box">{weather.weather}</div>
                  </div>
                </div>

                <div className="wr-stat-grid">
                  <div className="wr-stat-card wr-stat-card--flat">
                    <div className="wr-stat-label">Wind</div>
                    <div className="wr-stat-value">
                      {weather.windSpeed.toFixed(1)} m/s
                    </div>
                    {weather.windDirection !== undefined && (
                      <div className="wr-stat-meta">
                        {getWindDirection(weather.windDirection)} · {weather.windDirection}°
                      </div>
                    )}
                    <div className="wr-wind-bar">
                      <div
                        className="wr-wind-fill"
                        style={{
                          width: `${Math.min((weather.windSpeed / 20) * 100, 100)}%`,
                          background: weather.windSpeed > 15
                            ? 'var(--red-alert)'
                            : weather.windSpeed > 8
                              ? 'var(--amber-warn)'
                              : 'var(--green-signal)',
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="wr-stat-card wr-stat-card--flat">
                    <div className="wr-stat-label">Temperature</div>
                    <div className="wr-stat-value">{weather.temp.toFixed(1)} °C</div>
                    <div className="wr-stat-meta">Sea level at vessel position</div>
                  </div>

                  {weather.humidity !== undefined && (
                    <div className="wr-stat-card wr-stat-card--flat">
                      <div className="wr-stat-label">Humidity</div>
                      <div className="wr-stat-value">{weather.humidity}%</div>
                      <div className="wr-stat-meta">Relative</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>🌤️</div>
                <div>Select a vessel to view weather</div>
              </div>
            )}
          </div>

          {marine && (
            <div className="card wr-sea-card">
              <div className="wr-sea-header">
                <div className="wr-sea-header-left">
                  <div className="wr-card-kicker">Sea Conditions</div>
                  <div className="wr-card-title">Regional swell response</div>
                </div>
                <span className={`wr-sea-badge wr-sea-badge--${seaSeverity}`}>{seaStateLabel}</span>
              </div>

              <div className="wr-sea-wave-strip" aria-hidden="true">
                <svg className="wr-sea-wave-svg" viewBox="0 0 1200 90" preserveAspectRatio="none">
                  <path
                    className="wr-sea-wave-fill"
                    d="M0,48 C120,18 220,78 340,48 C460,18 560,78 680,48 C800,18 900,78 1020,48 C1100,28 1150,32 1200,40 L1200,90 L0,90 Z"
                  />
                  <path
                    className="wr-sea-wave-stroke"
                    d="M0,48 C120,18 220,78 340,48 C460,18 560,78 680,48 C800,18 900,78 1020,48 C1100,28 1150,32 1200,40"
                  />
                </svg>
              </div>

              <div className="wr-sea-metrics">
                <div className={`wr-sea-mc wr-sea-mc--${seaSeverity}`}>
                  <div className="wr-sea-mc-head">
                    <span className="wr-sea-mc-icon" aria-hidden="true">{renderUiIcon('waveHeight', 'wr-sea-mc-icon-svg')}</span>
                    <div className="wr-sea-mc-label">Wave Height</div>
                  </div>
                  <div className="wr-sea-mc-value">{marine.waveHeight?.toFixed(1) ?? '—'} m</div>
                </div>
                <div className={`wr-sea-mc wr-sea-mc--${seaSeverity}`}>
                  <div className="wr-sea-mc-head">
                    <span className="wr-sea-mc-icon" aria-hidden="true">{renderUiIcon('wavePeriod', 'wr-sea-mc-icon-svg')}</span>
                    <div className="wr-sea-mc-label">Wave Period</div>
                  </div>
                  <div className="wr-sea-mc-value">{marine.wavePeriod?.toFixed(1) ?? '—'} s</div>
                </div>
                <div className={`wr-sea-mc wr-sea-mc--${seaSeverity}`}>
                  <div className="wr-sea-mc-head">
                    <span className="wr-sea-mc-icon" aria-hidden="true">{renderUiIcon('swellHeight', 'wr-sea-mc-icon-svg')}</span>
                    <div className="wr-sea-mc-label">Swell Height</div>
                  </div>
                  <div className="wr-sea-mc-value">{marine.swellHeight?.toFixed(1) ?? '—'} m</div>
                </div>
                <div className={`wr-sea-mc wr-sea-mc--${seaSeverity}`}>
                  <div className="wr-sea-mc-head">
                    <span className="wr-sea-mc-icon" aria-hidden="true">{renderUiIcon('swellPeriod', 'wr-sea-mc-icon-svg')}</span>
                    <div className="wr-sea-mc-label">Swell Period</div>
                  </div>
                  <div className="wr-sea-mc-value">{marine.swellPeriod?.toFixed(1) ?? '—'} s</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="wr-column wr-risk-column">
          <div className="card wr-risk-card" style={{ '--risk-color': riskColor }}>
            <div className="wr-card-header wr-risk-header">
              <div className="wr-card-kicker">Voyage Risk Assessment</div>
              {risk && (
                <span
                  className="wr-highlight-chip"
                  style={{
                    color: riskColor,
                    borderColor: `${riskColor}66`,
                    background: `${riskColor}14`,
                  }}
                >
                  {getRiskLabel(riskScore)}
                </span>
              )}
            </div>

            {risk ? (
              <>
                <div className="wr-risk-summary wr-risk-summary-minimal">
                  <div className="wr-score-gauge-container">
                    <svg viewBox="0 0 120 74" className="wr-score-gauge">
                      <path
                        d="M8 66 A52 52 0 0 1 112 66"
                        fill="none"
                        stroke="var(--navy-700)"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 66 A52 52 0 0 1 112 66"
                        fill="none"
                        stroke={riskColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${riskPct * 1.66} 166`}
                        style={{
                          transition: 'stroke-dasharray 0.8s ease, stroke 0.4s',
                          filter: `drop-shadow(0 0 6px ${riskColor}99)`,
                        }}
                      />
                    </svg>
                    <div className="wr-gauge-text">
                      <div className="wr-score-number" style={{ color: riskColor }}>{riskPct}</div>
                      <div className="wr-score-label">Risk %</div>
                    </div>
                  </div>
                </div>

                <div className="wr-dest-row">
                  <span className="wr-dest-icon" aria-hidden="true">{renderUiIcon('location', 'wr-dest-icon-svg')}</span>
                  <span className="wr-dest-label">Destination:</span>
                  <span className="wr-dest-value">{destination}</span>
                  <span className="wr-dest-dist">
                    {risk.distanceToDestination !== null && risk.distanceToDestination !== undefined
                      ? `${risk.distanceToDestination} NM`
                      : '—'}
                  </span>
                </div>

                <div
                  className="wr-recommendation-card"
                  style={{
                    borderLeftColor: riskColor,
                    borderColor: `${riskColor}33`,
                    background: `${riskColor}14`,
                  }}
                >
                  <div className="wr-rec-head">
                    <span className="wr-rec-icon" aria-hidden="true">{renderUiIcon('bolt', 'wr-rec-icon-svg')}</span>
                    <div className="wr-rec-label">AI Recommendation</div>
                  </div>
                  <div className="wr-rec-text">{risk.recommendation}</div>
                </div>

                <div className="wr-breakdown">
                  <div className="wr-breakdown-title">
                    <span className="wr-breakdown-icon" aria-hidden="true">{renderUiIcon('sliders', 'wr-breakdown-icon-svg')}</span>
                    Risk Factor Breakdown
                  </div>
                  <div className="wr-factor-list">
                    {riskFactors.map((factor) => renderFactor(factor))}
                  </div>
                </div>

                {risk.alerts && risk.alerts.length > 0 && (
                  <div className="wr-alert-panel">
                    <div className="wr-breakdown-title">Active Alerts</div>
                    <div className="wr-alert-list">
                      {risk.alerts.map((alert, i) => (
                        <div key={i} className="wr-alert-item">
                          <span className="wr-alert-dot"></span>
                          {alert}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>🛡️</div>
                <div>Select a vessel to view risk assessment</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


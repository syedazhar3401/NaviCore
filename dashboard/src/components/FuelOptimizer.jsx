import { useState, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'

export default function FuelOptimizer({ vessels }) {
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [fuelRemaining, setFuelRemaining] = useState('200')
  const [fuelConsumptionRate, setFuelConsumptionRate] = useState('0.15')
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (vessels?.length > 0 && !selectedVessel) {
      setSelectedVessel(vessels[0])
    }
  }, [vessels])

  // Update selected vessel from live data
  useEffect(() => {
    if (selectedVessel) {
      const updated = vessels?.find(v => v.id === selectedVessel.id)
      if (updated) setSelectedVessel(updated)
    }
  }, [vessels])

  const fetchRecommendation = async () => {
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
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRecommendation(data)
      } else {
        console.error(data.error)
      }
    } catch (err) {
      console.error('Fuel recommendation fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fuelRangeNm = Number(fuelConsumptionRate) > 0
    ? Math.round(Number(fuelRemaining) / Number(fuelConsumptionRate))
    : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Fuel Stop Optimizer</h1>
          <p className="page-subtitle">AI-powered logistics intelligence for optimal refueling</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loading && (
            <span className="badge badge-cyan">
              <span className="spinner"></span> Analyzing…
            </span>
          )}
          <button className="btn btn-primary" onClick={fetchRecommendation} disabled={loading}>
            ⛽ Get Recommendation
          </button>
        </div>
      </div>

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
              {v.currentLat?.toFixed(2)}°N, {v.currentLng?.toFixed(2)}°E
            </span>
          </button>
        ))}
      </div>

      <div className="wr-grid">
        <div className="wr-left">
          <div className="card" style={{ padding: 20 }}>
            <div className="wr-card-header" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
              <span>⚙️ Vessel Parameters</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Current Coordinates
                </label>
                <div className="input" style={{ background: 'var(--navy-900)', color: 'var(--text-muted)' }}>
                  {selectedVessel?.currentLat?.toFixed(3)}°N, {selectedVessel?.currentLng?.toFixed(3)}°E
                </div>
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Fuel Remaining (Tonnes)
                </label>
                <input
                  className="input"
                  type="number"
                  value={fuelRemaining}
                  onChange={e => setFuelRemaining(e.target.value)}
                  placeholder="e.g. 200"
                />
              </div>
              <div>
                <label className="stat-label" style={{ marginBottom: 6, display: 'block' }}>
                  Fuel Consumption (Tonnes/NM)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={fuelConsumptionRate}
                  onChange={e => setFuelConsumptionRate(e.target.value)}
                  placeholder="e.g. 0.15"
                />
              </div>
            </div>
          </div>

          {/* Fuel range indicator */}
          <div className="card" style={{ padding: 20 }}>
            <div className="wr-card-header" style={{ padding: 0, borderBottom: 'none', marginBottom: 16 }}>
              <span>📊 Fuel Range Estimate</span>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 40, fontWeight: 800,
                color: fuelRangeNm < 500 ? 'var(--red-alert)' : fuelRangeNm < 1000 ? 'var(--amber-warn)' : 'var(--green-signal)',
                lineHeight: 1
              }}>
                {fuelRangeNm.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Nautical Miles Range
              </div>
              <div className="wr-wind-bar" style={{ marginTop: 14 }}>
                <div className="wr-wind-fill" style={{
                  width: `${Math.min((fuelRangeNm / 2000) * 100, 100)}%`,
                  background: fuelRangeNm < 500 ? 'var(--red-alert)' : fuelRangeNm < 1000 ? 'var(--amber-warn)' : 'var(--green-signal)',
                }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="wr-right">
          <div className="card wr-risk-card" style={{ '--risk-color': 'var(--cyan-glow)' }}>
            <div className="wr-card-header">
              <span>🎯 Optimal Refuel Port</span>
            </div>
            {recommendation ? (
              <div className="wr-risk-body">
                <div className="wr-recommendation" style={{
                  borderLeftColor: recommendation.recommendation.includes('EMERGENCY')
                    ? 'var(--red-alert)'
                    : recommendation.recommendation.includes('URGENT')
                      ? 'var(--amber-warn)'
                      : 'var(--green-signal)'
                }}>
                  <div className="wr-rec-label">AI Recommendation</div>
                  <div className="wr-rec-text">{recommendation.recommendation}</div>
                </div>

                <div className="stat-grid" style={{ marginBottom: 20 }}>
                  <div className="card stat-card stat-card-green">
                    <div className="stat-label">Recommended Port</div>
                    <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}>{recommendation.recommendedPort}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{recommendation.country}</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Distance</div>
                    <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}>{recommendation.distance?.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nautical Miles</div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-label">Est. Fuel Needed</div>
                    <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}>{recommendation.estimatedFuelNeeded}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tonnes</div>
                  </div>
                  <div className="card stat-card stat-card-gold">
                    <div className="stat-label">Fuel Price</div>
                    <div className="stat-value" style={{ fontSize: 20, marginTop: 8 }}>${recommendation.fuelPrice}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Per Tonne</div>
                  </div>
                </div>

                <div className="wr-breakdown-title">Port Comparison Matrix</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recommendation.allPorts.map((p, idx) => (
                    <div key={idx} style={{
                      padding: 14,
                      borderRadius: 10,
                      background: p.isRecommended ? 'rgba(0, 230, 118, 0.08)' : 'var(--navy-800)',
                      border: `1px solid ${p.isRecommended ? 'var(--green-signal)' : 'var(--glass-border)'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.2s',
                    }}>
                      <div>
                        <div style={{
                          fontWeight: 600,
                          color: p.isRecommended ? 'var(--green-signal)' : 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          {p.name} {p.isRecommended && '✨'}
                          {!p.reachable && (
                            <span style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(255,61,61,0.15)', color: 'var(--red-alert)',
                              fontWeight: 700, letterSpacing: 0.5,
                            }}>UNREACHABLE</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {p.country} · {p.distance?.toLocaleString()} NM · Fees: ${p.portFees} · Fuel: ${p.fuelPrice}/T
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {p.estimatedFuelNeeded} T
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 500, marginTop: 2,
                          color: !p.reachable ? 'var(--red-alert)' : p.estimatedFuelNeeded > Number(fuelRemaining) * 0.8 ? 'var(--amber-warn)' : 'var(--green-signal)',
                        }}>
                          {!p.reachable ? '⚠ Fuel Risk' : p.estimatedFuelNeeded > Number(fuelRemaining) * 0.8 ? '⚡ Tight' : '✓ OK'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="wr-empty">
                <div style={{ fontSize: 32 }}>⛽</div>
                <div>Run analysis to find optimal refueling port</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

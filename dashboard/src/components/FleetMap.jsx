import { useState } from 'react'

// World map SVG path (simplified) + vessel coordinates mapped to SVG space
const MAP_W = 1000
const MAP_H = 500

// Rough equirectangular projection
function latLngToSVG(lat, lng) {
  const x = ((lng + 180) / 360) * MAP_W
  const y = ((90 - lat) / 180) * MAP_H
  return { x, y }
}

const ROUTES = [
  { from: { lat: 1.264, lng: 103.84 }, to: { lat: 51.949, lng: 4.144 } },
]

const STATUS_COLORS = {
  'IN_TRANSIT': 'var(--cyan-glow)',
  'AT_PORT': 'var(--gold)',
  'MAINTENANCE': 'var(--red-alert)',
}

export default function FleetMap({ vessels, feedEvents }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Fleet Map</h1>
          <p className="page-subtitle">Live vessel positions — updating every 3 seconds</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-green"><span className="dot dot-green"></span>Live Tracking</span>
          <span className="badge badge-cyan">{vessels.length} Vessels</span>
        </div>
      </div>

      <div className="fleet-layout">
        {/* Map Panel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span>🌏</span> Indian Ocean — South Asia Region
          </div>
          <div className="map-container" style={{ height: 420, borderRadius: 0 }}>
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="map-svg" style={{ background: 'var(--navy-900)' }}>
              {/* Ocean grid lines */}
              {Array.from({ length: 10 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * 50} x2={MAP_W} y2={i * 50}
                  stroke="rgba(0,212,255,0.04)" strokeWidth={1} />
              ))}
              {Array.from({ length: 20 }, (_, i) => (
                <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={MAP_H}
                  stroke="rgba(0,212,255,0.04)" strokeWidth={1} />
              ))}

              {/* Route lines */}
              {ROUTES.map((r, i) => {
                const from = latLngToSVG(r.from.lat, r.from.lng)
                const to = latLngToSVG(r.to.lat, r.to.lng)
                return (
                  <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="rgba(0,212,255,0.2)" strokeWidth={1.5} strokeDasharray="6,4" />
                )
              })}

              {/* Port markers */}
              {[
                { name: 'Singapore', lat: 1.264, lng: 103.84 },
                { name: 'Rotterdam', lat: 51.949, lng: 4.144 },
                { name: 'Dubai', lat: 25.2, lng: 55.27 },
              ].map(port => {
                const pos = latLngToSVG(port.lat, port.lng)
                return (
                  <g key={port.name}>
                    <circle cx={pos.x} cy={pos.y} r={5} fill="var(--gold)" opacity={0.9} />
                    <text x={pos.x + 8} y={pos.y + 4} fill="var(--gold)" fontSize={10} fontFamily="Inter">{port.name}</text>
                  </g>
                )
              })}

              {/* Vessel markers */}
              {vessels.map(v => {
                const pos = latLngToSVG(v.currentLat, v.currentLng)
                const color = STATUS_COLORS[v.status] || 'var(--text-secondary)'
                return (
                  <g key={v.id} className="vessel-marker"
                    onMouseEnter={() => setHovered(v)}
                    onMouseLeave={() => setHovered(null)}>
                    {/* Pulse ring */}
                    {v.status === 'IN_TRANSIT' && (
                      <circle cx={pos.x} cy={pos.y} r={14} fill="none" stroke={color} strokeWidth={1} opacity={0.3}>
                        <animate attributeName="r" from="8" to="20" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={pos.x} cy={pos.y} r={7} fill={color} />
                    <text x={pos.x + 10} y={pos.y - 8} fill={color} fontSize={11} fontWeight="700" fontFamily="Space Grotesk">{v.name}</text>
                    <text x={pos.x + 10} y={pos.y + 4} fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="Inter">{v.status}</text>
                  </g>
                )
              })}

              {/* Tooltip */}
              {hovered && (() => {
                const pos = latLngToSVG(hovered.currentLat, hovered.currentLng)
                return (
                  <g>
                    <rect x={pos.x + 14} y={pos.y - 40} width={170} height={54} rx={6}
                      fill="rgba(6,15,30,0.95)" stroke="rgba(0,212,255,0.3)" strokeWidth={1} />
                    <text x={pos.x + 22} y={pos.y - 22} fill="var(--cyan-glow)" fontSize={12} fontWeight="700" fontFamily="Space Grotesk">{hovered.name}</text>
                    <text x={pos.x + 22} y={pos.y - 6} fill="#7a93b4" fontSize={10} fontFamily="Inter">Lat: {hovered.currentLat.toFixed(3)} Lng: {hovered.currentLng.toFixed(3)}</text>
                    <text x={pos.x + 22} y={pos.y + 8} fill="#7a93b4" fontSize={10} fontFamily="Inter">Status: {hovered.status}</text>
                  </g>
                )
              })()}
            </svg>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span><span style={{ color: 'var(--cyan-glow)' }}>●</span> In Transit</span>
            <span><span style={{ color: 'var(--gold)' }}>●</span> At Port</span>
            <span><span style={{ color: 'var(--red-alert)' }}>●</span> Maintenance</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>GPS positions updating every 3s</span>
          </div>
        </div>

        {/* Live Feed Preview */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="feed-live-header">
            <span className="dot dot-green" style={{ minWidth: 8, animation: feedEvents.length > 0 ? 'pulse-badge 1.5s infinite' : 'none' }}></span>
            Live Scan Feed
            {feedEvents.length > 0 && <span className="badge badge-cyan" style={{ marginLeft: 'auto' }}>{feedEvents.length}</span>}
          </div>
          <div className="feed-container">
            {feedEvents.length === 0
              ? (
                <div className="feed-empty">
                  <div style={{ fontSize: 36 }}>📡</div>
                  <div style={{ fontWeight: 600 }}>Monitoring Active</div>
                  <div style={{ fontSize: 12 }}>Waiting for deckhand scans…</div>
                </div>
              )
              : feedEvents.slice(0, 8).map((e, i) => (
                <div key={e.id} className={`feed-item ${i === 0 ? 'slide-in' : ''}`}>
                  <div className="feed-icon">📦</div>
                  <div style={{ flex: 1 }}>
                    <div className="feed-qr">{e.qrCode}</div>
                    <div className="feed-time">{e.timestamp}</div>
                  </div>
                  <span className={`badge badge-${e.status === 'LOADED' ? 'green' : e.status === 'OFFLOADED' ? 'gold' : e.status === 'DAMAGED' ? 'red' : 'cyan'}`}>
                    {e.status}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Vessel stat cards */}
      <div className="stat-grid" style={{ marginTop: 20 }}>
        {vessels.map(v => (
          <div key={v.id} className="card stat-card">
            <div className="stat-label">{v.name}</div>
            <div className="stat-value" style={{ fontSize: 16, marginTop: 8, color: STATUS_COLORS[v.status] }}>
              {v.status.replace('_', ' ')}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              {v.currentLat.toFixed(3)}°N, {v.currentLng.toFixed(3)}°E
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

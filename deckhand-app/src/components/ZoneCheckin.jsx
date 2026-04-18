import { useState } from 'react'

const ZONES = [
  { id: 'bridge', icon: '🧭', name: 'Bridge', desc: 'Navigation & command' },
  { id: 'engine', icon: '⚙️', name: 'Engine Room', desc: 'Propulsion & power' },
  { id: 'port-deck', icon: '🪝', name: 'Port Deck', desc: 'Port-side operations' },
  { id: 'cargo-hold', icon: '📦', name: 'Cargo Hold', desc: 'Cargo management' },
  { id: 'starboard', icon: '⚓', name: 'Starboard Deck', desc: 'Starboard operations' },
  { id: 'galley', icon: '🍽️', name: 'Galley', desc: 'Crew mess & rest' },
]

export default function ZoneCheckin({ crewName, showToast }) {
  const [checkedIn, setCheckedIn] = useState(null)

  const checkIn = (zone) => {
    setCheckedIn(zone)
    showToast(`Checked into ${zone.name}`)
  }

  const checkOut = () => {
    showToast(`Checked out of ${checkedIn.name}`)
    setCheckedIn(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20 }}>Zone Check-In</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Tap your current location to log your position</p>
      </div>

      {checkedIn && (
        <div className="card" style={{ padding: 20, marginBottom: 16, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36 }}>{checkedIn.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{checkedIn.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Currently checked in · {crewName}</div>
            </div>
            <span className="badge badge-green">Active</span>
          </div>
          <button className="btn" style={{ marginTop: 16, background: 'rgba(255,61,61,0.1)', color: 'var(--red-alert)', border: '1px solid rgba(255,61,61,0.25)' }} onClick={checkOut}>
            Check Out
          </button>
        </div>
      )}

      <div className="zone-grid">
        {ZONES.map(zone => (
          <button
            key={zone.id}
            className={`zone-btn ${checkedIn?.id === zone.id ? 'active' : ''}`}
            onClick={() => checkIn(zone)}
          >
            <div className="zone-icon">{zone.icon}</div>
            <div className="zone-name">{zone.name}</div>
            <div className="zone-count">{zone.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

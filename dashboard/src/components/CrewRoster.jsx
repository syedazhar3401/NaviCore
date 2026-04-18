const CREW = [
  { id: 1, name: 'Captain Ahab', role: 'Captain', zone: 'Bridge', shiftStart: '06:00', avatar: '👨‍✈️' },
  { id: 2, name: 'Jane Doe', role: 'Chief Engineer', zone: 'Engine Room', shiftStart: '08:00', avatar: '👩‍🔧' },
  { id: 3, name: 'John Smith', role: 'Deckhand', zone: 'Port Deck', shiftStart: '06:00', avatar: '👷' },
  { id: 4, name: 'Maria Santos', role: 'Navigation Officer', zone: 'Bridge', shiftStart: '14:00', avatar: '👩‍✈️' },
  { id: 5, name: 'Arjun Patel', role: 'Cargo Handler', zone: 'Cargo Hold', shiftStart: '08:00', avatar: '🦺' },
  { id: 6, name: 'Lee Wei', role: 'Chief Mate', zone: 'Bridge', shiftStart: '06:00', avatar: '🧑‍✈️' },
]

const ZONE_COLORS = {
  'Bridge': 'badge-cyan',
  'Engine Room': 'badge-amber',
  'Port Deck': 'badge-green',
  'Cargo Hold': 'badge-gold',
  'Starboard Deck': 'badge-cyan',
}

export default function CrewRoster() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Crew Roster</h1>
          <p className="page-subtitle">Active crew, zone assignments, and watch schedules</p>
        </div>
        <span className="badge badge-green">{CREW.length} On Duty</span>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {['Bridge', 'Engine Room', 'Port Deck', 'Cargo Hold'].map(zone => (
          <div key={zone} className="card stat-card">
            <div className="stat-label">{zone}</div>
            <div className="stat-value" style={{ marginTop: 8, fontSize: 22 }}>
              {CREW.filter(c => c.zone === zone).length}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>personnel</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>👥</span> Active Watch — NaviCore One
        </div>
        <div>
          {CREW.map((crew, i) => (
            <div key={crew.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              borderBottom: i < CREW.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-800)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ fontSize: 28, width: 40, textAlign: 'center' }}>{crew.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{crew.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{crew.role}</div>
              </div>
              <span className={`badge ${ZONE_COLORS[crew.zone] || 'badge-cyan'}`}>📍 {crew.zone}</span>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', minWidth: 80 }}>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600 }}>{crew.shiftStart}</div>
                <div style={{ color: 'var(--text-muted)' }}>shift start</div>
              </div>
              <div className="dot dot-green" style={{ marginLeft: 8 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

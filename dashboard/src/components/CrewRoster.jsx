const ZONE_COLORS = {
  'Bridge': 'badge-cyan',
  'Engine Room': 'badge-amber',
  'Port Deck': 'badge-green',
  'Cargo Hold': 'badge-gold',
  'Starboard Deck': 'badge-cyan',
}

export default function CrewRoster({ crew }) {
  const dailyCrewCost = crew.reduce((sum, c) => sum + c.dailyRate, 0)
  const zones = ['Bridge', 'Engine Room', 'Port Deck', 'Cargo Hold']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-green">{crew.length} On Duty</span>
          <span className="badge badge-gold">${dailyCrewCost.toLocaleString()}/day</span>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {zones.map(zone => {
          const zoneCrew = crew.filter(c => c.zone === zone)
          const zoneDaily = zoneCrew.reduce((s, c) => s + c.dailyRate, 0)
          return (
            <div key={zone} className="card stat-card">
              <div className="stat-label">{zone}</div>
              <div className="stat-value" style={{ marginTop: 8, fontSize: 22 }}>
                {zoneCrew.length}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                {zoneCrew.length} personnel · ${zoneDaily.toLocaleString()}/day
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>👥</span> Active Watch — NaviCore One
        </div>
        <div>
          {crew.map((c, i) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              borderBottom: i < crew.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-800)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ fontSize: 28, width: 40, textAlign: 'center' }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.role}</div>
              </div>
              <span className={`badge ${ZONE_COLORS[c.zone] || 'badge-cyan'}`}>📍 {c.zone}</span>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', minWidth: 80 }}>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600 }}>{c.shiftStart}</div>
                <div style={{ color: 'var(--text-muted)' }}>shift start</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 15, color: 'var(--gold)', minWidth: 80, fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                ${c.dailyRate}/day
              </div>
              <div className="dot dot-green" style={{ marginLeft: 8 }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

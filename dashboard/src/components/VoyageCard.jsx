const MOCK_VOYAGE = {
  id: 'v001',
  vessel: 'NaviCore One',
  origin: 'Port of Singapore',
  destination: 'Port of Rotterdam',
  status: 'ONGOING',
  eta: '2026-05-02',
  cargo: [
    { qrCode: 'QR-CA-001', contents: 'Electronics', weightKg: 12500, owner: 'TechCorp', loadStatus: 'LOADED', destinationPort: 'Port of Rotterdam' },
    { qrCode: 'QR-CA-002', contents: 'Textiles', weightKg: 8000, owner: 'GlobalFabrics', loadStatus: 'SECURED', destinationPort: 'Port of Rotterdam' },
    { qrCode: 'QR-CA-003', contents: 'Machinery', weightKg: 15000, owner: 'HeavyInd', loadStatus: 'MANIFESTED', destinationPort: 'Port of Rotterdam' },
  ]
}

const STATUS_MAP = {
  LOADED: 'badge-green',
  SECURED: 'badge-cyan',
  MANIFESTED: 'badge-gold',
  OFFLOADED: 'badge-amber',
  DAMAGED: 'badge-red',
}

export default function VoyageCard() {
  const v = MOCK_VOYAGE
  const totalWeight = v.cargo.reduce((a, c) => a + c.weightKg, 0)
  const loadedCount = v.cargo.filter(c => ['LOADED', 'SECURED'].includes(c.loadStatus)).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Voyage Overview</h1>
          <p className="page-subtitle">Active voyage manifest and cargo status</p>
        </div>
        <span className="badge badge-green"><span className="dot dot-green"></span> In Transit</span>
      </div>

      {/* Voyage info */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 24 }}>
          <div>
            <div className="stat-label">Vessel</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, marginTop: 6, color: 'var(--cyan-glow)' }}>{v.vessel}</div>
          </div>
          <div>
            <div className="stat-label">Origin</div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>📍 {v.origin}</div>
          </div>
          <div>
            <div className="stat-label">Destination</div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>🏁 {v.destination}</div>
          </div>
          <div>
            <div className="stat-label">ETA</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, marginTop: 6, color: 'var(--gold)' }}>
              {new Date(v.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            <span>Cargo Loaded</span>
            <span>{loadedCount}/{v.cargo.length} items</span>
          </div>
          <div style={{ height: 6, background: 'var(--navy-700)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(loadedCount / v.cargo.length) * 100}%`, background: 'linear-gradient(90deg, var(--cyan-glow), var(--green-signal))', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="card stat-card">
          <div className="stat-label">Total Cargo Items</div>
          <div className="stat-value" style={{ marginTop: 8, color: 'var(--cyan-glow)' }}>{v.cargo.length}</div>
        </div>
        <div className="card stat-card stat-card-gold">
          <div className="stat-label">Total Weight</div>
          <div className="stat-value" style={{ marginTop: 8, color: 'var(--gold)' }}>{(totalWeight / 1000).toFixed(1)}t</div>
        </div>
        <div className="card stat-card stat-card-green">
          <div className="stat-label">Items Secured</div>
          <div className="stat-value" style={{ marginTop: 8, color: 'var(--green-signal)' }}>{loadedCount}</div>
        </div>
      </div>

      {/* Cargo manifest table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📋</span> Cargo Manifest
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--navy-800)', borderBottom: '1px solid var(--border)' }}>
              {['QR Code', 'Contents', 'Weight', 'Owner', 'Destination', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.cargo.map((c, i) => (
              <tr key={c.qrCode} style={{ borderBottom: i < v.cargo.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'Space Grotesk', fontWeight: 700, color: 'var(--cyan-glow)', fontSize: 13 }}>{c.qrCode}</td>
                <td style={{ padding: '14px 16px', fontWeight: 500 }}>{c.contents}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.weightKg.toLocaleString()} kg</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.owner}</td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{c.destinationPort}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span className={`badge ${STATUS_MAP[c.loadStatus] || 'badge-cyan'}`}>{c.loadStatus}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

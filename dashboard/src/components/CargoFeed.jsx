const STATUS_ICON = {
  LOADED: '📦',
  SECURED: '🔒',
  MANIFESTED: '📋',
  OFFLOADED: '✅',
  DAMAGED: '⚠️',
}

const STATUS_BADGE = {
  LOADED: 'badge-green',
  SECURED: 'badge-cyan',
  MANIFESTED: 'badge-gold',
  OFFLOADED: 'badge-amber',
  DAMAGED: 'badge-red',
}

export default function CargoFeed({ events }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Live Loading Feed</h1>
          <p className="page-subtitle">Real-time webhook feed from deckhand QR scans</p>
        </div>
        {events.length > 0 && (
          <span className="badge badge-green">
            <span className="dot dot-green"></span>
            {events.length} events received
          </span>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="feed-live-header">
          <span className="dot dot-green" style={{ minWidth: 8 }}></span>
          Live WebSocket Feed
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {events.length > 0 ? `Last: ${events[0]?.timestamp}` : 'Monitoring…'}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="feed-empty">
            <div style={{ fontSize: 48 }}>📡</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Monitoring Active</div>
            <div style={{ fontSize: 13, maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
              Open the Deckhand App and scan a QR code to see it appear here in real time.
            </div>
            <div style={{ marginTop: 12, padding: '10px 20px', background: 'var(--navy-800)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              POST /api/cargo/scan → WebSocket → here
            </div>
          </div>
        ) : (
          <div className="feed-container">
            {events.map((e, i) => (
              <div key={e.id} className={`feed-item ${i === 0 ? 'slide-in' : ''}`}>
                <div style={{ fontSize: 24 }}>{STATUS_ICON[e.status] || '📦'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, color: 'var(--cyan-glow)' }}>
                    {e.qrCode}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Voyage {e.voyageId?.slice(0, 8) ?? '—'} · {e.timestamp}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[e.status] || 'badge-cyan'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

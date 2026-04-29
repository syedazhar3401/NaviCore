import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'fleet', icon: '🗺️', label: 'Fleet Map', section: 'OVERVIEW' },
  { id: 'voyage', icon: '⚓', label: 'Voyage Overview', section: 'OVERVIEW' },
  { id: 'weather', icon: '🌊', label: 'Weather & Risk', section: 'INTELLIGENCE' },
  { id: 'fuel', icon: '⛽', label: 'Fuel Stop Optimizer', section: 'INTELLIGENCE' },
  { id: 'news', icon: '📰', label: 'Maritime News', section: 'INTELLIGENCE' },
  { id: 'cost', icon: '💰', label: 'Cost Ledger', section: 'OPERATIONS' },
  { id: 'arrangement', icon: '📦', label: 'Cargo Arrangement', section: 'OPERATIONS' },
  { id: 'feed', icon: '📡', label: 'Loading Feed', section: 'LIVE' },
  { id: 'crew', icon: '👥', label: 'Crew Roster', section: 'LIVE' },
]

export default function Sidebar({ activeView, onNavigate, feedEvents, connectionStatus }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))]

  const statusConfig = {
    connected: { class: 'dot-green', text: 'All Systems Operational', bg: 'rgba(0, 230, 118, 0.06)', color: 'var(--green-signal)' },
    disconnected: { class: 'dot-red', text: 'Connection Lost', bg: 'rgba(255, 61, 61, 0.06)', color: 'var(--red-alert)' },
    reconnecting: { class: 'dot-amber', text: 'Reconnecting…', bg: 'rgba(240, 180, 41, 0.06)', color: 'var(--amber-warn)' },
    connecting: { class: 'dot-cyan', text: 'Connecting…', bg: 'rgba(0, 212, 255, 0.06)', color: 'var(--cyan-glow)' },
  }

  const status = statusConfig[connectionStatus] || statusConfig.connecting

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">N</div>
          <div>
            <div className="logo-text">NaviCore</div>
            <div className="logo-sub">Maritime OS</div>
          </div>
        </div>
      </div>

      <div className="sidebar-status" style={{ background: status.bg, color: status.color }}>
        <span className={`dot ${status.class} pulse`} style={{ width: 8, height: 8, minWidth: 8 }}></span>
        {status.text}
      </div>

      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {NAV_ITEMS.filter(i => i.section === section).map(item => (
              <button
                key={item.id}
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
                {item.id === 'feed' && feedEvents.length > 0 && (
                  <span className="nav-badge">{feedEvents.length}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-time">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · UTC+8
        </div>
      </div>
    </aside>
  )
}

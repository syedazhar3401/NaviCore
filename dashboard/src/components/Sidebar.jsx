import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'fleet', icon: '🗺️', label: 'Fleet Map', section: 'OVERVIEW' },
  { id: 'voyage', icon: '⚓', label: 'Voyage Overview', section: 'OVERVIEW' },
  { id: 'cost', icon: '💰', label: 'Cost Ledger', section: 'OPERATIONS' },
  { id: 'cargo', icon: '🧠', label: 'AI Cargo Optimizer', section: 'OPERATIONS' },
  { id: 'feed', icon: '📡', label: 'Loading Feed', section: 'LIVE' },
  { id: 'crew', icon: '👥', label: 'Crew Roster', section: 'LIVE' },
]

export default function Sidebar({ activeView, onNavigate, feedEvents }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))]

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

      <div className="sidebar-status">
        <span className="dot dot-green pulse" style={{ width: 8, height: 8, minWidth: 8 }}></span>
        All Systems Operational
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

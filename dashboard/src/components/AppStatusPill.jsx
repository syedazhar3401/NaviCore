import { useEffect, useState } from 'react'

const statusConfig = {
  connected: { class: 'dot-green', text: 'All Systems Operational', color: 'var(--green-signal)' },
  disconnected: { class: 'dot-red', text: 'Connection Lost', color: 'var(--red-alert)' },
  reconnecting: { class: 'dot-amber', text: 'Reconnecting…', color: 'var(--amber-warn)' },
  connecting: { class: 'dot-cyan', text: 'Connecting…', color: 'var(--cyan-glow)' },
}

export default function AppStatusPill({ connectionStatus }) {
  const [time, setTime] = useState(new Date())
  const status = statusConfig[connectionStatus] || statusConfig.connecting

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="app-status-pill" style={{ '--status-color': status.color }}>
      <div className="status-logo-icon">N</div>
      <div className="status-brand">
        <div className="status-brand-name">NaviCore</div>
        <div className="status-brand-sub">Maritime OS</div>
      </div>
      <div className="status-pill-divider" />
      <div className="status-indicator">
        <span className={`dot ${status.class} pulse`} />
        <span>{status.text}</span>
      </div>
      <div className="status-pill-divider" />
      <div className="status-clock">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
    </div>
  )
}

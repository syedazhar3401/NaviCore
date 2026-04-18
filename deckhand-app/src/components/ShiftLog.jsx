import { useState, useEffect } from 'react'

export default function ShiftLog({ crewName }) {
  const [clockedIn, setClockedIn] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let interval
    if (clockedIn) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [clockedIn, startTime])

  const clockIn = () => {
    const now = Date.now()
    setStartTime(now)
    setClockedIn(true)
    setElapsed(0)
  }

  const clockOut = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000)
    const hours = (duration / 3600).toFixed(2)
    setLogs(prev => [{
      id: Date.now(),
      start: new Date(startTime).toLocaleTimeString(),
      end: new Date().toLocaleTimeString(),
      duration: formatTime(duration),
      hours,
    }, ...prev])
    setClockedIn(false)
    setStartTime(null)
    setElapsed(0)
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 20 }}>Shift Log</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Clock in and out of your watch to track hours</p>
      </div>

      {/* Timer card */}
      <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 16, background: clockedIn ? 'rgba(0,230,118,0.05)' : undefined, borderColor: clockedIn ? 'rgba(0,230,118,0.25)' : undefined }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 12 }}>
          {clockedIn ? '🟢 WATCH ACTIVE' : '⚪ OFF DUTY'}
        </div>
        <div className="shift-timer">{formatTime(elapsed)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {clockedIn && startTime ? `Started at ${new Date(startTime).toLocaleTimeString()}` : `${crewName} · Ready`}
        </div>
        {!clockedIn
          ? <button className="btn btn-primary" onClick={clockIn}>🟢 Clock In</button>
          : <button className="btn btn-danger" onClick={clockOut}>🔴 Clock Out</button>
        }
      </div>

      {/* Shift history */}
      {logs.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header">📋 Shift History</div>
          {logs.map((log, i) => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
              borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <div style={{ fontSize: 20 }}>⏱️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontFamily: 'Space Grotesk' }}>{log.duration}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{log.start} → {log.end}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-cyan">{log.hours} hrs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px', fontSize: 13 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          No completed shifts yet
        </div>
      )}
    </div>
  )
}

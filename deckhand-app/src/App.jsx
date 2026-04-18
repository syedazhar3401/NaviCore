import { useState, useEffect } from 'react'
import './index.css'
import QRScanner from './components/QRScanner'
import ZoneCheckin from './components/ZoneCheckin'
import ShiftLog from './components/ShiftLog'

const TABS = [
  { id: 'scanner', icon: '📷', label: 'Scan' },
  { id: 'zone', icon: '📍', label: 'Zone' },
  { id: 'shift', icon: '⏱️', label: 'Shift' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner')
  const [toast, setToast] = useState(null)
  const [crewName] = useState('John Smith')
  const [connected, setConnected] = useState(false)

  // Health check on backend connection
  useEffect(() => {
    fetch('http://localhost:4000/api/health')
      .then(r => r.ok ? setConnected(true) : setConnected(false))
      .catch(() => setConnected(false))
  }, [])

  const showToast = (message, isError = false) => {
    setToast({ message, isError })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="topbar">
        <div>
          <div className="topbar-logo">Navi<span>Core</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{crewName} · Deckhand</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? 'var(--green-signal)' : 'var(--red-alert)' }}>
          <span className={`dot ${connected ? 'dot-green' : 'dot-red'}`}></span>
          {connected ? 'Connected' : 'Offline'}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="nav-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="content">
        {activeTab === 'scanner' && <QRScanner showToast={showToast} />}
        {activeTab === 'zone' && <ZoneCheckin crewName={crewName} showToast={showToast} />}
        {activeTab === 'shift' && <ShiftLog crewName={crewName} />}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>
          {toast.isError ? '❌' : '✅'} {toast.message}
        </div>
      )}
    </div>
  )
}

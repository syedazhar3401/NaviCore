import { useState, useEffect } from 'react'
import localforage from 'localforage'
import './index.css'

// Initialize IndexedDB store for our offline queue
const syncQueue = localforage.createInstance({
  name: 'NaviCoreVessel',
  storeName: 'syncQueue'
})

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState([])
  const [fuelVal, setFuelVal] = useState('')
  const [engineTemp, setEngineTemp] = useState('')

  // Load pending queue from IndexedDB on startup
  useEffect(() => {
    loadQueue()

    const handleOnline = () => {
      setIsOnline(true)
      processSync() // Auto-sync when back online
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadQueue = async () => {
    const items = []
    await syncQueue.iterate((value, key) => {
      items.push({ key, ...value })
    })
    setQueue(items.sort((a, b) => b.timestamp - a.timestamp)) // newest first
  }

  const handleLogData = async (e) => {
    e.preventDefault()
    if (!fuelVal && !engineTemp) return

    const logEntry = {
      type: 'ENGINE_LOG',
      data: {
        fuelHfoTonnes: Number(fuelVal) || 0,
        engineTempC: Number(engineTemp) || 0
      },
      timestamp: Date.now()
    }

    // Always push to local queue first (offline-first architecture)
    const key = `log_${Date.now()}`
    await syncQueue.setItem(key, logEntry)
    setFuelVal('')
    setEngineTemp('')
    
    // Refresh UI queue
    await loadQueue()

    // Try to sync immediately if online
    if (isOnline) {
      processSync()
    }
  }

  const processSync = async () => {
    if (!navigator.onLine) return

    const itemsToSync = []
    await syncQueue.iterate((value, key) => {
      itemsToSync.push({ key, ...value })
    })

    if (itemsToSync.length === 0) return

    try {
      // Send array of logs to backend sync endpoint
      const res = await fetch('http://localhost:4000/api/sync/vessel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: itemsToSync })
      })

      if (res.ok) {
        // If successful, clear the synced items from IndexedDB
        for (const item of itemsToSync) {
          await syncQueue.removeItem(item.key)
        }
        await loadQueue() // Update UI
      }
    } catch (err) {
      console.warn('Sync failed, will retry later:', err)
      // Stay in queue if failed
    }
  }

  return (
    <>
      <div className="status-bar">
        <div className="brand">Navi<span>Core</span> Node</div>
        <div className="status-indicators">
          <div className="status-item">
            <span className={`dot ${isOnline ? 'dot-green' : 'dot-red'}`} />
            <span style={{ color: isOnline ? 'var(--green-signal)' : 'var(--red-alert)' }}>
              {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
            </span>
          </div>
          <div className="status-item">📍 Indian Ocean (Lat: 4.2 N)</div>
        </div>
      </div>

      <div className="main-layout">
        {/* Offline Queue Sidebar */}
        <div className="panel queue-panel">
          <div className="queue-header">
            <span>Pending Sync Queue</span>
            <span style={{ color: 'var(--cyan-glow)' }}>{queue.length}</span>
          </div>
          
          <div className="queue-list">
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                All logs synchronized
              </div>
            ) : (
              queue.map(q => (
                <div key={q.key} className="queue-item">
                  <div className="queue-item-meta">
                    <span>{new Date(q.timestamp).toLocaleTimeString()}</span>
                    <span style={{ color: 'var(--red-alert)' }}>Pending</span>
                  </div>
                  <div>Fuel: {q.data.fuelHfoTonnes} t</div>
                  <div>Temp: {q.data.engineTempC}°C</div>
                </div>
              ))
            )}
          </div>

          <button 
            className="btn btn-sync" 
            style={{ marginTop: 16 }}
            onClick={processSync}
            disabled={queue.length === 0 || !isOnline}
          >
            {isOnline ? 'Force Sync Now' : 'Waiting for connection…'}
          </button>
        </div>

        {/* Input Form */}
        <div className="panel input-panel">
          <h2 style={{ fontFamily: 'Space Grotesk', marginBottom: 8 }}>Engine & Fuel Log</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
            Log engine telemetry. Data is stored safely in IndexedDB when offline.
          </p>

          <form onSubmit={handleLogData}>
            <div className="input-group">
              <label className="input-label">HFO Fuel Remaining (Tonnes)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 450" 
                value={fuelVal}
                onChange={e => setFuelVal(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Main Engine Exhaust Temp (°C)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 385" 
                value={engineTemp}
                onChange={e => setEngineTemp(e.target.value)}
              />
            </div>

            <button type="submit" className="btn" disabled={!fuelVal && !engineTemp}>
              Save Log Entry
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

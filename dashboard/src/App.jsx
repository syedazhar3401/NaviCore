import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import AppStatusPill from './components/AppStatusPill'
import TopDock from './components/TopDock'
import FleetMap from './components/FleetMap'
import VoyageCard from './components/VoyageCard'
import CargoFeed from './components/CargoFeed'
import FuelOptimizer from './components/FuelOptimizer'
import CrewRoster from './components/CrewRoster'
import CostLedger from './components/CostLedger'
import WeatherRisk from './components/WeatherRisk'
import CargoArrangement from './components/CargoArrangement'
import './App.css'

const BACKEND_URL = 'http://localhost:4000'

const MOCK_VESSELS = [
  { id: '1', name: 'NaviCore One', currentLat: 4.2, currentLng: 108.6, status: 'IN_TRANSIT' },
  { id: '2', name: 'NaviCore Titan', currentLat: 12.5, currentLng: 54.2, status: 'AT_PORT' },
]

const PAGE_META = {
  fleet: {
    title: 'Global Maritime Intelligence',
    subtitle: 'Real-time threat monitoring and vessel tracking',
  },
  voyage: {
    title: 'Voyage Overview',
    subtitle: 'Live vessel status and route monitoring',
  },
  weather: {
    title: 'Weather & Risk Intel',
    subtitle: 'Maritime weather intelligence and route risk analysis',
  },
  fuel: {
    title: 'Fuel Stop Optimizer',
    subtitle: 'Compare bunker ports and optimize refueling decisions',
  },
  cost: {
    title: 'Voyage Cost Ledger',
    subtitle: 'Live running total — NaviCore One · Singapore → Rotterdam',
  },
  arrangement: {
    title: 'Cargo Arrangement',
    subtitle: 'Plan deck slot placement and vessel stability',
  },
  feed: {
    title: 'Live Loading Feed',
    subtitle: 'Real-time deckhand QR scan events',
  },
  crew: {
    title: 'Crew Roster',
    subtitle: 'Crew assignments and live duty status',
  },
}

export default function App() {
  const [activeView, setActiveView] = useState('fleet')
  const [feedEvents, setFeedEvents] = useState([])
  const [vessels, setVessels] = useState(MOCK_VESSELS)
  const [costUpdates, setCostUpdates] = useState({})
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const socketRef = useRef(null)
  const pollingRef = useRef(null)

  // --- Fetch latest state via HTTP (fallback for socket disconnects) ---
  const fetchLatestState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`)
      if (res.ok) {
        console.log('[Fallback] HTTP poll OK — waiting for socket reconnect')
      }
    } catch {
      console.warn('[Fallback] Backend unreachable via HTTP')
    }
  }, [])


  useEffect(() => {
    // Connect to backend WebSocket
    const socket = io(BACKEND_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('NaviCore Dashboard connected to backend')
      setConnectionStatus('connected')

      // Stop HTTP polling fallback if it was running
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        console.log('[Socket] Reconnected — stopped HTTP polling')
      }
    })

    // --- Connection Drop Resilience ---
    socket.on('disconnect', () => {
      console.warn('[Socket] Disconnected — starting HTTP polling fallback')
      setConnectionStatus('disconnected')

      // Start polling every 5 seconds until reconnected
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchLatestState, 5000)
      }
    })

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting')
    })

    // THE MAGIC LOOP: Listen for deckhand QR scan events
    socket.on('CARGO_SCANNED', (data) => {
      setFeedEvents(prev => [{
        id: Date.now(),
        qrCode: data.qrCode,
        status: data.loadStatus || data.status,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
        voyageId: data.voyageId,
      }, ...prev].slice(0, 50))
    })

    // --- Targeted COST_UPDATE rendering ---
    // Only update state for the specific voyage that changed
    socket.on('COST_UPDATE', (data) => {
      setCostUpdates(prev => ({
        ...prev,
        [data.voyageId]: data,
      }))
    })

    // --- System Alerts ---
    socket.on('SYSTEM_ALERT', (data) => {
      console.warn('[SYSTEM_ALERT]', data.message)
    })

    // Simulate vessel movement
    const moveInterval = setInterval(() => {
      setVessels(prev => prev.map(v =>
        v.status === 'IN_TRANSIT'
          ? { ...v, currentLng: v.currentLng + 0.05, currentLat: v.currentLat + 0.01 }
          : v
      ))
    }, 3000)

    return () => {
      socket.disconnect()
      clearInterval(moveInterval)
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [fetchLatestState])

  const views = {
    fleet: <FleetMap />,
    voyage: <VoyageCard vessels={vessels} />,
    fuel: <FuelOptimizer vessels={vessels} />,
    feed: <CargoFeed events={feedEvents} />,
    crew: <CrewRoster backendUrl={BACKEND_URL} />,
    cost: <CostLedger backendUrl={BACKEND_URL} costUpdates={costUpdates} />,
    weather: <WeatherRisk vessels={vessels} />,
    arrangement: <CargoArrangement />,
  }

  const activePage = PAGE_META[activeView] || PAGE_META.fleet

  return (
    <div className="app-layout">
      <div className="app-page-title-panel">
        <h1 className="app-page-title">{activePage.title}</h1>
        <p className="app-page-subtitle">{activePage.subtitle}</p>
      </div>
      <AppStatusPill connectionStatus={connectionStatus} />
      <TopDock
        activeView={activeView}
        onNavigate={setActiveView}
        feedEvents={feedEvents}
      />
      <main className={`app-main ${activeView === 'fleet' ? 'app-main-full' : ''}`}>
        {connectionStatus === 'disconnected' && activeView !== 'fleet' && (
          <div className="connection-banner connection-banner-warn">
            <span className="dot dot-amber pulse" style={{ width: 8, height: 8, minWidth: 8 }}></span>
            Connection lost — attempting to reconnect…
          </div>
        )}
        <div className={activeView !== 'fleet' ? 'fade-in' : ''} key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}

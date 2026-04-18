import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import Sidebar from './components/Sidebar'
import FleetMap from './components/FleetMap'
import VoyageCard from './components/VoyageCard'
import CargoFeed from './components/CargoFeed'
import CargoOptimizer from './components/CargoOptimizer'
import FuelOptimizer from './components/FuelOptimizer'
import CrewRoster from './components/CrewRoster'
import CostLedger from './components/CostLedger'
import WeatherRisk from './components/WeatherRisk'
import './App.css'

const BACKEND_URL = 'http://localhost:4000'

const MOCK_VESSELS = [
  { id: '1', name: 'NaviCore One', currentLat: 4.2, currentLng: 108.6, status: 'IN_TRANSIT' },
  { id: '2', name: 'NaviCore Titan', currentLat: 12.5, currentLng: 54.2, status: 'AT_PORT' },
]

export default function App() {
  const [activeView, setActiveView] = useState('fleet')
  const [feedEvents, setFeedEvents] = useState([])
  const [vessels, setVessels] = useState(MOCK_VESSELS)
  const socketRef = useRef(null)

  useEffect(() => {
    // Connect to backend WebSocket
    const socket = io(BACKEND_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('NaviCore Dashboard connected to backend')
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
    }
  }, [])

  const views = {
    fleet: <FleetMap vessels={vessels} feedEvents={feedEvents} />,
    voyage: <VoyageCard vessels={vessels} />,
    cargo: <CargoOptimizer backendUrl={BACKEND_URL} />,
    fuel: <FuelOptimizer vessels={vessels} />,
    feed: <CargoFeed events={feedEvents} />,
    crew: <CrewRoster backendUrl={BACKEND_URL} />,
    cost: <CostLedger backendUrl={BACKEND_URL} />,
    weather: <WeatherRisk vessels={vessels} />,
  }

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} feedEvents={feedEvents} />
      <main className="app-main">
        <div className="fade-in" key={activeView}>
          {views[activeView]}
        </div>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import { Map } from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import { useTradeRoutesLayers } from './TradeRoutesLayer'
import { useAisLayers } from './AisLayer'
import { usePortsLayers } from './PortsLayer'
import { fetchAisSignals, getAisStatus, startAisPolling, stopAisPolling } from '@/services/ais'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const INITIAL_VIEW = {
  longitude: 60,
  latitude: 20,
  zoom: 2.2,
  pitch: 0,
  bearing: 0,
}

export default function FleetMap() {
  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showAisDensity, setShowAisDensity] = useState(true)
  const [showAisDisruptions, setShowAisDisruptions] = useState(true)
  const [aisDensity, setAisDensity] = useState([])
  const [aisDisruptions, setAisDisruptions] = useState([])
  const [aisStatus, setAisStatus] = useState({ connected: false, vessels: 0, messages: 0 })

  // Load AIS data
  useEffect(() => {
    const loadData = async () => {
      const { disruptions, density } = await fetchAisSignals()
      setAisDisruptions(disruptions)
      setAisDensity(density)
      setAisStatus(getAisStatus())
    }

    loadData()
    startAisPolling()

    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      setAisStatus(getAisStatus())
    }, 10000)

    return () => {
      stopAisPolling()
      clearInterval(interval)
    }
  }, [])

  const { layers: tradeRouteLayers } = useTradeRoutesLayers({
    visible: showRoutes,
    animationEnabled: showRoutes,
    showChokepoints: showRoutes,
  })

  const aisLayers = useAisLayers({
    disruptions: aisDisruptions,
    density: aisDensity,
    showDensity: showAisDensity,
    showDisruptions: showAisDisruptions,
  })

  const portsLayers = usePortsLayers({
    visible: showPorts,
    showLabels: true,
  })

  const allLayers = [...tradeRouteLayers, ...aisLayers, ...portsLayers]

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null

    if (object.routeId) {
      // Trade route segment
      return {
        text: `${object.routeName}
Category: ${object.category}
Status: ${object.status}
Volume: ${object.volumeDesc}`,
      }
    }

    if (object.name && object.waterwayId) {
      // Chokepoint
      return {
        text: `${object.name}
${object.description}`,
      }
    }

    // AIS Density Zone
    if (object.shipsPerDay !== undefined) {
      return {
        text: `${object.name}
Intensity: ${(object.intensity * 100).toFixed(0)}%
Ships/day: ${object.shipsPerDay || 'N/A'}
Change: ${object.deltaPct > 0 ? '+' : ''}${object.deltaPct}%
${object.note || ''}`,
      }
    }

    // AIS Disruption Event
    if (object.darkShips !== undefined) {
      return {
        text: `${object.name}
Type: ${object.type}
Severity: ${object.severity}
Dark ships: ${object.darkShips || 'N/A'}
Vessels: ${object.vesselCount || 'N/A'}
Change: +${object.changePct}%

${object.description}`,
      }
    }

    // Port
    if (object.country !== undefined) {
      return {
        text: `${object.name}
Country: ${object.country}
Type: ${object.type}
${object.rank ? `Rank: #${object.rank} globally` : ''}
${object.note || ''}`,
      }
    }

    return null
  }, [])

  return (
    <div className="fleet-map-fullscreen">
      {/* Full-screen map container */}
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={true}
        layers={allLayers}
        getTooltip={getTooltip}
        style={{ width: '100%', height: '100%' }}
      >
        <Map mapStyle={MAP_STYLE} attributionControl={false} />
      </DeckGL>
      
      {/* Floating header - top left */}
      <div className="map-overlay-header">
        <h1 className="map-title">Global Maritime Intelligence</h1>
        <p className="map-subtitle">Real-time threat monitoring and vessel tracking</p>
      </div>
      
      {/* Floating badges - top right */}
      <div className="map-overlay-badges">
        <span className="map-badge map-badge-green">
          <span className="map-badge-dot"></span>
          Live Tracking
        </span>
        <span className="map-badge map-badge-cyan">
          21 Routes
        </span>
      </div>
      
      {/* Floating legend - bottom left */}
      <div className="map-overlay-legend">
        <span className="legend-label">LEGEND</span>
        <div className="legend-items-row">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#00d1ff' }}></span>
            <span>Container Port</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ff6432' }}></span>
            <span>Oil Terminal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#64ff96' }}></span>
            <span>LNG Terminal</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#c896ff' }}></span>
            <span>Mixed Port</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#64c8ff', height: '2px' }}></span>
            <span>Trade Route</span>
          </div>
        </div>
      </div>

      {/* Toggle Buttons Row */}
      <div className="toggle-buttons-row">
        <button
          className={`neon-toggle-btn ${showPorts ? 'active' : ''}`}
          onClick={() => setShowPorts(v => !v)}
          title={showPorts ? 'Hide ports' : 'Show ports'}
        >
          <span className="neon-glow-top"></span>
          Ports
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showRoutes ? 'active' : ''}`}
          onClick={() => setShowRoutes(v => !v)}
          title={showRoutes ? 'Hide trade routes' : 'Show trade routes'}
        >
          <span className="neon-glow-top"></span>
          Trade Routes
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showAisDensity ? 'active' : ''}`}
          onClick={() => setShowAisDensity(v => !v)}
          title={showAisDensity ? 'Hide AIS density' : 'Show AIS density'}
        >
          <span className="neon-glow-top"></span>
          Ship Traffic
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showAisDisruptions ? 'active' : ''}`}
          onClick={() => setShowAisDisruptions(v => !v)}
          title={showAisDisruptions ? 'Hide AIS disruptions' : 'Show AIS disruptions'}
        >
          <span className="neon-glow-top"></span>
          Disruptions
          <span className="neon-glow-bottom"></span>
        </button>
      </div>

      <style>{`
        .fleet-map-fullscreen {
          position: fixed;
          top: 0;
          left: 240px;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
        
        /* Floating Header */
        .map-overlay-header {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 10;
          pointer-events: none;
        }
        
        .map-title {
          margin: 0;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.8);
          letter-spacing: -0.3px;
        }
        
        .map-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          text-shadow: 0 1px 4px rgba(0,0,0,0.8);
        }
        
        /* Floating Badges */
        .map-overlay-badges {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 10;
          display: flex;
          gap: 10px;
        }
        
        .map-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          backdrop-filter: blur(10px);
          border: 1px solid;
        }
        
        .map-badge-green {
          background: rgba(0, 230, 118, 0.15);
          border-color: rgba(0, 230, 118, 0.4);
          color: #00e676;
        }
        
        .map-badge-cyan {
          background: rgba(0, 212, 255, 0.15);
          border-color: rgba(0, 212, 255, 0.4);
          color: #00d4ff;
        }
        
        .map-badge-dot {
          width: 6px;
          height: 6px;
          background: currentColor;
          border-radius: 50%;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        /* Floating Legend */
        .map-overlay-legend {
          position: absolute;
          bottom: 24px;
          left: 24px;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 20px;
          background: rgba(6, 12, 24, 0.9);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 10px;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        
        .legend-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,0.5);
        }
        
        .legend-items-row {
          display: flex;
          gap: 20px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
        }
        
        .legend-line {
          width: 20px;
          border-radius: 2px;
          background: #64c8ff;
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.6);
          box-shadow: 0 0 6px rgba(0,0,0,0.5);
        }
        
        /* Toggle Buttons Row */
        .toggle-buttons-row {
          position: absolute;
          top: 120px;
          left: 24px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        /* Neon Toggle Button */
        .neon-toggle-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          background: rgba(10, 15, 30, 0.9);
          border: 1px solid rgba(100, 200, 255, 0.25);
          border-radius: 9999px;
          cursor: pointer;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
          letter-spacing: 0.3px;
          overflow: hidden;
        }
        
        .neon-toggle-btn:hover {
          color: rgba(255, 255, 255, 1);
          border-color: rgba(100, 200, 255, 0.5);
          background: rgba(15, 25, 50, 0.95);
        }
        
        .neon-toggle-btn.active {
          color: rgba(255, 255, 255, 1);
          background: rgba(30, 60, 120, 0.4);
          border-color: rgba(100, 200, 255, 0.6);
          box-shadow: 0 4px 25px rgba(0, 150, 255, 0.15);
        }
        
        .neon-glow-top {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.8), transparent);
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .neon-toggle-btn:hover .neon-glow-top {
          opacity: 1;
        }
        
        .neon-glow-bottom {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.6), transparent);
          opacity: 0.2;
          transition: opacity 0.5s ease;
        }
        
        .neon-toggle-btn:hover .neon-glow-bottom {
          opacity: 0.5;
        }
        
        /* Map controls styling */
        .maplibregl-ctrl-group {
          background: rgba(6, 12, 24, 0.9) !important;
          border: 1px solid rgba(0, 212, 255, 0.3) !important;
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
        }
        
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid rgba(0, 212, 255, 0.15) !important;
          width: 32px !important;
          height: 32px !important;
        }
        
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        
        .maplibregl-ctrl-group button:hover {
          background: rgba(0, 212, 255, 0.15) !important;
        }
        
        .maplibregl-ctrl-icon {
          filter: brightness(2) !important;
        }
        
        /* DeckGL tooltip */
        .deck-tooltip {
          background: rgba(6, 12, 24, 0.98) !important;
          border: 1px solid rgba(0, 212, 255, 0.4) !important;
          border-radius: 8px !important;
          padding: 12px 16px !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 13px !important;
          color: white !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  )
}

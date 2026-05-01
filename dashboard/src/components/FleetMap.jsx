import { useEffect, useRef, useState, useCallback } from 'react'
import { Map, Source, Layer } from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import { useTradeRoutesLayers } from './TradeRoutesLayer'
import { useAisLayers } from './AisLayer'
import { usePortsLayers } from './PortsLayer'
import { useWeatherLayers } from './WeatherLayer'
import { useUserLocationLayers } from './UserLocationLayer'
import LiveIntelligence from './LiveIntelligence'
import AIInsightsPanel from './AIInsightsPanel'
import { fetchAisSignals, getAisStatus, hasAisData } from '@/services/ais'
import { fetchWeatherAlerts, getWeatherStatus, hasWeatherData } from '@/services/weather'
import { fetchRadarTiles } from '@/services/weatherRadar'
import { fetchNews } from '@/services/news-aggregator'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

const INITIAL_VIEW = {
  longitude: 60,
  latitude: 20,
  zoom: 2.2,
  pitch: 0,
  bearing: 0,
}

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
}

export default function FleetMap() {
  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showAisDensity, setShowAisDensity] = useState(false) // Default off - manual fetch only
  const [showAisDisruptions, setShowAisDisruptions] = useState(false) // Default off - manual fetch only
  const [showWeather, setShowWeather] = useState(false) // Default off - manual fetch only
  const [showIntelligence, setShowIntelligence] = useState(false)
  const [aisDensity, setAisDensity] = useState([])
  const [aisDisruptions, setAisDisruptions] = useState([])
  const [weatherAlerts, setWeatherAlerts] = useState([])
  const [radarTileUrl, setRadarTileUrl] = useState(null)
  const [aisStatus, setAisStatus] = useState({ connected: false, vessels: 0, messages: 0 })
  const [viewState, setViewState] = useState(INITIAL_VIEW)
  const [showMyLocation, setShowMyLocation] = useState(false)
  const [followLocation, setFollowLocation] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [showAiInsights, setShowAiInsights] = useState(false)
  const [aiNewsItems, setAiNewsItems] = useState([])
  const [aiNewsLoading, setAiNewsLoading] = useState(false)
  const [aiNewsError, setAiNewsError] = useState(null)
  const locationWatchRef = useRef(null)
  const followLocationRef = useRef(false)

  // Manual fetch function for AIS - only called when user toggles on
  const loadAisData = useCallback(async () => {
    const { disruptions, density } = await fetchAisSignals()
    setAisDisruptions(disruptions)
    setAisDensity(density)
    setAisStatus(getAisStatus())
  }, [])

  // Manual fetch function for Weather - only called when user toggles on
  const loadWeatherData = useCallback(async () => {
    const alerts = await fetchWeatherAlerts()
    setWeatherAlerts(alerts)
  }, [])

  // Load news for AI analysis
  const loadAiNews = useCallback(async () => {
    setAiNewsLoading(true)
    setAiNewsError(null)
    try {
      const result = await fetchNews()
      setAiNewsItems(result.items)
    } catch (err) {
      console.error('[FleetMap] AI news load failed:', err)
      setAiNewsError('Failed to load news for AI analysis')
    } finally {
      setAiNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    followLocationRef.current = followLocation
  }, [followLocation])

  const stopLocationWatch = useCallback(() => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current)
      locationWatchRef.current = null
    }
  }, [])

  const startLocationWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      return
    }

    if (locationWatchRef.current !== null) {
      return
    }

    setLocationError(null)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationError(null)

        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 30,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        }

        setCurrentLocation(nextLocation)

        if (followLocationRef.current) {
          setViewState(prev => ({
            ...prev,
            longitude: nextLocation.longitude,
            latitude: nextLocation.latitude,
            zoom: Math.max(prev.zoom || INITIAL_VIEW.zoom, 9),
          }))
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Unable to determine current location.')
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out.')
        } else {
          setLocationError('Location tracking failed.')
        }

        setShowMyLocation(false)
        setFollowLocation(false)
        stopLocationWatch()
      },
      GEOLOCATION_OPTIONS,
    )

    locationWatchRef.current = watchId
  }, [stopLocationWatch])

  const recenterToCurrentLocation = useCallback(() => {
    if (!currentLocation) return

    setFollowLocation(true)
    setViewState(prev => ({
      ...prev,
      longitude: currentLocation.longitude,
      latitude: currentLocation.latitude,
      zoom: Math.max(prev.zoom || INITIAL_VIEW.zoom, 9),
    }))
  }, [currentLocation])

  useEffect(() => {
    if (!showMyLocation) {
      setFollowLocation(false)
      stopLocationWatch()
      return
    }

    setFollowLocation(true)
    startLocationWatch()
  }, [showMyLocation, startLocationWatch, stopLocationWatch])

  useEffect(() => {
    return () => {
      stopLocationWatch()
    }
  }, [stopLocationWatch])

  // Handle AIS toggle - fetch only when turning on and data hasn't been fetched yet
  useEffect(() => {
    if (showAisDensity || showAisDisruptions) {
      if (!hasAisData()) {
        loadAisData()
      }
    }
  }, [showAisDensity, showAisDisruptions, loadAisData])

  // Handle Weather toggle - fetch alerts and radar when turning on
  useEffect(() => {
    if (showWeather) {
      // Fetch alerts if not already loaded
      if (!hasWeatherData()) {
        loadWeatherData()
      }
      // Fetch radar tiles
      fetchRadarTiles().then(url => {
        if (url) setRadarTileUrl(url)
      })
    }
  }, [showWeather, loadWeatherData])

  // Periodic status update (every 30 seconds instead of 10)
  useEffect(() => {
    const interval = setInterval(() => {
      setAisStatus(getAisStatus())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load news when AI panel opens
  useEffect(() => {
    if (showAiInsights && aiNewsItems.length === 0 && !aiNewsLoading) {
      loadAiNews()
    }
  }, [showAiInsights, aiNewsItems.length, aiNewsLoading, loadAiNews])

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
    showLabels: showPorts,
  })

  // Debug logging
  useEffect(() => {
    if (weatherAlerts.length > 0) {
      console.log('[FleetMap] Weather alerts loaded:', weatherAlerts.length)
    }
  }, [weatherAlerts])

  const weatherLayers = useWeatherLayers({
    alerts: weatherAlerts,
    showCentroids: showWeather,
    showPolygons: false, // Disable polygons for now, just show centroids
  })

  const userLocationLayers = useUserLocationLayers({
    location: currentLocation,
    visible: showMyLocation && !!currentLocation,
  })

  const allLayers = [...tradeRouteLayers, ...aisLayers, ...portsLayers, ...weatherLayers, ...userLocationLayers]

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null

    if (object.isUserLocation) {
      return {
        text: `Your Location
Accuracy: ${Math.round(object.accuracy || 0)}m`,
      }
    }

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

    // Weather Alert
    if (object.event !== undefined) {
      const expiresText = object.expires ?
        `Expires: ${new Date(object.expires).toLocaleString()}` : '';
      return {
        text: `${object.event}
Severity: ${object.severity}
${object.headline}
Area: ${object.areaDesc}
${expiresText}

${object.description ? object.description.substring(0, 150) + (object.description.length > 150 ? '...' : '') : ''}`,
      }
    }

    return null
  }, [])

  const applyMapPalette = useCallback((map) => {
    const setPaintIfLayerExists = (layerId, property, value) => {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, property, value)
      }
    }

    // Cool blue-dark palette
    setPaintIfLayerExists('background', 'background-color', '#0a1628')

      ;['water', 'water_intermittent'].forEach((layerId) => {
        setPaintIfLayerExists(layerId, 'fill-color', '#2a3442')
      })

      ;['waterway', 'waterway_intermittent'].forEach((layerId) => {
        setPaintIfLayerExists(layerId, 'line-color', '#36485d')
      })

      ;['landcover', 'landuse', 'landuse_overlay', 'park', 'landcover_grass', 'landcover_wood'].forEach((layerId) => {
        setPaintIfLayerExists(layerId, 'fill-color', '#12263f')
      })

      ;['boundary_country', 'boundary_country_z0-4', 'boundary_country_z5-', 'boundary_state'].forEach((layerId) => {
        setPaintIfLayerExists(layerId, 'line-color', '#355276')
      })
  }, [])

  return (
    <div className="fleet-map-fullscreen">
      {/* Full-screen map container */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: nextViewState, interactionState }) => {
          setViewState(nextViewState)

          if (
            followLocation &&
            interactionState &&
            (interactionState.isDragging || interactionState.isPanning || interactionState.isZooming || interactionState.isRotating)
          ) {
            setFollowLocation(false)
          }
        }}
        controller={true}
        layers={allLayers}
        getTooltip={getTooltip}
        style={{ width: '100%', height: '100%' }}
      >
        <Map
          mapStyle={MAP_STYLE}
          attributionControl={false}
          onLoad={(event) => applyMapPalette(event.target)}
        >
          {/* Weather Radar Layer - RainViewer tiles */}
          {showWeather && radarTileUrl && (
            <Source
              id="weather-radar"
              type="raster"
              tiles={[radarTileUrl]}
              tileSize={256}
              attribution="© RainViewer"
            >
              <Layer
                id="weather-radar-layer"
                type="raster"
                paint={{
                  'raster-opacity': 0.65,
                  'raster-fade-duration': 500,
                }}
              />
            </Source>
          )}
        </Map>
      </DeckGL>

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
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ff0000' }}></span>
            <span>Weather Alert</span>
          </div>
          {showMyLocation && currentLocation && (
            <div className="legend-item">
              <span className="legend-location">⛴</span>
              <span>My Location</span>
            </div>
          )}
          {showWeather && (
            <div className="legend-item">
              <span className="legend-radar"></span>
              <span>Radar</span>
            </div>
          )}
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
          onClick={async (e) => {
            if (showAisDensity && e.shiftKey) {
              // Shift+Click to refresh data
              await loadAisData()
            } else {
              setShowAisDensity(v => !v)
            }
          }}
          title={showAisDensity ? 'Hide AIS density (Shift+Click to refresh)' : 'Show AIS density'}
        >
          <span className="neon-glow-top"></span>
          Ship Traffic
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showAisDisruptions ? 'active' : ''}`}
          onClick={async (e) => {
            if (showAisDisruptions && e.shiftKey) {
              // Shift+Click to refresh data
              await loadAisData()
            } else {
              setShowAisDisruptions(v => !v)
            }
          }}
          title={showAisDisruptions ? 'Hide AIS disruptions (Shift+Click to refresh)' : 'Show AIS disruptions'}
        >
          <span className="neon-glow-top"></span>
          Disruptions
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showWeather ? 'active' : ''}`}
          onClick={async (e) => {
            if (showWeather && e.shiftKey) {
              // Shift+Click to refresh data
              await loadWeatherData()
            } else {
              setShowWeather(v => !v)
            }
          }}
          title={showWeather ? 'Hide weather alerts (Shift+Click to refresh)' : 'Show weather alerts'}
        >
          <span className="neon-glow-top"></span>
          Weather
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showIntelligence ? 'active' : ''}`}
          onClick={() => setShowIntelligence(v => !v)}
          title={showIntelligence ? 'Hide intelligence feed' : 'Show live intelligence'}
        >
          <span className="neon-glow-top"></span>
          Intelligence
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showMyLocation ? 'active' : ''}`}
          onClick={() => {
            if (showMyLocation) {
              setShowMyLocation(false)
              setCurrentLocation(null)
              setLocationError(null)
            } else {
              setShowMyLocation(true)
              setLocationError(null)
            }
          }}
          title={showMyLocation ? 'Stop location tracking' : 'Track my location'}
        >
          <span className="neon-glow-top"></span>
          My Location
          <span className="neon-glow-bottom"></span>
        </button>

        <button
          className={`neon-toggle-btn ${showAiInsights ? 'active' : ''}`}
          onClick={() => setShowAiInsights(v => !v)}
          title={showAiInsights ? 'Hide AI insight section' : 'Show AI insight section'}
        >
          <span className="neon-glow-top"></span>
          AI Insight
          <span className="neon-glow-bottom"></span>
        </button>

        {showMyLocation && currentLocation && !followLocation && (
          <button
            className="neon-toggle-btn"
            onClick={recenterToCurrentLocation}
            title="Recenter map to your current location"
          >
            <span className="neon-glow-top"></span>
            Recenter
            <span className="neon-glow-bottom"></span>
          </button>
        )}

        {locationError && <div className="location-error-pill">{locationError}</div>}

        {showAiInsights && (
          <div className="map-ai-insights-section">
            <div className="map-ai-insights-title">AI INSIGHT</div>
            <AIInsightsPanel
              items={aiNewsItems}
              isLoadingNews={aiNewsLoading}
              newsError={aiNewsError}
              onRefreshNews={loadAiNews}
              compact
              className="map-ai-insights-content"
            />
          </div>
        )}
      </div>

      {/* Live Intelligence Panel */}
      <LiveIntelligence
        isOpen={showIntelligence}
        onClose={() => setShowIntelligence(false)}
      />

      <style>{`
        .fleet-map-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
        }
        
        /* Floating Header */
        .map-overlay-header {
          position: absolute;
          top: 86px;
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

        .legend-radar {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          background: linear-gradient(135deg, #00b4db 0%, #0083b0 50%, #ffd700 100%);
          border: 1px solid rgba(255,255,255,0.4);
        }

        .legend-location {
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #00e6ff;
        }

        .location-error-pill {
          margin-top: 2px;
          max-width: 220px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 82, 82, 0.18);
          border: 1px solid rgba(255, 82, 82, 0.45);
          color: #ffd4d4;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.3;
          backdrop-filter: blur(8px);
        }

        .map-ai-insights-section {
          margin-top: 6px;
          width: min(460px, calc(100vw - 48px));
          max-height: calc(100vh - 580px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 200, 255, 0.3) transparent;
          border-radius: 12px;
          border: 1px solid rgba(100, 200, 255, 0.28);
          background: linear-gradient(180deg, rgba(6, 12, 24, 0.84) 0%, rgba(6, 12, 24, 0.74) 100%);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38);
          padding: 10px 12px 12px;
        }

        .map-ai-insights-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.4px;
          color: rgba(100, 200, 255, 0.9);
          margin: 2px 2px 8px;
        }

        .map-ai-insights-content {
          color: rgba(255, 255, 255, 0.92);
        }

        .toggle-buttons-row {
          position: absolute;
          top: 182px;
          left: 24px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }
        
        /* Neon Toggle Button */
        .neon-toggle-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 160px;
          padding: 8px 16px;
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

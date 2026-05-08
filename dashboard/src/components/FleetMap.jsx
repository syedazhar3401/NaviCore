import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Map, Source, Layer } from 'react-map-gl/maplibre'
import { DeckGL } from 'deck.gl'
import { ScatterplotLayer, TextLayer, LineLayer, IconLayer } from 'deck.gl'
import { useTradeRoutesLayers } from './TradeRoutesLayer'
import { useAisLayers } from './AisLayer'
import { usePortsLayers } from './PortsLayer'
import { useWeatherLayers } from './WeatherLayer'
import { useUserLocationLayers } from './UserLocationLayer'
import LiveIntelligence from './LiveIntelligence'
import AIInsightsPanel from './AIInsightsPanel'
import { fetchAisSignals, getAisStatus, hasAisData, pingAisApi } from '@/services/ais'
import { fetchWeatherAlerts, getWeatherStatus, hasWeatherData } from '@/services/weather'
import { fetchRadarTiles } from '@/services/weatherRadar'
import { fetchNews } from '@/services/news-aggregator'
import { generateRoutePolyline } from '@/utils/route-interpolation'
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

export default function FleetMap({ vessels, routeWaypoints, maritimeWaypoints, bunkerDiversionPath, isOutOfFuel, isTightPortStatus, bunkerStops }) {
  const [showRoutes, setShowRoutes] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showAisDensity, setShowAisDensity] = useState(true)
  const [showAisDisruptions, setShowAisDisruptions] = useState(true)
  const [showWeather, setShowWeather] = useState(false)
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

  // --- Voyage route line (yellow — original Singapore → Rotterdam path) ---
  const voyageRouteGeoJson = useMemo(() => {
    if (!maritimeWaypoints || maritimeWaypoints.length < 2) return null
    const allCoords = generateRoutePolyline(maritimeWaypoints, 10)
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: allCoords,
      },
    }
  }, [maritimeWaypoints])

  // --- Bunker diversion line (red — vessel → bunker port) ---
  const bunkerDiversionGeoJson = useMemo(() => {
    if (!bunkerDiversionPath || bunkerDiversionPath.length < 2) return null
    const coords = generateRoutePolyline(bunkerDiversionPath, 5)
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    }
  }, [bunkerDiversionPath])

  // --- Voyage waypoint markers (DeckGL layers) ---
  const voyageMarkerLayers = useMemo(() => {
    if (!routeWaypoints) return []
    const markers = routeWaypoints.map(wp => ({
      position: [wp.lng, wp.lat],
      name: wp.name,
      type: wp.type,
    }))

    return [
      new ScatterplotLayer({
        id: 'voyage-waypoint-markers',
        data: markers,
        getPosition: d => d.position,
        getRadius: d => d.type === 'origin' || d.type === 'destination' ? 25000 : 18000,
        getFillColor: d => {
          if (d.type === 'origin') return [0, 230, 118, 200]
          if (d.type === 'destination') return [255, 61, 61, 200]
          if (d.type === 'completed_bunker') return [0, 212, 255, 180]
          return [255, 193, 7, 220] // bunker stop - amber
        },
        getLineColor: [255, 255, 255, 150],
        lineWidthMinPixels: 2,
        stroked: true,
        pickable: true,
      }),
      new TextLayer({
        id: 'voyage-waypoint-labels',
        data: markers,
        getPosition: d => d.position,
        getText: d => {
          if (d.type === 'origin') return '📍 ' + d.name
          if (d.type === 'destination') return '🏁 ' + d.name
          if (d.type === 'completed_bunker') return '⛽ ' + d.name + ' ✓'
          return '⛽ ' + d.name
        },
        getSize: 12,
        getColor: [255, 255, 255, 230],
        backgroundColor: [10, 22, 40, 200],
        backgroundPadding: [6, 4],
        borderColor: [0, 212, 255, 150],
        borderWidth: 1,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        anchorY: 'bottom',
        pixelOffset: [0, -16],
        pickable: true,
      }),
    ]
  }, [routeWaypoints])

  // --- Maritime chokepoint markers (named waypoints along the sea lane) ---
  const chokepointLayers = useMemo(() => {
    if (!maritimeWaypoints) return []
    const named = maritimeWaypoints
      .filter(wp => wp.name && wp.type === 'chokepoint')
      .map(wp => ({ position: [wp.lng, wp.lat], name: wp.name }))

    if (named.length === 0) return []

    return [
      new ScatterplotLayer({
        id: 'chokepoint-markers',
        data: named,
        getPosition: d => d.position,
        getRadius: 12000,
        getFillColor: [255, 61, 61, 120],
        getLineColor: [255, 200, 200, 100],
        lineWidthMinPixels: 1,
        stroked: true,
        pickable: true,
      }),
      new TextLayer({
        id: 'chokepoint-labels',
        data: named,
        getPosition: d => d.position,
        getText: d => d.name,
        getSize: 10,
        getColor: [255, 180, 180, 200],
        backgroundColor: [40, 10, 10, 160],
        backgroundPadding: [4, 3],
        borderColor: [255, 61, 61, 80],
        borderWidth: 1,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        anchorY: 'bottom',
        pixelOffset: [0, -10],
        pickable: true,
      }),
    ]
  }, [maritimeWaypoints])

  // --- Vessel ship marker (ship icon at current position, oriented toward destination) ---
  const vesselMarkerLayers = useMemo(() => {
    const vessel = vessels?.[0]
    if (!vessel) return []

    // Dynamic sizing based on zoom
    const zoom = viewState.zoom || 3
    const baseScale = Math.pow(1.15, zoom - 3)
    const dynamicSize = Math.max(40, 100 * baseScale)
    const dynamicTextSize = Math.max(8, 11 * baseScale)
    const dynamicOffset = Math.max(22, 56 * baseScale)

    // Compute bearing: direction from vessel to destination (Rotterdam)
    const toRad = v => (v * Math.PI) / 180
    const toDeg = v => (v * 180) / Math.PI
    const lat1 = toRad(vessel.currentLat)
    const lat2 = toRad(51.92)
    const dLon = toRad(4.48 - vessel.currentLng)
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360

    const iconData = [{
      position: [vessel.currentLng, vessel.currentLat],
      angle: bearing,
    }]

    return [
      new IconLayer({
        id: 'vessel-ship-icon',
        data: iconData,
        getPosition: d => d.position,
        getAngle: d => d.angle,
        getIcon: () => ({
          url: new URL('@/assets/ship-removebg-preview.png', import.meta.url).href,
          width: 256,
          height: 256,
          anchorY: 128,
          anchorX: 128,
          mask: false,
        }),
        getSize: dynamicSize,
        sizeScale: 1,
        pickable: true,
      }),
      new TextLayer({
        id: 'vessel-name-label',
        data: [{ position: [vessel.currentLng, vessel.currentLat] }],
        getPosition: d => d.position,
        getText: () => vessel.name + (isOutOfFuel ? ' (STRANDED)' : ''),
        getSize: dynamicTextSize,
        getColor: isOutOfFuel ? [255, 61, 61, 240] : [0, 212, 255, 240],
        backgroundColor: [10, 22, 40, 250],
        backgroundPadding: [dynamicTextSize * 0.55, dynamicTextSize * 0.3],
        borderColor: isOutOfFuel ? [255, 61, 61, 150] : [0, 212, 255, 150],
        borderWidth: 2,
        fontFamily: 'Space Grotesk, sans-serif',
        fontWeight: 700,
        anchorY: 'top',
        pixelOffset: [0, dynamicOffset],
      }),
    ]
  }, [vessels, isOutOfFuel, viewState.zoom])

  // Manual fetch function for AIS
  const loadAisData = useCallback(async () => {
    const { disruptions, density } = await fetchAisSignals()
    setAisDisruptions(disruptions)
    setAisDensity(density)
    setAisStatus(getAisStatus())
  }, [])

  // Manual fetch function for Weather
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

  // Startup: always ping then load AIS data so state arrays are populated
  useEffect(() => {
    const initAis = async () => {
      console.log('[FleetMap] Starting AIS connectivity ping...');
      const pingResult = await pingAisApi();
      if (pingResult.status === 'ok') {
        console.log(`[FleetMap] AIS ping OK (${pingResult.latencyMs}ms) — ${pingResult.message}. Loading data...`);
        await loadAisData();
      } else {
        console.error('[FleetMap] AIS API connectivity check failed:', pingResult.message);
      }
    };
    initAis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount — loadAisData is stable via useCallback

  useEffect(() => {
    if (showWeather) {
      if (!hasWeatherData()) {
        loadWeatherData()
      }
      fetchRadarTiles().then(url => {
        if (url) setRadarTileUrl(url)
      })
    }
  }, [showWeather, loadWeatherData])

  useEffect(() => {
    const interval = setInterval(() => {
      setAisStatus(getAisStatus())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

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

  useEffect(() => {
    if (weatherAlerts.length > 0) {
      console.log('[FleetMap] Weather alerts loaded:', weatherAlerts.length)
    }
  }, [weatherAlerts])

  const weatherLayers = useWeatherLayers({
    alerts: weatherAlerts,
    showCentroids: showWeather,
    showPolygons: false,
  })

  const userLocationLayers = useUserLocationLayers({
    location: currentLocation,
    visible: showMyLocation && !!currentLocation,
  })

  const allLayers = [
    ...tradeRouteLayers,
    ...aisLayers,
    ...portsLayers,
    ...weatherLayers,
    ...userLocationLayers,
    ...chokepointLayers,
    ...voyageMarkerLayers,
    ...vesselMarkerLayers,
  ]

  const reachedBunkerStops = bunkerStops?.filter(bs => bs.reached && !bs.refueled) || []
  const hasReachedBunkerStop = reachedBunkerStops.length > 0

  const getTooltip = useCallback(({ object }) => {
    if (!object) return null

    if (object.isUserLocation) {
      return {
        text: `Your Location\nAccuracy: ${Math.round(object.accuracy || 0)}m`,
      }
    }

    if (object.routeId) {
      return {
        text: `${object.routeName}\nCategory: ${object.category}\nStatus: ${object.status}\nVolume: ${object.volumeDesc}`,
      }
    }

    if (object.name && object.waterwayId) {
      return {
        text: `${object.name}\n${object.description}`,
      }
    }

    if (object.shipsPerDay !== undefined) {
      return {
        text: `${object.name}\nIntensity: ${(object.intensity * 100).toFixed(0)}%\nShips/day: ${object.shipsPerDay || 'N/A'}\nChange: ${object.deltaPct > 0 ? '+' : ''}${object.deltaPct}%\n${object.note || ''}`,
      }
    }

    if (object.darkShips !== undefined) {
      return {
        text: `${object.name}\nType: ${object.type}\nSeverity: ${object.severity}\nDark ships: ${object.darkShips || 'N/A'}\nVessels: ${object.vesselCount || 'N/A'}\nChange: +${object.changePct}%\n\n${object.description}`,
      }
    }

    if (object.country !== undefined) {
      return {
        text: `${object.name}\nCountry: ${object.country}\nType: ${object.type}\n${object.rank ? `Rank: #${object.rank} globally` : ''}\n${object.note || ''}`,
      }
    }

    if (object.event !== undefined) {
      const expiresText = object.expires ?
        `Expires: ${new Date(object.expires).toLocaleString()}` : '';
      return {
        text: `${object.event}\nSeverity: ${object.severity}\n${object.headline}\nArea: ${object.areaDesc}\n${expiresText}\n\n${object.description ? object.description.substring(0, 150) + (object.description.length > 150 ? '...' : '') : ''}`,
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
          {/* Voyage Route Line — yellow original Singapore → Rotterdam path */}
          {voyageRouteGeoJson && (
            <Source id="voyage-route" type="geojson" data={voyageRouteGeoJson}>
              <Layer
                id="voyage-route-line"
                type="line"
                paint={{
                  'line-color': '#FFC107',
                  'line-width': 3,
                  'line-opacity': 0.85,
                  'line-dasharray': [2, 1],
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
              />
              {/* Glow under the line */}
              <Layer
                id="voyage-route-glow"
                type="line"
                paint={{
                  'line-color': '#FFC107',
                  'line-width': 8,
                  'line-opacity': 0.2,
                  'line-blur': 6,
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
              />
            </Source>
          )}

          {/* Bunker Diversion Line — red vessel → bunker port path */}
          {bunkerDiversionGeoJson && (
            <Source id="bunker-diversion" type="geojson" data={bunkerDiversionGeoJson}>
              <Layer
                id="bunker-diversion-line"
                type="line"
                paint={{
                  'line-color': '#ff3d3d',
                  'line-width': 3,
                  'line-opacity': 0.9,
                  'line-dasharray': [3, 2],
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
              />
              {/* Glow under the diversion line */}
              <Layer
                id="bunker-diversion-glow"
                type="line"
                paint={{
                  'line-color': '#ff3d3d',
                  'line-width': 8,
                  'line-opacity': 0.25,
                  'line-blur': 6,
                }}
                layout={{
                  'line-join': 'round',
                  'line-cap': 'round',
                }}
              />
            </Source>
          )}

          {/* Weather Radar Layer */}
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
        {isTightPortStatus && !isOutOfFuel && (
          <span className="map-badge" style={{
            background: 'rgba(255,193,7,0.2)',
            border: '1px solid rgba(255,193,7,0.5)',
            color: '#FFC107',
          }}>
            <span className="map-badge-dot"></span>
            TIGHT PORT STATUS
          </span>
        )}
        {isOutOfFuel && (
          <span className="map-badge" style={{
            background: 'rgba(255,61,61,0.2)',
            border: '1px solid rgba(255,61,61,0.5)',
            color: '#ff3d3d',
          }}>
            <span className="map-badge-dot"></span>
            EMERGENCY
          </span>
        )}
      </div>

      {/* Fuel/Stranded alert overlay on map */}
      {isOutOfFuel && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 24,
          zIndex: 15,
          maxWidth: 320,
          padding: '14px 18px',
          borderRadius: 10,
          background: 'rgba(255,61,61,0.12)',
          border: '1px solid rgba(255,61,61,0.4)',
          backdropFilter: 'blur(12px)',
          color: '#ff6b6b',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>VESSEL STRANDED</div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>Fuel depleted — vessel adrift. Go to Fuel Stop Optimizer for emergency assistance.</div>
        </div>
      )}

      {/* Tight reachable-port warning on FleetMap */}
      {isTightPortStatus && !isOutOfFuel && (
        <div style={{
          position: 'absolute',
          top: hasReachedBunkerStop ? 200 : 80,
          right: 24,
          zIndex: 15,
          maxWidth: 320,
          padding: '14px 18px',
          borderRadius: 10,
          background: 'rgba(255,193,7,0.12)',
          border: '1px solid rgba(255,193,7,0.4)',
          backdropFilter: 'blur(12px)',
          color: '#FFC107',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>LIMITED PORT OPTIONS</div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>
            Select a bunker stop now in Fuel Stop Optimizer before options run out.
          </div>
        </div>
      )}

      {/* Bunker stop reached alert on map */}
      {hasReachedBunkerStop && !isOutOfFuel && (
        <div style={{
          position: 'absolute',
          top: 80,
          right: 24,
          zIndex: 15,
          maxWidth: 320,
          padding: '14px 18px',
          borderRadius: 10,
          background: 'rgba(255,61,61,0.12)',
          border: '1px solid rgba(255,61,61,0.4)',
          backdropFilter: 'blur(12px)',
          color: '#ff6b6b',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>BUNKER STOP REACHED</div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>
            {reachedBunkerStops.map(bs => bs.name).join(', ')} — Refuel now in Fuel Stop Optimizer to continue voyage.
          </div>
        </div>
      )}

      {/* Floating legend - bottom left */}
      <div className="map-overlay-legend">
        <span className="legend-label">LEGEND</span>
        <div className="legend-items-row">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#00e676' }}></span>
            <span>Origin</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ff3d3d' }}></span>
            <span>Destination</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#FFC107' }}></span>
            <span>Bunker Stop</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#FFC107', height: '2px' }}></span>
            <span>Planned Route</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#ff3d3d', height: '2px' }}></span>
            <span>Bunker Diversion</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#00d1ff' }}></span>
            <span>Container Port</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ff6432' }}></span>
            <span>Oil Terminal</span>
          </div>
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
          color: #00d4ff;
          background: rgba(0, 180, 255, 0.18);
          border-color: rgba(0, 212, 255, 0.9);
          box-shadow: 0 0 16px rgba(0, 212, 255, 0.45), 0 4px 25px rgba(0, 150, 255, 0.25), inset 0 0 12px rgba(0, 212, 255, 0.08);
          font-weight: 700;
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

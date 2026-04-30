# Weather Alerts Extraction Guide

Visualize severe weather alerts (hurricanes, floods, storms, etc.) from national weather services.

---

## What You Get

- **Severe weather alerts** from US National Weather Service (NWS)
- **Color-coded by severity**: Extreme (red), Severe (orange), Moderate (yellow), Minor (gray)
- **Auto-refresh** every 30 minutes
- **Polygon areas** showing affected regions
- **Tooltips** with event details, headlines, and descriptions

---

## Important Note

Weather data comes from the **US National Weather Service API** (free, no key required for US alerts). For global coverage, you'd need additional APIs like:
- OpenWeatherMap (free tier available)
- WeatherAPI.com
- Meteoalarm (Europe)

This guide includes **mock data** for immediate visualization.

---

## Files to Create

### 1. `src/types/weather.ts` - TypeScript Interfaces

```typescript
export interface WeatherAlert {
  id: string;
  event: string;           // "Hurricane", "Flood Warning", etc.
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  headline: string;        // Short summary
  description: string;     // Full alert text
  areaDesc: string;        // "Coastal Florida"
  onset: Date;             // When alert starts
  expires: Date;           // When alert ends
  coordinates: [number, number][]; // Polygon of affected area
  centroid?: [number, number];     // Center point for mapping
}

export interface WeatherStatus {
  status: 'ok' | 'warning' | 'error';
  alertCount: number;
  lastUpdate: Date;
}
```

---

### 2. `src/config/weather-mock-data.ts` - Sample Weather Alerts

```typescript
import type { WeatherAlert } from '@/types/weather';

export const MOCK_WEATHER_ALERTS: WeatherAlert[] = [
  // Hurricane in Gulf of Mexico
  {
    id: 'hurricane-milton-001',
    event: 'Hurricane Warning',
    severity: 'Extreme',
    headline: 'Hurricane Milton approaching Florida Gulf Coast',
    description: 'Life-threatening storm surge and destructive winds expected. Storm surge 10-15 feet possible. Maximum sustained winds 140 mph.',
    areaDesc: 'Tampa Bay, Sarasota, Fort Myers',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours from now
    coordinates: [
      [-83.5, 27.5], [-82.5, 27.5], [-82.0, 26.5], [-82.0, 25.5],
      [-82.5, 25.0], [-83.0, 25.0], [-83.5, 25.5], [-83.5, 27.5]
    ],
    centroid: [-82.5, 26.5],
  },
  // Tornado outbreak
  {
    id: 'tornado-outbreak-001',
    event: 'Tornado Warning',
    severity: 'Severe',
    headline: 'Multiple tornadoes confirmed in Oklahoma',
    description: 'Radar indicated tornadoes with damage reported. Take shelter immediately in interior room on lowest floor.',
    areaDesc: 'Oklahoma City metro area',
    onset: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
    expires: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
    coordinates: [
      [-97.8, 35.6], [-97.2, 35.6], [-97.2, 35.2], [-97.8, 35.2], [-97.8, 35.6]
    ],
    centroid: [-97.5, 35.4],
  },
  // Flood warning
  {
    id: 'flood-texas-001',
    event: 'Flood Warning',
    severity: 'Moderate',
    headline: 'Flash flooding reported in Houston area',
    description: 'Excessive rainfall causing flash flooding. Roads may be impassable. Do not attempt to cross flooded roadways.',
    areaDesc: 'Harris County, Texas',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    expires: new Date(Date.now() + 1000 * 60 * 60 * 12), // 12 hours from now
    coordinates: [
      [-95.8, 30.2], [-95.0, 30.2], [-95.0, 29.5], [-95.8, 29.5], [-95.8, 30.2]
    ],n    centroid: [-95.4, 29.85],
  },
  // Winter storm
  {
    id: 'winter-storm-001',
    event: 'Winter Storm Warning',
    severity: 'Severe',
    headline: 'Major winter storm affecting Northeast',
    description: 'Heavy snow 12-18 inches expected. Blizzard conditions with wind gusts 40-50 mph. Travel will be very difficult to impossible.',
    areaDesc: 'Upstate New York, Vermont, New Hampshire',
    onset: new Date(Date.now() + 1000 * 60 * 60 * 12), // 12 hours from now
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours from now
    coordinates: [
      [-75.0, 45.0], [-71.0, 45.0], [-71.0, 43.0], [-75.0, 43.0], [-75.0, 45.0]
    ],
    centroid: [-73.0, 44.0],
  },
  // Heat advisory
  {
    id: 'heat-az-001',
    event: 'Excessive Heat Warning',
    severity: 'Moderate',
    headline: 'Dangerous heat wave continues in Arizona',
    description: 'Heat index up to 115°F expected. Heat stroke and heat exhaustion likely with prolonged outdoor exposure.',
    areaDesc: 'Phoenix metro area',
    onset: new Date(Date.now() - 1000 * 60 * 60 * 4),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    coordinates: [
      [-112.8, 34.0], [-111.5, 34.0], [-111.5, 33.0], [-112.8, 33.0], [-112.8, 34.0]
    ],
    centroid: [-112.15, 33.5],
  },
  // Severe thunderstorm
  {
    id: 'thunderstorm-midwest-001',
    event: 'Severe Thunderstorm Warning',
    severity: 'Moderate',
    headline: 'Damaging winds and large hail expected',
    description: 'Severe thunderstorms with 70 mph wind gusts and quarter size hail. Damage to roofs and vehicles possible.',
    areaDesc: 'Central Illinois',
    onset: new Date(Date.now() - 1000 * 60 * 15),
    expires: new Date(Date.now() + 1000 * 60 * 90),
    coordinates: [
      [-90.5, 40.5], [-88.0, 40.5], [-88.0, 39.5], [-90.5, 39.5], [-90.5, 40.5]
    ],
    centroid: [-89.25, 40.0],
  },
  // Wildfire
  {
    id: 'wildfire-ca-001',
    event: 'Red Flag Warning',
    severity: 'Severe',
    headline: 'Critical fire weather conditions',
    description: 'Low humidity and gusty winds creating critical fire danger. Any fires that develop will spread rapidly.',
    areaDesc: 'Southern California coastal areas',
    onset: new Date(Date.now()),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    coordinates: [
      [-118.5, 34.5], [-117.5, 34.5], [-117.5, 33.5], [-118.5, 33.5], [-118.5, 34.5]
    ],
    centroid: [-118.0, 34.0],
  },
  // Tsunami
  {
    id: 'tsunami-pacific-001',
    event: 'Tsunami Warning',
    severity: 'Extreme',
    headline: 'Tsunami warning for Pacific Coast',
    description: 'Tsunami waves expected. Move to high ground immediately. Do not return until all-clear given.',
    areaDesc: 'California, Oregon, Washington coasts',
    onset: new Date(Date.now() + 1000 * 60 * 30),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 6),
    coordinates: [
      [-125.0, 42.0], [-120.0, 42.0], [-120.0, 32.0], [-125.0, 32.0], [-125.0, 42.0]
    ],
    centroid: [-122.5, 37.0],
  },
];

// For global expansion, add alerts from other regions:
export const MOCK_GLOBAL_ALERTS: WeatherAlert[] = [
  // Typhoon in Pacific
  {
    id: 'typhoon-japan-001',
    event: 'Typhoon Warning',
    severity: 'Extreme',
    headline: 'Super Typhoon approaching Okinawa',
    description: 'Maximum sustained winds 150 mph. Storm surge 4-6 meters. Complete all preparations immediately.',
    areaDesc: 'Okinawa Prefecture, Japan',
    onset: new Date(Date.now()),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 36),
    coordinates: [
      [128.0, 27.0], [129.0, 27.0], [129.0, 26.0], [128.0, 26.0], [128.0, 27.0]
    ],
    centroid: [128.5, 26.5],
  },
  // Cyclone in Indian Ocean
  {
    id: 'cyclone-india-001',
    event: 'Cyclone Warning',
    severity: 'Severe',
    headline: 'Severe cyclonic storm in Bay of Bengal',
    description: 'Winds 100-110 kmph gusting to 120 kmph. Heavy rainfall and storm surge expected.',
    areaDesc: 'Odisha and West Bengal coasts, India',
    onset: new Date(Date.now() + 1000 * 60 * 60 * 6),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 48),
    coordinates: [
      [88.0, 21.0], [89.0, 21.0], [89.0, 19.5], [88.0, 19.5], [88.0, 21.0]
    ],
    centroid: [88.5, 20.25],
  },
];
```

---

### 3. `src/services/weather.ts` - Weather Service

```typescript
import type { WeatherAlert, WeatherStatus } from '@/types/weather';
import { MOCK_WEATHER_ALERTS, MOCK_GLOBAL_ALERTS } from '@/config/weather-mock-data';

// Configuration
const WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const USE_MOCK_DATA = true; // Set to false for real API

// State
let latestAlerts: WeatherAlert[] = [];
let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;
let lastUpdate: Date | null = null;

/**
 * Initialize with mock data
 */
function initWithMockData(): void {
  latestAlerts = [...MOCK_WEATHER_ALERTS, ...MOCK_GLOBAL_ALERTS];
  lastUpdate = new Date();
}

/**
 * Start polling for weather alerts
 */
export function startWeatherPolling(): void {
  if (isPolling) return;
  
  isPolling = true;
  
  if (USE_MOCK_DATA) {
    initWithMockData();
    // Simulate random alert rotation
    pollInterval = setInterval(() => {
      // Randomly rotate some alerts to simulate updates
      const allAlerts = [...MOCK_WEATHER_ALERTS, ...MOCK_GLOBAL_ALERTS];
      latestAlerts = allAlerts.filter(() => Math.random() > 0.3); // Random subset
      lastUpdate = new Date();
    }, WEATHER_REFRESH_INTERVAL_MS);
  } else {
    fetchRealWeatherAlerts();
    pollInterval = setInterval(fetchRealWeatherAlerts, WEATHER_REFRESH_INTERVAL_MS);
  }
}

/**
 * Stop polling
 */
export function stopWeatherPolling(): void {
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

/**
 * Fetch from real NWS API
 * US National Weather Service - Free, no API key required
 */
async function fetchRealWeatherAlerts(): Promise<void> {
  try {
    // NWS API endpoint for active alerts
    const response = await fetch('https://api.weather.gov/alerts/active');
    if (!response.ok) throw new Error(`NWS API error: ${response.status}`);
    
    const data = await response.json();
    
    // Transform NWS format to our format
    latestAlerts = data.features.map((feature: any) => ({
      id: feature.properties.id,
      event: feature.properties.event,
      severity: feature.properties.severity,
      headline: feature.properties.headline,
      description: feature.properties.description,
      areaDesc: feature.properties.areaDesc,
      onset: new Date(feature.properties.onset),
      expires: new Date(feature.properties.expires),
      coordinates: feature.geometry?.coordinates?.[0] || [],
      centroid: calculateCentroid(feature.geometry?.coordinates?.[0] || []),
    }));
    
    lastUpdate = new Date();
  } catch (error) {
    console.error('[Weather] Failed to fetch alerts:', error);
    latestAlerts = [];
  }
}

/**
 * Calculate centroid from polygon coordinates
 */
function calculateCentroid(coords: [number, number][]): [number, number] | undefined {
  if (!coords || coords.length === 0) return undefined;
  
  let lonSum = 0;
  let latSum = 0;
  
  for (const [lon, lat] of coords) {
    lonSum += lon;
    latSum += lat;
  }
  
  return [lonSum / coords.length, latSum / coords.length];
}

/**
 * Get current weather status
 */
export function getWeatherStatus(): WeatherStatus {
  return {
    status: isPolling ? 'ok' : 'error',
    alertCount: latestAlerts.length,
    lastUpdate: lastUpdate || new Date(),
  };
}

/**
 * Fetch current weather alerts
 */
export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  if (!isPolling) {
    startWeatherPolling();
  }
  
  return latestAlerts;
}

/**
 * Get color for severity level
 */
export function getSeverityColor(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'Extreme': return '#ff0000'; // Red
    case 'Severe': return '#ff6400';  // Orange
    case 'Moderate': return '#ffaa00'; // Yellow
    case 'Minor': return '#808080';   // Gray
    default: return '#cccccc';
  }
}

/**
 * Get RGBA color for severity (for DeckGL)
 */
export function getSeverityColorRGBA(severity: WeatherAlert['severity']): [number, number, number, number] {
  switch (severity) {
    case 'Extreme': return [255, 0, 0, 200];
    case 'Severe': return [255, 100, 0, 180];
    case 'Moderate': return [255, 170, 0, 160];
    case 'Minor': return [128, 128, 128, 150];
    default: return [200, 200, 200, 150];
  }
}
```

---

### 4. `src/components/WeatherLayer.tsx` - DeckGL Layers

```tsx
import { useMemo } from 'react';
import { ScatterplotLayer, PolygonLayer } from 'deck.gl';
import type { WeatherAlert } from '@/types/weather';
import { getSeverityColorRGBA } from '@/services/weather';

interface WeatherLayerProps {
  alerts: WeatherAlert[];
  showCentroids?: boolean;
  showPolygons?: boolean;
}

export function useWeatherLayers({
  alerts,
  showCentroids = true,
  showPolygons = true,
}: WeatherLayerProps) {
  // Filter alerts with coordinates
  const alertsWithCoords = useMemo(() => 
    alerts.filter(a => a.centroid && a.centroid.length === 2),
    [alerts]
  );

  // Alerts with polygon areas
  const alertsWithPolygons = useMemo(() => 
    alerts.filter(a => a.coordinates && a.coordinates.length > 2),
    [alerts]
  );

  // Centroid markers layer
  const centroidLayer = useMemo(() => {
    if (!showCentroids || alertsWithCoords.length === 0) return null;

    return new ScatterplotLayer<WeatherAlert>({
      id: 'weather-centroids-layer',
      data: alertsWithCoords,
      getPosition: d => d.centroid as [number, number],
      getRadius: 25000,
      getFillColor: d => getSeverityColorRGBA(d.severity),
      radiusMinPixels: 8,
      radiusMaxPixels: 20,
      pickable: true,
    });
  }, [alertsWithCoords, showCentroids]);

  // Polygon area layer (shows affected regions)
  const polygonLayer = useMemo(() => {
    if (!showPolygons || alertsWithPolygons.length === 0) return null;

    return new PolygonLayer<WeatherAlert>({
      id: 'weather-polygons-layer',
      data: alertsWithPolygons,
      getPolygon: d => d.coordinates,
      getFillColor: d => {
        const color = getSeverityColorRGBA(d.severity);
        return [color[0], color[1], color[2], color[3] / 2] as [number, number, number, number]; // More transparent
      },
      getLineColor: d => getSeverityColorRGBA(d.severity),
      getLineWidth: 2,
      lineWidthMinPixels: 1,
      pickable: true,
      stroked: true,
      filled: true,
    });
  }, [alertsWithPolygons, showPolygons]);

  return [centroidLayer, polygonLayer].filter(Boolean);
}

export default useWeatherLayers;
```

---

### 5. `src/components/WeatherMap.tsx` - Map Component

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from 'deck.gl';
import { useWeatherLayers } from './WeatherLayer';
import { fetchWeatherAlerts, getWeatherStatus, startWeatherPolling, stopWeatherPolling } from '@/services/weather';
import type { WeatherAlert } from '@/types/weather';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

const INITIAL_VIEW = {
  longitude: -95,
  latitude: 37,
  zoom: 3,
  pitch: 0,
  bearing: 0,
};

export default function WeatherMap() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [showCentroids, setShowCentroids] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [status, setStatus] = useState({ status: 'ok' as const, alertCount: 0, lastUpdate: new Date() });

  // Load weather data
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchWeatherAlerts();
      setAlerts(data);
      setStatus(getWeatherStatus());
    };

    loadData();
    startWeatherPolling();

    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      setStatus(getWeatherStatus());
    }, 30000);

    return () => {
      stopWeatherPolling();
      clearInterval(interval);
    };
  }, []);

  const layers = useWeatherLayers({
    alerts,
    showCentroids,
    showPolygons,
  });

  const getTooltip = useCallback(({ object }: { object?: any }) => {
    if (!object) return null;

    const isPolygon = object.coordinates && object.coordinates.length > 0;
    const expiresText = object.expires ? 
      `Expires: ${new Date(object.expires).toLocaleString()}` : '';
    
    return {
      html: `
        <div style="padding: 8px; max-width: 300px; font-family: system-ui, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">
            ${object.event || 'Weather Alert'}
          </div>
          <div style="color: #ffaa00; font-size: 12px; margin-bottom: 6px;">
            Severity: ${object.severity}
          </div>
          <div style="font-size: 12px; margin-bottom: 6px;">
            ${object.headline || ''}
          </div>
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">
            Area: ${object.areaDesc || 'Unknown'}
          </div>
          <div style="font-size: 11px; opacity: 0.7;">
            ${expiresText}
          </div>
          ${object.description ? `
            <div style="font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
              ${object.description.substring(0, 200)}${object.description.length > 200 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      `,
    };
  }, []);

  // Count alerts by severity
  const severityCounts = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(0,0,0,0.85)',
          padding: '12px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          maxWidth: '260px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Weather Alerts</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showCentroids}
            onChange={e => setShowCentroids(e.target.checked)}
          />
          Alert Centers
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showPolygons}
            onChange={e => setShowPolygons(e.target.checked)}
          />
          Affected Areas
        </label>

        {/* Status */}
        <div style={{ 
          padding: '8px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '4px',
          fontSize: '11px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: status.status === 'ok' ? '#00ff88' : '#ff4444' 
            }} />
            {status.status === 'ok' ? 'Live Updates' : 'Disconnected'}
          </div>
          <div>Active alerts: {status.alertCount}</div>
          <div>Updated: {status.lastUpdate.toLocaleTimeString()}</div>
        </div>

        {/* Severity Legend */}
        <div style={{ fontSize: '11px' }}>
          <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Severity Levels:</div>
          
          {severityCounts['Extreme'] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff0000' }} />
              Extreme ({severityCounts['Extreme']})
            </div>
          )}
          
          {severityCounts['Severe'] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6400' }} />
              Severe ({severityCounts['Severe']})
            </div>
          )}
          
          {severityCounts['Moderate'] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffaa00' }} />
              Moderate ({severityCounts['Moderate']})
            </div>
          )}
          
          {severityCounts['Minor'] > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#808080' }} />
              Minor ({severityCounts['Minor']})
            </div>
          )}
        </div>

        {/* Event Types */}
        <div style={{ marginTop: '12px', fontSize: '11px' }}>
          <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Active Events:</div>
          {Array.from(new Set(alerts.map(a => a.event))).slice(0, 5).map(event => (
            <div key={event} style={{ marginBottom: '2px', opacity: 0.8 }}>
              • {event}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <DeckGL
        initialViewState={INITIAL_VIEW}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
      >
        <Map mapStyle={MAP_STYLE} />
      </DeckGL>
    </div>
  );
}
```

---

## Installation

```bash
npm install deck.gl maplibre-gl react-map-gl
```

---

## Usage

```tsx
import WeatherMap from '@/components/WeatherMap';

function App() {
  return <WeatherMap />;
}
```

---

## To Use Real Weather Data

### US National Weather Service (Free)

1. Set `USE_MOCK_DATA = false` in `src/services/weather.ts`
2. The service automatically fetches from NWS API:
   - Endpoint: `https://api.weather.gov/alerts/active`
   - No API key required
   - US-only coverage

### For Global Coverage

Add additional APIs:
- **OpenWeatherMap**: `api.openweathermap.org/data/2.5/weather`
- **WeatherAPI.com**: Global alerts API
- **Meteoalarm**: European weather alerts

Modify `fetchRealWeatherAlerts()` to aggregate from multiple sources.

---

## Data Summary

| Feature | Description |
|---------|-------------|
| **10 US Alerts** | Hurricane, tornado, flood, winter storm, heat, thunderstorm, wildfire, tsunami |
| **2 Global Alerts** | Typhoon (Japan), Cyclone (India) |
| **Auto-refresh** | Every 30 minutes |
| **Visual** | Centroid markers + polygon areas |
| **Tooltips** | Event, severity, area, description, expiration |

---

## Visual Features

1. **Red markers** - Extreme severity
2. **Orange markers** - Severe
3. **Yellow markers** - Moderate
4. **Gray markers** - Minor
5. **Polygon overlays** - Show affected regions (semi-transparent)
6. **Rich tooltips** - Full alert details on hover
7. **Live counter** - Shows active alerts by severity

---

## Zero API Cost (Mock Mode)

Mock data works immediately with **no API keys**. Perfect for development and demos. The NWS API is also completely free when you switch to real data.

---

## All Extraction Guides Complete

You now have extraction guides for:
- ✅ Trade Routes
- ✅ Ship Traffic (AIS)
- ✅ Weather Alerts

The other features (Economic Centers, Submarine Cables) were skipped as requested.

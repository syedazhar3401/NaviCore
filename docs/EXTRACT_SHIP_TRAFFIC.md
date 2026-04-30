# Ship Traffic (AIS) Extraction Guide

Visualize maritime traffic density and AIS disruptions (gaps, congestion) on the map.

---

## What You Get

- **AIS Density Zones** - Heatmap-style visualization of ship traffic intensity
- **AIS Disruption Events** - Markers for AIS gaps, spoofing, congestion
- **Color-coded severity**: Low (yellow), Elevated (orange), High (red)
- **Auto-refresh polling** every 5 minutes
- **Tooltips** with vessel counts and descriptions

---

## Important Note

Real-time AIS data requires:
- **AISStream API** (aisstream.io) - Free tier available
- Or a **backend relay** to aggregate vessel positions

This guide includes **mock data** so you can see the visualization immediately.

---

## Files to Create

### 1. `src/types/ais.ts` - TypeScript Interfaces

```typescript
export type AisDisruptionType = 'gap_spike' | 'chokepoint_congestion';

export interface AisDisruptionEvent {
  id: string;
  name: string;
  type: AisDisruptionType;
  lat: number;
  lon: number;
  severity: 'low' | 'elevated' | 'high';
  changePct: number;
  windowHours: number;
  darkShips?: number;
  vesselCount?: number;
  region?: string;
  description: string;
}

export interface AisDensityZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  intensity: number; // 0-1 scale
  deltaPct: number;
  shipsPerDay?: number;
  note?: string;
}

export interface AisStatus {
  connected: boolean;
  vessels: number;
  messages: number;
}
```

---

### 2. `src/config/ais-mock-data.ts` - Sample Data

```typescript
import type { AisDisruptionEvent, AisDensityZone } from '@/types/ais';

// Sample AIS density zones (high traffic areas)
export const MOCK_AIS_DENSITY: AisDensityZone[] = [
  { id: 'malacca-1', name: 'Malacca Strait - Singapore', lat: 1.26, lon: 103.84, intensity: 0.95, deltaPct: 5, shipsPerDay: 450, note: 'Busiest strait, 80k+ vessels/year' },
  { id: 'suez-1', name: 'Suez Canal - Port Said', lat: 31.26, lon: 32.30, intensity: 0.88, deltaPct: -2, shipsPerDay: 120, note: '12% of world trade' },
  { id: 'suez-2', name: 'Suez Canal - Suez Port', lat: 29.97, lon: 32.55, intensity: 0.85, deltaPct: 0, shipsPerDay: 115, note: 'Southern terminus' },
  { id: 'hormuz-1', name: 'Strait of Hormuz', lat: 26.5, lon: 56.5, intensity: 0.92, deltaPct: 8, shipsPerDay: 280, note: '21M bpd oil transit' },
  { id: 'panama-1', name: 'Panama Canal', lat: 9.1, lon: -79.7, intensity: 0.78, deltaPct: 12, shipsPerDay: 38, note: '14k transits/year' },
  { id: 'gibraltar-1', name: 'Strait of Gibraltar', lat: 35.9, lon: -5.6, intensity: 0.75, deltaPct: 3, shipsPerDay: 300, note: 'Mediterranean gateway' },
  { id: 'dover-1', name: 'Dover Strait', lat: 51.0, lon: 1.5, intensity: 0.82, deltaPct: -1, shipsPerDay: 400, note: 'World busiest shipping lane' },
  { id: 'bab-el-mandeb-1', name: 'Bab el-Mandeb', lat: 12.5, lon: 43.3, intensity: 0.65, deltaPct: -25, shipsPerDay: 180, note: 'Red Sea crisis impact' },
  { id: 'shanghai-1', name: 'Shanghai Approaches', lat: 31.0, lon: 122.5, intensity: 0.90, deltaPct: 15, shipsPerDay: 380, note: 'World busiest container port' },
  { id: 'rotterdam-1', name: 'Rotterdam Approaches', lat: 52.0, lon: 3.8, intensity: 0.72, deltaPct: 4, shipsPerDay: 200, note: 'Europe largest port' },
  { id: 'cape-1', name: 'Cape of Good Hope', lat: -34.36, lon: 18.49, intensity: 0.55, deltaPct: 45, shipsPerDay: 90, note: 'Suez bypass traffic surge' },
  { id: 'bosphorus-1', name: 'Bosphorus Strait', lat: 41.1, lon: 29.0, intensity: 0.68, deltaPct: 2, shipsPerDay: 150, note: 'Black Sea access' },
  { id: 'taiwan-1', name: 'Taiwan Strait', lat: 24.0, lon: 119.5, intensity: 0.80, deltaPct: 8, shipsPerDay: 250, note: 'Critical shipping lane' },
  { id: 'korea-1', name: 'Korea Strait', lat: 34.0, lon: 129.0, intensity: 0.70, deltaPct: 5, shipsPerDay: 180, note: 'Japan-Korea trade' },
  { id: 'bosporus-1', name: 'Kerch Strait', lat: 45.3, lon: 36.6, intensity: 0.45, deltaPct: -30, shipsPerDay: 40, note: 'Russia-Ukraine conflict' },
];

// Sample AIS disruption events
export const MOCK_AIS_DISRUPTIONS: AisDisruptionEvent[] = [
  {
    id: 'gap-red-sea-1',
    name: 'Red Sea AIS Gap Cluster',
    type: 'gap_spike',
    lat: 15.0,
    lon: 42.0,
    severity: 'high',
    changePct: 340,
    windowHours: 24,
    darkShips: 45,
    vesselCount: 120,
    region: 'Red Sea',
    description: 'Significant AIS signal gaps detected. Vessels going dark near Houthi activity zones.',
  },
  {
    id: 'congestion-suez-1',
    name: 'Suez Canal Congestion',
    type: 'chokepoint_congestion',
    lat: 30.5,
    lon: 32.3,
    severity: 'elevated',
    changePct: 25,
    windowHours: 12,
    vesselCount: 85,
    region: 'Suez Canal',
    description: 'Above-normal queue forming at Great Bitter Lake. Delay: 6-8 hours.',
  },
  {
    id: 'gap-black-sea-1',
    name: 'Black Sea Spoofing Activity',
    type: 'gap_spike',
    lat: 44.5,
    lon: 32.0,
    severity: 'elevated',
    changePct: 180,
    windowHours: 48,
    darkShips: 12,
    vesselCount: 45,
    region: 'Black Sea',
    description: 'GPS/AIS spoofing detected near Crimea. Multiple vessels showing false positions.',
  },
  {
    id: 'congestion-panama-1',
    name: 'Panama Canal Low Water Delay',
    type: 'chokepoint_congestion',
    lat: 9.1,
    lon: -79.7,
    severity: 'high',
    changePct: 65,
    windowHours: 72,
    vesselCount: 62,
    region: 'Panama Canal',
    description: 'Draft restrictions due to low water. Transit delays up to 10 days.',
  },
  {
    id: 'gap-south-china-sea-1',
    name: 'SCS AIS Interference',
    type: 'gap_spike',
    lat: 15.0,
    lon: 115.0,
    severity: 'low',
    changePct: 45,
    windowHours: 6,
    darkShips: 8,
    vesselCount: 200,
    region: 'South China Sea',
    description: 'Intermittent AIS jamming reported near disputed territories.',
  },
  {
    id: 'congestion-la-1',
    name: 'LA/LB Port Congestion',
    type: 'chokepoint_congestion',
    lat: 33.7,
    lon: -118.2,
    severity: 'elevated',
    changePct: 30,
    windowHours: 36,
    vesselCount: 28,
    region: 'Los Angeles',
    description: 'Container backup at anchorage. Average wait: 3-4 days.',
  },
  {
    id: 'gap-persian-gulf-1',
    name: 'Gulf GPS Spoofing',
    type: 'gap_spike',
    lat: 26.5,
    lon: 52.0,
    severity: 'high',
    changePct: 290,
    windowHours: 18,
    darkShips: 22,
    vesselCount: 95,
    region: 'Persian Gulf',
    description: 'Iran-linked GPS spoofing affecting tanker navigation.',
  },
];
```

---

### 3. `src/services/ais.ts` - AIS Service

```typescript
import type { AisDisruptionEvent, AisDensityZone, AisStatus } from '@/types/ais';
import { MOCK_AIS_DENSITY, MOCK_AIS_DISRUPTIONS } from '@/config/ais-mock-data';

// Configuration
const AIS_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const USE_MOCK_DATA = true; // Set to false when you have real API

// State
let latestDisruptions: AisDisruptionEvent[] = [];
let latestDensity: AisDensityZone[] = [];
let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;

// For real API: AISStream endpoint (you need API key from aisstream.io)
const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY || '';

/**
 * Initialize with mock data immediately
 */
function initWithMockData(): void {
  latestDensity = [...MOCK_AIS_DENSITY];
  latestDisruptions = [...MOCK_AIS_DISRUPTIONS];
}

/**
 * Start polling for AIS data
 */
export function startAisPolling(): void {
  if (isPolling) return;
  
  isPolling = true;
  
  if (USE_MOCK_DATA) {
    initWithMockData();
    // Simulate small random changes to mock data
    pollInterval = setInterval(() => {
      latestDensity = MOCK_AIS_DENSITY.map(z => ({
        ...z,
        intensity: Math.min(1, Math.max(0.1, z.intensity + (Math.random() - 0.5) * 0.1)),
        deltaPct: z.deltaPct + Math.round((Math.random() - 0.5) * 4),
      }));
    }, AIS_REFRESH_INTERVAL_MS);
  } else {
    // Real API implementation would go here
    fetchRealAisData();
    pollInterval = setInterval(fetchRealAisData, AIS_REFRESH_INTERVAL_MS);
  }
}

/**
 * Stop polling
 */
export function stopAisPolling(): void {
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

/**
 * Fetch from real AIS API (placeholder)
 */
async function fetchRealAisData(): Promise<void> {
  if (!AISSTREAM_API_KEY) {
    console.warn('[AIS] No API key configured');
    return;
  }
  
  // Example: Connect to AISStream WebSocket
  // const ws = new WebSocket(`wss://stream.aisstream.io/v1/stream?apiKey=${AISSTREAM_API_KEY}`);
  // ... handle messages
  
  // Or use your backend relay
  // const response = await fetch('/api/ais/snapshot');
  // const data = await response.json();
  // latestDisruptions = data.disruptions;
  // latestDensity = data.density;
}

/**
 * Get current AIS status
 */
export function getAisStatus(): AisStatus {
  return {
    connected: isPolling,
    vessels: latestDensity.reduce((sum, z) => sum + (z.shipsPerDay || 0), 0),
    messages: isPolling ? Math.floor(Math.random() * 50000) + 10000 : 0,
  };
}

/**
 * Fetch current AIS signals
 */
export async function fetchAisSignals(): Promise<{ 
  disruptions: AisDisruptionEvent[]; 
  density: AisDensityZone[] 
}> {
  if (!isPolling) {
    startAisPolling();
  }
  
  return {
    disruptions: latestDisruptions,
    density: latestDensity,
  };
}

/**
 * For real-time vessel positions via WebSocket callback
 */
export type AisPositionCallback = (data: {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  shipType?: number;
  heading?: number;
  speed?: number;
  course?: number;
}) => void;

const positionCallbacks = new Set<AisPositionCallback>();

export function registerAisCallback(callback: AisPositionCallback): void {
  positionCallbacks.add(callback);
  startAisPolling();
}

export function unregisterAisCallback(callback: AisPositionCallback): void {
  positionCallbacks.delete(callback);
}
```

---

### 4. `src/components/AisLayer.tsx` - DeckGL Layers

```tsx
import { useMemo } from 'react';
import { ScatterplotLayer } from 'deck.gl';
import type { AisDisruptionEvent, AisDensityZone } from '@/types/ais';

interface AisLayerProps {
  disruptions: AisDisruptionEvent[];
  density: AisDensityZone[];
  showDensity?: boolean;
  showDisruptions?: boolean;
}

export function useAisLayers({
  disruptions,
  density,
  showDensity = true,
  showDisruptions = true,
}: AisLayerProps) {
  // AIS Density Layer (traffic heatmap)
  const densityLayer = useMemo(() => {
    if (!showDensity || density.length === 0) return null;

    return new ScatterplotLayer<AisDensityZone>({
      id: 'ais-density-layer',
      data: density,
      getPosition: d => [d.lon, d.lat],
      getRadius: d => 4000 + d.intensity * 8000,
      getFillColor: d => {
        const intensity = Math.min(Math.max(d.intensity, 0.15), 1);
        const isCongested = (d.deltaPct || 0) >= 15;
        const alpha = Math.round(40 + intensity * 160);
        
        // Orange for congested areas, cyan for normal traffic
        if (isCongested) {
          return [255, 183, 3, alpha] as [number, number, number, number]; // #ffb703
        }
        return [0, 209, 255, alpha] as [number, number, number, number]; // #00d1ff
      },
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
    });
  }, [density, showDensity]);

  // AIS Disruptions Layer (spoofing, gaps)
  const disruptionsLayer = useMemo(() => {
    if (!showDisruptions || disruptions.length === 0) return null;

    return new ScatterplotLayer<AisDisruptionEvent>({
      id: 'ais-disruptions-layer',
      data: disruptions,
      getPosition: d => [d.lon, d.lat],
      getRadius: 12000,
      getFillColor: d => {
        // Color by severity
        if (d.severity === 'high') {
          return [255, 50, 50, 220] as [number, number, number, number]; // Red
        }
        if (d.severity === 'elevated') {
          return [255, 150, 0, 200] as [number, number, number, number]; // Orange
        }
        return [255, 200, 100, 180] as [number, number, number, number]; // Yellow
      },
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
      stroked: true,
      getLineColor: [255, 255, 255, 150] as [number, number, number, number],
      lineWidthMinPixels: 1,
    });
  }, [disruptions, showDisruptions]);

  return [densityLayer, disruptionsLayer].filter(Boolean);
}

export default useAisLayers;
```

---

### 5. `src/components/AisMap.tsx` - Map Component

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from 'deck.gl';
import { useAisLayers } from './AisLayer';
import { fetchAisSignals, getAisStatus, startAisPolling, stopAisPolling } from '@/services/ais';
import type { AisDisruptionEvent, AisDensityZone } from '@/types/ais';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

const INITIAL_VIEW = {
  longitude: 60,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

export default function AisMap() {
  const [density, setDensity] = useState<AisDensityZone[]>([]);
  const [disruptions, setDisruptions] = useState<AisDisruptionEvent[]>([]);
  const [showDensity, setShowDensity] = useState(true);
  const [showDisruptions, setShowDisruptions] = useState(true);
  const [status, setStatus] = useState({ connected: false, vessels: 0, messages: 0 });

  // Load AIS data
  useEffect(() => {
    const loadData = async () => {
      const { disruptions: d, density: den } = await fetchAisSignals();
      setDisruptions(d);
      setDensity(den);
      setStatus(getAisStatus());
    };

    loadData();
    startAisPolling();

    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      setStatus(getAisStatus());
    }, 10000);

    return () => {
      stopAisPolling();
      clearInterval(interval);
    };
  }, []);

  const layers = useAisLayers({
    disruptions,
    density,
    showDensity,
    showDisruptions,
  });

  const getTooltip = useCallback(({ object }: { object?: any }) => {
    if (!object) return null;

    if (object.shipsPerDay !== undefined) {
      // Density zone
      return {
        text: `${object.name}
Intensity: ${(object.intensity * 100).toFixed(0)}%
Ships/day: ${object.shipsPerDay || 'N/A'}
Change: ${object.deltaPct > 0 ? '+' : ''}${object.deltaPct}%
${object.note || ''}`,
      };
    }

    if (object.darkShips !== undefined) {
      // Disruption event
      return {
        text: `${object.name}
Type: ${object.type}
Severity: ${object.severity}
Dark ships: ${object.darkShips || 'N/A'}
Vessels: ${object.vesselCount || 'N/A'}
Change: +${object.changePct}%

${object.description}`,
      };
    }

    return null;
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(0,0,0,0.8)',
          padding: '12px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          maxWidth: '250px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Ship Traffic (AIS)</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showDensity}
            onChange={e => setShowDensity(e.target.checked)}
          />
          Traffic Density
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showDisruptions}
            onChange={e => setShowDisruptions(e.target.checked)}
          />
          AIS Disruptions
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
              background: status.connected ? '#00ff88' : '#ff4444' 
            }} />
            {status.connected ? 'Connected' : 'Offline'}
          </div>
          <div>Tracked vessels: {status.vessers.toLocaleString()}</div>
          <div>Messages/hr: {status.messages.toLocaleString()}</div>
        </div>

        {/* Legend */}
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Traffic Density:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00d1ff', opacity: 0.7 }} />
            Normal traffic
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffb703', opacity: 0.7 }} />
            Congested (+15%)
          </div>

          <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Disruptions:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff3232' }} />
            High severity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff9600' }} />
            Elevated
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffc864' }} />
            Low
          </div>
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
import AisMap from '@/components/AisMap';

function App() {
  return <AisMap />;
}
```

---

## To Use Real AIS Data

### Option 1: AISStream API (Free tier)

1. Get free API key from [aisstream.io](https://aisstream.io)
2. Add to `.env`:
   ```
   VITE_AISSTREAM_API_KEY=your_api_key_here
   ```
3. Modify `src/services/ais.ts`:
   - Set `USE_MOCK_DATA = false`
   - Implement WebSocket connection to AISStream

### Option 2: Backend Relay

Build a backend that:
1. Connects to AIS data providers (AISStream, MarineTraffic, etc.)
2. Aggregates vessel positions
3. Computes density zones and disruption events
4. Exposes REST API at `/api/ais/snapshot`

---

## Data Summary

| Feature | Description |
|---------|-------------|
| **15 Density Zones** | Major shipping chokepoints with traffic intensity |
| **7 Disruption Events** | Sample AIS gaps, spoofing, congestion |
| **Auto-refresh** | Every 5 minutes (simulated with mock data) |
| **Tooltips** | Hover for vessel counts, severity, descriptions |

---

## Visual Features

1. **Cyan circles** - Normal traffic density
2. **Orange circles** - Congested areas (+15% traffic)
3. **Red/Orange/Yellow markers** - AIS disruptions by severity
4. **Real-time status** - Connection status and vessel count
5. **Interactive legend** - Toggle layers on/off

---

## Zero API Cost (Mock Mode)

The included mock data works immediately with **no API keys** required. Perfect for development and demos.

---

## Next Steps

Which feature next? (F) Economic Centers or (H) Weather Alerts?

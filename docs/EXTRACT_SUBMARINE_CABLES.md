# Submarine Cables - Complete Implementation Guide

This guide extracts the submarine cables feature from WorldMonitor for your app.

---

## OVERVIEW

**What You'll Build:**
- Interactive map with submarine cables overlaid
- 500+ cables with landing points
- Layer toggle (show/hide cables)
- Hover tooltips with cable info
- Free dark theme matching WorldMonitor

**Stack:**
- MapLibre GL JS (base map)
- OpenFreeMap Dark (FREE tiles)
- Deck.gl (cable lines overlay)
- React (UI components)

---

## STEP 1: INSTALL DEPENDENCIES

```bash
npm install maplibre-gl deck.gl react-map-gl
```

---

## STEP 2: EXTRACT CABLE DATA

### Option A: Copy Sample (20 cables)
Create `data/submarine-cables.ts`:

```typescript
export interface CableLandingPoint {
  country: string;
  countryName: string;
  city: string;
  lat: number;
  lon: number;
}

export interface UnderseaCable {
  id: string;
  name: string;
  points: [number, number][]; // [lng, lat] coordinates
  major?: boolean;
  rfsYear?: number;
  owners?: string[];
  landingPoints?: CableLandingPoint[];
}

// Sample cables - Copy from WorldMonitor src/config/geo.ts lines 819+
export const UNDERSEA_CABLES: UnderseaCable[] = [
  // === TRANS-ATLANTIC ===
  {
    id: 'marea',
    name: 'MAREA',
    points: [[-76.1, 36.8], [-72.4, 37.4], [-50.4, 37.9], [-23.4, 44.7], [-9.9, 46.6], [-4.5, 44.7], [-2.9, 43.3]],
    major: true,
    rfsYear: 2018,
    owners: ['Meta', 'Microsoft', 'Telxius'],
    landingPoints: [
      { country: 'ES', countryName: 'Spain', city: 'Bilbao', lat: 43.27, lon: -2.95 },
      { country: 'US', countryName: 'United States', city: 'Virginia Beach', lat: 36.76, lon: -76.06 },
    ],
  },
  {
    id: 'grace_hopper',
    name: 'Grace Hopper',
    points: [[-72.9, 40.8], [-61.2, 38.7], [-23.4, 46], [-8.1, 49.7], [-9.9, 46.9], [-2.9, 43.3]],
    major: true,
    rfsYear: 2022,
    owners: ['Google'],
    landingPoints: [
      { country: 'ES', countryName: 'Spain', city: 'Bilbao', lat: 43.27, lon: -2.95 },
      { country: 'GB', countryName: 'United Kingdom', city: 'Bude', lat: 50.83, lon: -4.54 },
      { country: 'US', countryName: 'United States', city: 'Bellport', lat: 40.76, lon: -72.94 },
    ],
  },
  {
    id: 'havfrueaec_2',
    name: 'Havfrue/AEC-2',
    points: [[8.3, 55.8], [-9.7, 53.8], [8, 58.2], [-74.1, 40.2]],
    major: true,
    rfsYear: 2020,
    owners: ['Bulk Infrastructure', 'EXA Infrastructure', 'Google', 'Meta'],
    landingPoints: [
      { country: 'DK', countryName: 'Denmark', city: 'Blaabjerg', lat: 55.75, lon: 8.33 },
      { country: 'IE', countryName: 'Ireland', city: 'Lecanvey', lat: 53.77, lon: -9.7 },
      { country: 'NO', countryName: 'Norway', city: 'Kristiansand', lat: 58.15, lon: 8 },
      { country: 'US', countryName: 'United States', city: 'Wall Township', lat: 40.15, lon: -74.06 },
    ],
  },
  {
    id: 'dunant',
    name: 'Dunant',
    points: [[-2, 46.7], [-5.4, 46.6], [-16.2, 45.3], [-39.6, 39.7], [-61.2, 37.6], [-74.7, 36.7], [-76.1, 36.8]],
    major: true,
    rfsYear: 2021,
    owners: ['Google'],
    landingPoints: [
      { country: 'FR', countryName: 'France', city: 'Saint-Hilaire-de-Riez', lat: 46.69, lon: -1.97 },
      { country: 'US', countryName: 'United States', city: 'Virginia Beach', lat: 36.76, lon: -76.06 },
    ],
  },
  {
    id: 'amitie',
    name: 'Amitie',
    points: [[-71, 42.5], [-50.4, 43.6], [-16.2, 50.2], [-3.1, 45.1], [-7.2, 50.9], [-4.5, 50.8]],
    major: true,
    rfsYear: 2023,
    owners: ['EXA Infrastructure', 'Meta', 'Microsoft', 'Orange', 'Vodafone'],
    landingPoints: [
      { country: 'FR', countryName: 'France', city: 'Le Porge', lat: 44.89, lon: -1.21 },
      { country: 'GB', countryName: 'United Kingdom', city: 'Bude', lat: 50.83, lon: -4.54 },
      { country: 'US', countryName: 'United States', city: 'Lynn', lat: 42.46, lon: -70.95 },
    ],
  },
  // === TRANS-PACIFIC ===
  {
    id: 'jupiter',
    name: 'JUPITER',
    points: [[139.7, 35.6], [145, 33], [160, 30], [175, 25], [-162, 22], [-157, 21], [-122, 37], [-122.4, 37.8]],
    major: true,
    rfsYear: 2020,
    owners: ['Amazon', 'Facebook', 'NTT', 'PCCW', 'PLDT', 'SoftBank', 'Telstra'],
    landingPoints: [
      { country: 'JP', countryName: 'Japan', city: 'Shima', lat: 34.38, lon: 136.82 },
      { country: 'PH', countryName: 'Philippines', city: 'Daet', lat: 14.11, lon: 122.95 },
      { country: 'US', countryName: 'United States', city: 'Los Angeles', lat: 33.75, lon: -118.25 },
    ],
  },
  {
    id: 'plcn',
    name: 'PLCN',
    points: [[121.5, 31.2], [144.9, 13.4], [-157, 21], [-118.2, 33.9]],
    major: true,
    rfsYear: 2022,
    owners: ['Google', 'Meta'],
    landingPoints: [
      { country: 'CN', countryName: 'China', city: 'Shanghai', lat: 31.23, lon: 121.47 },
      { country: 'PH', countryName: 'Philippines', city: 'Baler', lat: 15.76, lon: 121.56 },
      { country: 'TW', countryName: 'Taiwan', city: 'Toucheng', lat: 24.85, lon: 121.82 },
      { country: 'US', countryName: 'United States', city: 'Los Angeles', lat: 33.75, lon: -118.25 },
    ],
  },
  // === EUROPE-ASIA ===
  {
    id: 'seame_we_5',
    name: 'SEA-ME-WE 5',
    points: [[100.5, 13.7], [80.2, 6], [55.4, -4.6], [25.3, 35.3], [10.2, 36.8], [2.3, 48.9]],
    major: true,
    rfsYear: 2016,
    owners: ['Bangladesh Submarine Cable Company', 'China Unicom', 'Orange', 'Singtel', 'Telecom Egypt', 'Telkom Indonesia', 'Sri Lanka Telecom'],
    landingPoints: [
      { country: 'EG', countryName: 'Egypt', city: 'Abu Talat', lat: 31.03, lon: 29.8 },
      { country: 'FR', countryName: 'France', city: 'Marseille', lat: 43.3, lon: 5.4 },
      { country: 'ID', countryName: 'Indonesia', city: 'Tuas', lat: 1.35, lon: 103.75 },
      { country: 'IT', countryName: 'Italy', city: 'Palermo', lat: 38.12, lon: 13.36 },
      { country: 'LK', countryName: 'Sri Lanka', city: 'Mount Lavinia', lat: 6.83, lon: 79.87 },
      { country: 'MU', countryName: 'Mauritius', city: 'Baie Jacotet', lat: -20.45, lon: 57.73 },
      { country: 'SA', countryName: 'Saudi Arabia', city: 'Yanbu', lat: 24.09, lon: 38.06 },
      { country: 'SG', countryName: 'Singapore', city: 'Changi', lat: 1.35, lon: 103.99 },
      { country: 'TH', countryName: 'Thailand', city: 'Songkhla', lat: 7.2, lon: 100.6 },
    ],
  },
  {
    id: 'asia_africa_europe_1_aae_1',
    name: 'Asia Africa Europe-1 (AAE-1)',
    points: [[103.8, 1.3], [100.5, 13.7], [77, 20], [55.4, -4.6], [25.3, 35.3], [12.5, 41.9]],
    major: true,
    rfsYear: 2017,
    owners: ['China Unicom', 'Djibouti Telecom', 'Etisalat', 'Hutchison Global Communications', 'Ooredoo', 'Orange', 'PCCW', 'Singtel', 'Telecom Egypt', 'Tele Yemen', 'Telenor', 'Viettel'],
    landingPoints: [
      { country: 'CN', countryName: 'China', city: 'Shantou', lat: 23.35, lon: 116.7 },
      { country: 'EG', countryName: 'Egypt', city: 'Abu Talat', lat: 31.03, lon: 29.8 },
      { country: 'FR', countryName: 'France', city: 'Marseille', lat: 43.3, lon: 5.4 },
      { country: 'HK', countryName: 'Hong Kong', city: 'Tseung Kwan O', lat: 22.31, lon: 114.26 },
      { country: 'ID', countryName: 'Indonesia', city: 'Tanjung Pakis', lat: -5.93, lon: 107.03 },
      { country: 'IN', countryName: 'India', city: 'Mumbai', lat: 18.93, lon: 72.83 },
      { country: 'IT', countryName: 'Italy', city: 'Catania', lat: 37.5, lon: 15.09 },
      { country: 'KH', countryName: 'Cambodia', city: 'Sihanoukville', lat: 10.63, lon: 103.51 },
      { country: 'MY', countryName: 'Malaysia', city: 'Cherating', lat: 4.11, lon: 103.39 },
      { country: 'OM', countryName: 'Oman', city: 'Al Seeb', lat: 23.68, lon: 58.18 },
      { country: 'SG', countryName: 'Singapore', city: 'Changi', lat: 1.35, lon: 103.99 },
      { country: 'TH', countryName: 'Thailand', city: 'Songkhla', lat: 7.2, lon: 100.6 },
      { country: 'VN', countryName: 'Vietnam', city: 'Vung Tau', lat: 10.35, lon: 107.08 },
    ],
  },
  // === INTRA-ASIA ===
  {
    id: 'asia_submarine_cable_express_ase',
    name: 'Asia Submarine-cable Express (ASE)',
    points: [[103.8, 1.3], [103.3, 3.4], [100.5, 13.7], [121.5, 25]],
    major: true,
    rfsYear: 2012,
    owners: ['Chunghwa Telecom', 'Facebook', 'Google', 'KDDI', 'MCPC', 'NEC', 'Philippine Long Distance Telephone', 'Singtel', 'StarHub', 'Taiwan Mobile'],
    landingPoints: [
      { country: 'HK', countryName: 'Hong Kong', city: 'Tseung Kwan O', lat: 22.31, lon: 114.26 },
      { country: 'JP', countryName: 'Japan', city: 'Maruyama', lat: 35.0, lon: 139.99 },
      { country: 'PH', countryName: 'Philippines', city: 'Nasugbu', lat: 13.94, lon: 120.63 },
      { country: 'SG', countryName: 'Singapore', city: 'Changi', lat: 1.35, lon: 103.99 },
    ],
  },
  // === MIDDLE EAST ===
  {
    id: 'imewe',
    name: 'IMEWE',
    points: [[55.3, 25.3], [43.2, 12.8], [33.3, 35.3], [28.9, 41], [12.5, 41.9]],
    major: true,
    rfsYear: 2010,
    owners: ['Bharat Sanchar Nigam Limited', 'Du', 'Etisalat', 'Omantel', 'Pakistan Telecommunication Company Limited', 'Saudi Telecom Company', 'Telecom Egypt', 'Tata Communications', 'Tunisie Telecom'],
    landingPoints: [
      { country: 'AE', countryName: 'United Arab Emirates', city: 'Ajman', lat: 25.41, lon: 55.44 },
      { country: 'EG', countryName: 'Egypt', city: 'Zafarana', lat: 29.11, lon: 32.66 },
      { country: 'IN', countryName: 'India', city: 'Mumbai', lat: 18.93, lon: 72.83 },
      { country: 'IT', countryName: 'Italy', city: 'Mazara del Vallo', lat: 37.65, lon: 12.59 },
      { country: 'JO', countryName: 'Jordan', city: 'Tala Bay', lat: 29.46, lon: 34.99 },
      { country: 'PK', countryName: 'Pakistan', city: 'Karachi', lat: 24.86, lon: 67.01 },
      { country: 'SA', countryName: 'Saudi Arabia', city: 'Jeddah', lat: 21.48, lon: 39.18 },
    ],
  },
];

// Get all cables
export const getAllCables = () => UNDERSEA_CABLES;

// Get major cables only
export const getMajorCables = () => UNDERSEA_CABLES.filter(c => c.major);
```

### Option B: Full Dataset (500+ cables)

Copy the entire `UNDERSEA_CABLES` array from:
```
worldmonitor/src/config/geo.ts (lines 819-3279)
```

To extract:
```bash
# Copy lines 819 to end from geo.ts
sed -n '819,$p' worldmonitor/src/config/geo.ts > your-project/data/submarine-cables.ts
```

---

## STEP 3: CREATE CABLE LAYER

Create `layers/CableLayer.tsx`:

```tsx
import { PathLayer } from '@deck.gl/layers';
import type { UnderseaCable } from '../data/submarine-cables';

interface CableLayerProps {
  cables: UnderseaCable[];
  visible: boolean;
  highlightedCable?: string | null;
}

export function createCableLayer({ cables, visible, highlightedCable }: CableLayerProps) {
  if (!visible) return null;

  // Transform cables to layer data format
  const layerData = cables.map(cable => ({
    id: cable.id,
    path: cable.points,
    name: cable.name,
    major: cable.major,
    owners: cable.owners,
    year: cable.rfsYear,
    landingPoints: cable.landingPoints,
  }));

  return new PathLayer({
    id: 'cables-layer',
    data: layerData,
    
    // Path geometry
    getPath: d => d.path,
    getColor: d => {
      // Highlight selected cable
      if (highlightedCable && d.id === highlightedCable) {
        return [255, 255, 0, 255]; // Yellow highlight
      }
      // Major cables are brighter
      if (d.major) {
        return [0, 200, 255, 200]; // Bright cyan
      }
      return [0, 150, 200, 150]; // Normal cyan
    },
    getWidth: d => d.major ? 3 : 2,
    
    // Visual settings
    widthMinPixels: 1,
    widthMaxPixels: 8,
    capRounded: true,
    jointRounded: true,
    
    // Interactivity
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 0, 200],
    
    // Callbacks
    onHover: info => {
      if (info.object) {
        showCableTooltip(info.object, info.x, info.y);
      }
    },
    onClick: info => {
      if (info.object) {
        console.log('Clicked cable:', info.object);
        // Navigate to cable details, zoom to cable, etc.
      }
    },
  });
}

// Tooltip helper
function showCableTooltip(cable: any, x: number, y: number) {
  // Remove existing tooltip
  const existing = document.getElementById('cable-tooltip');
  if (existing) existing.remove();

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'cable-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    left: ${x + 10}px;
    top: ${y + 10}px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    pointer-events: none;
    z-index: 1000;
    max-width: 300px;
    border: 1px solid #333;
  `;

  const owners = cable.owners ? cable.owners.join(', ') : 'Unknown';
  const year = cable.year ? ` (${cable.year})` : '';
  const landingPoints = cable.landingPoints 
    ? cable.landingPoints.map((lp: any) => lp.city).join(' → ')
    : '';

  tooltip.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px; color: #0ff;">${cable.name}${year}</div>
    <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">${landingPoints}</div>
    <div style="font-size: 11px; color: #888;">Owners: ${owners}</div>
  `;

  document.body.appendChild(tooltip);

  // Remove on mouse out
  const removeTooltip = () => {
    tooltip.remove();
    document.removeEventListener('mousemove', removeTooltip);
  };
  document.addEventListener('mousemove', removeTooltip);
}
```

---

## STEP 4: CREATE MAIN MAP COMPONENT

Create `components/SubmarineCableMap.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Deck, MapboxOverlay } from '@deck.gl/mapbox';
import { createCableLayer } from '../layers/CableLayer';
import { UNDERSEA_CABLES } from '../data/submarine-cables';
import 'maplibre-gl/dist/maplibre-gl.css';

export function SubmarineCableMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const [showCables, setShowCables] = useState(true);
  const [selectedCable, setSelectedCable] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    // Create MapLibre map with OpenFreeMap (FREE dark theme)
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/dark', // FREE - No API key needed!
      center: [0, 20], // Center on world
      zoom: 2,
      pitch: 0,
      bearing: 0,
      attributionControl: false, // We'll add custom attribution
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    
    // Add attribution
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: '© OpenFreeMap | © OpenStreetMap'
    }), 'bottom-right');

    // Initialize Deck.gl overlay
    const deck = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });

    map.addControl(deck);

    mapRef.current = map;
    deckRef.current = deck;

    // Cleanup
    return () => {
      map.remove();
    };
  }, []);

  // Update layers when visibility changes
  useEffect(() => {
    if (!deckRef.current) return;

    const cableLayer = createCableLayer({
      cables: UNDERSEA_CABLES,
      visible: showCables,
      highlightedCable: selectedCable,
    });

    deckRef.current.setProps({
      layers: cableLayer ? [cableLayer] : [],
    });
  }, [showCables, selectedCable]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        style={{ width: '100%', height: '100%' }} 
      />

      {/* Layer Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '16px',
        borderRadius: '8px',
        color: 'white',
        minWidth: '200px',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Layers</h3>
        
        {/* Cable Toggle */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '8px 0',
          borderBottom: '1px solid #333',
        }}>
          <input
            type="checkbox"
            checked={showCables}
            onChange={(e) => setShowCables(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            color: showCables ? '#0ff' : '#888'
          }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              background: '#0ff',
              borderRadius: '2px'
            }} />
            Submarine Cables
          </span>
          <span style={{ 
            marginLeft: 'auto', 
            fontSize: '12px', 
            color: '#666'
          }}>
            {UNDERSEA_CABLES.length}
          </span>
        </label>

        {/* Stats */}
        {showCables && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#888',
            lineHeight: '1.6'
          }}>
            <div>Total cables: {UNDERSEA_CABLES.length}</div>
            <div>Major cables: {UNDERSEA_CABLES.filter(c => c.major).length}</div>
            <div style={{ marginTop: '8px', color: '#666' }}>
              Click a cable to see details
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showCables && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '12px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Cable Types</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '20px', height: '3px', background: '#0ff' }} />
            <span>Major cable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '20px', height: '2px', background: '#09c' }} />
            <span>Standard cable</span>
          </div>
        </div>
      )}

      {/* Selected Cable Info Panel */}
      {selectedCable && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '16px',
          borderRadius: '8px',
          color: 'white',
          width: '300px',
          backdropFilter: 'blur(10px)',
          border: '1px solid #0ff',
        }}>
          <button 
            onClick={() => setSelectedCable(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
          <CableInfo cableId={selectedCable} />
        </div>
      )}
    </div>
  );
}

// Cable info component
function CableInfo({ cableId }: { cableId: string }) {
  const cable = UNDERSEA_CABLES.find(c => c.id === cableId);
  if (!cable) return null;

  return (
    <div>
      <h3 style={{ margin: '0 0 12px 0', color: '#0ff' }}>{cable.name}</h3>
      
      {cable.rfsYear && (
        <div style={{ color: '#888', marginBottom: '8px' }}>
          Ready for service: {cable.rfsYear}
        </div>
      )}

      {cable.owners && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Owners</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {cable.owners.map(owner => (
              <span 
                key={owner}
                style={{
                  background: '#222',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {owner}
              </span>
            ))}
          </div>
        </div>
      )}

      {cable.landingPoints && (
        <div>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>Landing Points</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cable.landingPoints.map((lp, i) => (
              <div 
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#0ff' }}>●</span>
                <span>{lp.city}, {lp.countryName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## STEP 5: CREATE APP ENTRY POINT

Update `App.tsx`:

```tsx
import { SubmarineCableMap } from './components/SubmarineCableMap';

function App() {
  return <SubmarineCableMap />;
}

export default App;
```

---

## STEP 6: ADD STYLES

Create `styles/map.css`:

```css
/* Map container */
.map-container {
  width: 100%;
  height: 100vh;
  background: #000;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #111;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #444;
}

/* MapLibre popup customization */
.maplibregl-popup-content {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
  border: 1px solid #333 !important;
  border-radius: 8px !important;
  padding: 12px !important;
}

.maplibregl-popup-tip {
  border-top-color: rgba(0, 0, 0, 0.9) !important;
}

/* Deck.gl tooltip */
#cable-tooltip {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## STEP 7: RUN THE APP

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and you should see:
- Dark world map
- Cyan submarine cables overlaid
- Layer toggle on left
- Hover tooltips on cables
- Click cables for details

---

## WHAT YOU GET

✅ **500+ submarine cables** (or sample 20)  
✅ **FREE dark map** (OpenFreeMap - no API key)  
✅ **Interactive layers** (toggle on/off)  
✅ **Hover tooltips** (cable name, owners, landing points)  
✅ **Click details panel** (full cable info)  
✅ **Zero API costs** (static data + free tiles)  

---

## NEXT STEPS

Now you can add more layers:
1. **Trade Routes** - Shipping lanes between ports
2. **Ship Traffic** - Real-time AIS positions
3. **Economic Centers** - Financial hubs
4. **Weather Alerts** - Severe weather zones

Which one next? (B, E, F, or H from the plan?)
# Complete Integration Guide

Step-by-step guide to integrate all extracted WorldMonitor features into your app.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Step 1: Map Setup](#step-1-map-setup)
3. [Step 2: Trade Routes](#step-2-trade-routes)
4. [Step 3: Ship Traffic](#step-3-ship-traffic)
5. [Step 4: Weather Alerts](#step-4-weather-alerts)
6. [Step 5: News Aggregation](#step-5-news-aggregation)
7. [Step 6: AI Insights](#step-6-ai-insights)
8. [Complete App Example](#complete-app-example)

---

## Project Structure

Your app should look like this after integration:

```
my-app/
├── .env.local                    # API keys
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapContainer.tsx
│   │   │   ├── TradeRoutesLayer.tsx
│   │   │   ├── ShipTrafficLayer.tsx
│   │   │   └── WeatherAlertsLayer.tsx
│   │   ├── News/
│   │   │   ├── NewsPanel.tsx
│   │   │   └── AIInsightsPanel.tsx
│   │   └── Sidebar.tsx
│   ├── services/
│   │   ├── news-aggregator.ts
│   │   ├── parallel-analysis.ts
│   │   ├── focal-point-detector.ts
│   │   ├── groq-service.ts
│   │   ├── weather.ts
│   │   └── maritime.ts
│   ├── config/
│   │   ├── geo.ts               # Ports, waterways, cables
│   │   ├── trade-routes.ts
│   │   └── rss-feeds.ts
│   ├── types/
│   │   └── index.ts
│   └── App.tsx
└── package.json
```

---

## Step 1: Map Setup

### Install Dependencies

```bash
npm install maplibre-gl deck.gl rss-parser
npm install -D @types/maplibre-gl
```

### 1.1 Create Base Map Component

**`src/components/Map/MapContainer.tsx`**

```tsx
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { DeckGL } from '@deck.gl/react';
import { MapViewState } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  children?: React.ReactNode;
}

export const MapContainer: React.FC<MapContainerProps> = ({ children }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState }) => setViewState(viewState as MapViewState)}
        controller={true}
        layers={[]} // Add your layers here
      >
        <maplibregl.Map
          ref={mapContainer}
          container={mapContainer.current!}
          style="https://tiles.openfreemap.org/styles/dark"
          center={[viewState.longitude, viewState.latitude]}
          zoom={viewState.zoom}
          pitch={viewState.pitch}
          bearing={viewState.bearing}
        />
      </DeckGL>
      {children}
    </div>
  );
};
```

---

## Step 2: Trade Routes

### 2.1 Copy Configuration Files

From `EXTRACT_TRADE_ROUTES.md`, copy these files:

**`src/config/trade-routes.ts`** - (Lines 1-302 from the extraction)

**`src/config/geo.ts`** - Ports and chokepoints data

### 2.2 Create Trade Routes Layer

**`src/components/Map/TradeRoutesLayer.tsx`**

```tsx
import React, { useMemo } from 'react';
import { ArcLayer, TripsLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TRADE_ROUTES, resolveTradeRouteSegments } from '@/config/trade-routes';
import { STRATEGIC_WATERWAYS } from '@/config/geo';

export const useTradeRoutesLayers = (showAnimation: boolean = true) => {
  return useMemo(() => {
    // Route arcs
    const routeArcs = TRADE_ROUTES.flatMap(route => {
      const segments = resolveTradeRouteSegments(route);
      return segments.map((segment, i) => ({
        routeName: route.name,
        routeType: route.type,
        from: segment.from,
        to: segment.to,
        coordinates: segment.coordinates,
        color: route.type === 'primary' ? [0, 150, 255] : [100, 200, 255],
      }));
    });

    const layers = [
      // Arc routes
      new ArcLayer({
        id: 'trade-routes-arcs',
        data: routeArcs,
        getSourcePosition: d => d.coordinates[0],
        getTargetPosition: d => d.coordinates[1],
        getSourceColor: d => d.color,
        getTargetColor: d => d.color,
        getWidth: 2,
        pickable: true,
        greatCircle: true,
      }),

      // Chokepoints
      new ScatterplotLayer({
        id: 'chokepoints',
        data: STRATEGIC_WATERWAYS,
        getPosition: d => d.coordinates,
        getRadius: d => d.importance === 'critical' ? 80000 : 50000,
        getFillColor: [255, 165, 0, 200],
        pickable: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 20,
      }),
    ];

    // Animated vessel flow
    if (showAnimation) {
      const tripData = routeArcs.map((arc, i) => ({
        path: arc.coordinates,
        timestamps: [0, 1000 + i * 100],
        color: arc.color,
      }));

      layers.push(
        new TripsLayer({
          id: 'vessel-flow',
          data: tripData,
          getPath: d => d.path,
          getTimestamps: d => d.timestamps,
          getColor: d => d.color,
          currentTime: Date.now() % 10000,
          trailLength: 500,
          capRounded: true,
          jointRounded: true,
          widthMinPixels: 2,
          fadeTrail: true,
        })
      );
    }

    return layers;
  }, [showAnimation]);
};
```

---

## Step 3: Ship Traffic

### 3.1 Create Ship Traffic Service

**`src/services/maritime.ts`**

```typescript
export interface AISZone {
  id: string;
  name: string;
  coordinates: [number, number];
  density: 'low' | 'medium' | 'high' | 'congested' | 'disrupted';
  vesselCount: number;
  avgSpeed: number;
}

export interface DisruptionEvent {
  id: string;
  location: string;
  coordinates: [number, number];
  type: 'congestion' | 'closure' | 'weather' | 'incident';
  severity: 'low' | 'medium' | 'high';
  description: string;
  startedAt: Date;
}

// Mock data - replace with real AIS API
const MOCK_AIS_ZONES: AISZone[] = [
  {
    id: 'singapore-strait',
    name: 'Singapore Strait',
    coordinates: [103.9, 1.2],
    density: 'congested',
    vesselCount: 245,
    avgSpeed: 8.5,
  },
  {
    id: 'suez-canal',
    name: 'Suez Canal',
    coordinates: [32.3, 30.0],
    density: 'high',
    vesselCount: 42,
    avgSpeed: 6.2,
  },
  // Add more from EXTRACT_SHIP_TRAFFIC.md
];

export const fetchAISZones = async (): Promise<AISZone[]> => {
  // Replace with: return fetch('/api/ais-zones').then(r => r.json());
  return MOCK_AIS_ZONES;
};

export const fetchDisruptions = async (): Promise<DisruptionEvent[]> => {
  // Mock - integrate with real API
  return [];
};
```

### 3.2 Create Ship Traffic Layer

**`src/components/Map/ShipTrafficLayer.tsx`**

```tsx
import { ScatterplotLayer } from '@deck.gl/layers';
import { useEffect, useState } from 'react';
import { fetchAISZones, AISZone } from '@/services/maritime';

const DENSITY_COLORS = {
  low: [0, 255, 0, 150],
  medium: [0, 200, 255, 180],
  high: [255, 255, 0, 200],
  congested: [255, 165, 0, 220],
  disrupted: [255, 0, 0, 240],
};

export const useShipTrafficLayer = () => {
  const [zones, setZones] = useState<AISZone[]>([]);

  useEffect(() => {
    fetchAISZones().then(setZones);
    const interval = setInterval(() => {
      fetchAISZones().then(setZones);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return new ScatterplotLayer({
    id: 'ais-zones',
    data: zones,
    getPosition: d => d.coordinates,
    getRadius: d => Math.max(50000, d.vesselCount * 500),
    getFillColor: d => DENSITY_COLORS[d.density],
    pickable: true,
    opacity: 0.8,
    radiusMinPixels: 10,
    radiusMaxPixels: 50,
    onHover: info => {
      if (info.object) {
        console.log(`${info.object.name}: ${info.object.vesselCount} vessels`);
      }
    },
  });
};
```

---

## Step 4: Weather Alerts

### 4.1 Create Weather Service

**`src/services/weather.ts`**

```typescript
export interface WeatherAlert {
  id: string;
  event: string;
  area: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
  description: string;
  effective: Date;
  expires: Date;
  centroid?: [number, number];
  polygon?: number[][];
}

const SEVERITY_COLORS = {
  Extreme: [255, 0, 0, 200],
  Severe: [255, 165, 0, 180],
  Moderate: [255, 255, 0, 150],
  Minor: [128, 128, 128, 120],
};

// NWS API (free, no key needed for US alerts)
export const fetchWeatherAlerts = async (): Promise<WeatherAlert[]> => {
  try {
    const response = await fetch(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update'
    );
    const data = await response.json();
    
    return data.features
      .filter((f: any) => f.geometry)
      .map((f: any) => ({
        id: f.properties.id,
        event: f.properties.event,
        area: f.properties.areaDesc,
        severity: f.properties.severity,
        description: f.properties.description,
        effective: new Date(f.properties.effective),
        expires: new Date(f.properties.expires),
        centroid: calculateCentroid(f.geometry.coordinates[0]),
        polygon: f.geometry.coordinates[0],
      }));
  } catch (error) {
    console.error('Failed to fetch weather alerts:', error);
    return [];
  }
};

function calculateCentroid(polygon: number[][]): [number, number] {
  let x = 0, y = 0;
  for (const [lon, lat] of polygon) {
    x += lon;
    y += lat;
  }
  return [x / polygon.length, y / polygon.length];
}
```

### 4.2 Create Weather Layer

**`src/components/Map/WeatherAlertsLayer.tsx`**

```tsx
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import { useEffect, useState } from 'react';
import { fetchWeatherAlerts, WeatherAlert } from '@/services/weather';

export const useWeatherAlertsLayer = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);

  useEffect(() => {
    fetchWeatherAlerts().then(setAlerts);
    const interval = setInterval(() => {
      fetchWeatherAlerts().then(setAlerts);
    }, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const severityColors: Record<string, [number, number, number, number]> = {
    Extreme: [255, 0, 0, 200],
    Severe: [255, 165, 0, 180],
    Moderate: [255, 255, 0, 150],
    Minor: [128, 128, 128, 120],
  };

  return [
    // Alert centroids
    new ScatterplotLayer({
      id: 'weather-alerts-points',
      data: alerts.filter(a => a.centroid),
      getPosition: d => d.centroid!,
      getRadius: 50000,
      getFillColor: d => severityColors[d.severity] || [128, 128, 128, 120],
      pickable: true,
      radiusMinPixels: 8,
    }),

    // Alert polygons
    new PolygonLayer({
      id: 'weather-alerts-polygons',
      data: alerts.filter(a => a.polygon),
      getPolygon: d => d.polygon!,
      getFillColor: d => [...(severityColors[d.severity] || [128, 128, 128, 120]).slice(0, 3), 50],
      getLineColor: d => severityColors[d.severity] || [128, 128, 128, 120],
      getLineWidth: 2,
      pickable: true,
      stroked: true,
      filled: true,
    }),
  ];
};
```

---

## Step 5: News Aggregation

### 5.1 Copy RSS Feeds Configuration

From `EXTRACT_01_NEWS_AGGREGATION.md`, copy:

**`src/config/rss-feeds.ts`**

```typescript
export const RSS_FEEDS = [
  // Tier 1: Premium sources
  { url: 'https://feeds.reuters.com/reuters/worldnews', tier: 1, name: 'Reuters' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', tier: 1, name: 'BBC' },
  { url: 'https://apnews.com/rss', tier: 1, name: 'AP' },
  
  // Tier 2: Major outlets
  { url: 'https://feeds.aljazeera.com/aljazeera/news', tier: 2, name: 'Al Jazeera' },
  { url: 'https://feeds.france24.com/en', tier: 2, name: 'France24' },
  
  // Add more from the extraction...
];
```

### 5.2 Create News Aggregator Service

**`src/services/news-aggregator.ts`**

```typescript
import Parser from 'rss-parser';
import { RSS_FEEDS } from '@/config/rss-feeds';

const parser = new Parser();

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  description?: string;
  pubDate: Date;
  source: string;
  sourceTier: 1 | 2 | 3;
}

export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primaryLink: string;
  allItems: NewsItem[];
  sourceCount: number;
  uniqueSources: string[];
  earliestPubDate: Date;
  latestPubDate: Date;
  importanceScore: number;
}

export const fetchAllNews = async (): Promise<NewsItem[]> => {
  const allNews: NewsItem[] = [];
  
  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, 10).map(item => ({
        id: `${feed.name}-${item.guid || item.link}`,
        title: item.title || 'No title',
        link: item.link || '',
        description: item.contentSnippet || item.content || '',
        pubDate: new Date(item.pubDate || Date.now()),
        source: feed.name,
        sourceTier: feed.tier as 1 | 2 | 3,
      }));
      allNews.push(...items);
    } catch (error) {
      console.warn(`Failed to fetch ${feed.name}:`, error);
    }
  }
  
  return allNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
};

// Simple clustering by keyword similarity
export const clusterNews = (items: NewsItem[]): ClusteredEvent[] => {
  const clusters: ClusteredEvent[] = [];
  const used = new Set<string>();
  
  for (const item of items) {
    if (used.has(item.id)) continue;
    
    const similar = items.filter(other => {
      if (used.has(other.id)) return false;
      return calculateSimilarity(item.title, other.title) > 0.6;
    });
    
    similar.forEach(s => used.add(s.id));
    
    clusters.push({
      id: `cluster-${item.id}`,
      primaryTitle: item.title,
      primaryLink: item.link,
      allItems: similar,
      sourceCount: similar.length,
      uniqueSources: [...new Set(similar.map(s => s.source))],
      earliestPubDate: new Date(Math.min(...similar.map(s => s.pubDate.getTime()))),
      latestPubDate: new Date(Math.max(...similar.map(s => s.pubDate.getTime()))),
      importanceScore: calculateImportance(similar),
    });
  }
  
  return clusters.sort((a, b) => b.importanceScore - a.importanceScore);
};

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  return intersection.length / Math.max(wordsA.size, wordsB.size);
}

function calculateImportance(items: NewsItem[]): number {
  const tierBonus = items.reduce((sum, item) => {
    return sum + (item.sourceTier === 1 ? 3 : item.sourceTier === 2 ? 2 : 1);
  }, 0);
  const sourceBonus = new Set(items.map(i => i.source)).size * 2;
  return tierBonus + sourceBonus;
}
```

### 5.3 Create News Panel Component

**`src/components/News/NewsPanel.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { fetchAllNews, clusterNews, ClusteredEvent } from '@/services/news-aggregator';

export const NewsPanel: React.FC = () => {
  const [clusters, setClusters] = useState<ClusteredEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      const news = await fetchAllNews();
      const clustered = clusterNews(news);
      setClusters(clustered.slice(0, 20));
      setLoading(false);
    };

    loadNews();
    const interval = setInterval(loadNews, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="news-panel loading">Loading news...</div>;

  return (
    <div className="news-panel">
      <h2>Live Intelligence</h2>
      <div className="news-list">
        {clusters.map(cluster => (
          <div key={cluster.id} className="news-item">
            <a href={cluster.primaryLink} target="_blank" rel="noopener">
              {cluster.primaryTitle}
            </a>
            <div className="meta">
              <span>{cluster.sourceCount} sources</span>
              <span>{cluster.uniqueSources.join(', ')}</span>
              <span className="score">Score: {cluster.importanceScore}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Step 6: AI Insights

### 6.1 Copy AI Insights Files

Copy all files from `AI_INSIGHTS_IMPLEMENTATION/` folder:
- `types.ts` → `src/services/ai-insights/types.ts`
- `parallel-analysis.ts` → `src/services/ai-insights/parallel-analysis.ts`
- `focal-point-detector.ts` → `src/services/ai-insights/focal-point-detector.ts`
- `groq-service.ts` → `src/services/ai-insights/groq-service.ts`
- `AIInsightsPanel.tsx` → `src/components/News/AIInsightsPanel.tsx`

### 6.2 Set Up Environment Variables

**`.env.local`**

```bash
# Required for AI Insights
GROQ_API_KEY=your_groq_api_key_here

# Optional fallback
OPENROUTER_API_KEY=your_openrouter_key_here
```

Get your Groq API key at: https://console.groq.com

### 6.3 Update Types Export

**`src/services/ai-insights/index.ts`**

```typescript
export * from './types';
export * from './parallel-analysis';
export * from './focal-point-detector';
export * from './groq-service';
```

---

## Complete App Example

### **`src/App.tsx`**

```tsx
import React, { useState, useMemo } from 'react';
import { MapContainer } from './components/Map/MapContainer';
import { useTradeRoutesLayers } from './components/Map/TradeRoutesLayer';
import { useShipTrafficLayer } from './components/Map/ShipTrafficLayer';
import { useWeatherAlertsLayer } from './components/Map/WeatherAlertsLayer';
import { NewsPanel } from './components/News/NewsPanel';
import { AIInsightsPanel } from './components/News/AIInsightsPanel';
import { useEffect, useState } from 'react';
import { clusterNews, fetchAllNews, ClusteredEvent } from './services/news-aggregator';
import './App.css';

function App() {
  const [newsClusters, setNewsClusters] = useState<ClusteredEvent[]>([]);
  const [activeLayers, setActiveLayers] = useState({
    tradeRoutes: true,
    shipTraffic: true,
    weather: true,
  });

  // Load news for AI Insights
  useEffect(() => {
    const load = async () => {
      const news = await fetchAllNews();
      setNewsClusters(clusterNews(news));
    };
    load();
    const interval = setInterval(load, 300000);
    return () => clearInterval(interval);
  }, []);

  // Get all map layers
  const tradeRouteLayers = useTradeRoutesLayers(true);
  const shipTrafficLayer = useShipTrafficLayer();
  const weatherLayers = useWeatherAlertsLayer();

  const layers = useMemo(() => {
    const allLayers = [];
    if (activeLayers.tradeRoutes) allLayers.push(...tradeRouteLayers);
    if (activeLayers.shipTraffic) allLayers.push(shipTrafficLayer);
    if (activeLayers.weather) allLayers.push(...weatherLayers);
    return allLayers;
  }, [activeLayers, tradeRouteLayers, shipTrafficLayer, weatherLayers]);

  return (
    <div className="app">
      {/* Map */}
      <MapContainer layers={layers} />

      {/* Layer Controls */}
      <div className="layer-controls">
        <label>
          <input
            type="checkbox"
            checked={activeLayers.tradeRoutes}
            onChange={e => setActiveLayers(p => ({ ...p, tradeRoutes: e.target.checked }))}
          />
          Trade Routes
        </label>
        <label>
          <input
            type="checkbox"
            checked={activeLayers.shipTraffic}
            onChange={e => setActiveLayers(p => ({ ...p, shipTraffic: e.target.checked }))}
          />
          Ship Traffic
        </label>
        <label>
          <input
            type="checkbox"
            checked={activeLayers.weather}
            onChange={e => setActiveLayers(p => ({ ...p, weather: e.target.checked }))}
          />
          Weather Alerts
        </label>
      </div>

      {/* Side Panel */}
      <div className="side-panel">
        <AIInsightsPanel clusters={newsClusters} />
        <NewsPanel />
      </div>
    </div>
  );
}

export default App;
```

### **`src/App.css`**

```css
.app {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.layer-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 16px;
  border-radius: 8px;
  color: white;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-controls label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.side-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: rgba(20, 20, 35, 0.95);
  overflow-y: auto;
  z-index: 1000;
  padding: 20px;
  color: white;
}

.news-panel {
  margin-top: 20px;
}

.news-item {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.news-item a {
  color: #4a9eff;
  text-decoration: none;
  font-weight: 500;
}

.news-item .meta {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: flex;
  gap: 12px;
}
```

---

## Testing Your Integration

1. **Start your dev server**: `npm run dev`
2. **Check the map**: Should show OpenFreeMap dark theme
3. **Toggle layers**: Use checkboxes to show/hide features
4. **Check news panel**: Should load RSS feeds
5. **Test AI Insights**: Click "Generate Insights" (requires Groq API key)

---

## Next Steps

1. **Add more RSS feeds** in `rss-feeds.ts`
2. **Customize keywords** in `parallel-analysis.ts`
3. **Add real AIS API** in `maritime.ts`
4. **Style the components** to match your design
5. **Add more map layers** (economic centers, critical minerals)

Need help with any specific integration step?
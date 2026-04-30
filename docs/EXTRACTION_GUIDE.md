# WorldMonitor Feature Extraction Guide

This guide helps you extract key features from WorldMonitor for your own app.

---

## 1. MAP IMPLEMENTATION

### Core Architecture
WorldMonitor uses a **hybrid map system**:
- **Desktop**: MapLibre GL JS + Deck.gl (WebGL layers)
- **Mobile**: D3.js (SVG fallback)
- **Optional**: Globe.gl (3D globe view)

### Key Files to Extract

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/MapContainer.ts` | Main map wrapper, switches between implementations | ~1500 |
| `src/components/DeckGLMap.ts` | WebGL map with all layer types | ~2000 |
| `src/components/Map.ts` | SVG fallback for mobile | ~800 |
| `src/config/basemap.ts` | Map style configuration, tile providers | ~200 |
| `src/config/map-layer-definitions.ts` | Layer styling (colors, thickness, etc.) | ~300 |

### Dependencies to Install

```bash
npm install maplibre-gl deck.gl d3 d3-geo supercluster
```

### Minimal Map Setup (Copy This Pattern)

```typescript
// map.ts - Basic MapLibre implementation
import maplibregl from 'maplibre-gl';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'conflict' | 'news' | 'vessel';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
}

export class SimpleMap {
  private map: maplibregl.Map;
  private markers: Map<string, maplibregl.Marker> = new Map();

  constructor(containerId: string) {
    this.map = new maplibregl.Map({
      container: containerId,
      style: 'https://tiles.openfreemap.org/styles/liberty', // Free tiles
      center: [20, 0], // [lng, lat]
      zoom: 2,
      attributionControl: false
    });

    // Add navigation controls
    this.map.addControl(new maplibregl.NavigationControl());
  }

  addMarker(data: MapMarker): void {
    const color = this.getSeverityColor(data.severity);
    
    const el = document.createElement('div');
    el.className = `map-marker map-marker-${data.type}`;
    el.style.cssText = `
      width: 12px;
      height: 12px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid white;
      cursor: pointer;
    `;

    const marker = new maplibregl.Marker(el)
      .setLngLat([data.lng, data.lat])
      .setPopup(new maplibregl.Popup().setText(data.title))
      .addTo(this.map);

    this.markers.set(data.id, marker);
  }

  removeMarker(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      marker.remove();
      this.markers.delete(id);
    }
  }

  clearMarkers(): void {
    this.markers.forEach(m => m.remove());
    this.markers.clear();
  }

  flyTo(lng: number, lat: number, zoom = 5): void {
    this.map.flyTo({ center: [lng, lat], zoom });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#22c55e';
    }
  }
}
```

### Advanced: DeckGL Layers (For Large Datasets)

```typescript
// For 1000+ markers, use DeckGL instead of DOM markers
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

export class DeckMap {
  private deck: Deck;

  constructor(containerId: string) {
    this.deck = new Deck({
      container: containerId,
      initialViewState: {
        longitude: 0,
        latitude: 20,
        zoom: 2
      },
      controller: true
    });
  }

  setData(points: Array<{lat: number; lng: number; value: number}>) {
    const layer = new ScatterplotLayer({
      id: 'points',
      data: points,
      getPosition: d => [d.lng, d.lat],
      getRadius: d => Math.sqrt(d.value) * 1000,
      getFillColor: [239, 68, 68],
      radiusMinPixels: 3,
      radiusMaxPixels: 50
    });

    this.deck.setProps({ layers: [layer] });
  }
}
```

---

## 2. NEWS / RSS AGGREGATION

### Core Architecture
WorldMonitor fetches RSS feeds, parses them, classifies by threat level, and caches results.

### Key Files to Extract

| File | Purpose |
|------|---------|
| `src/services/rss.ts` | Main RSS fetching service with caching |
| `src/config/feeds.ts` | Feed definitions (URLs, names, categories) |
| `src/services/feed-date.ts` | Date parsing from various feed formats |
| `src/services/threat-classifier.ts` | Classify news by threat level |

### Simple RSS Fetcher (Copy This Pattern)

```typescript
// rss-service.ts
interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  pubDate: Date;
  category: 'conflict' | 'politics' | 'economy' | 'tech';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface FeedConfig {
  name: string;
  url: string;
  category: NewsItem['category'];
}

const FEEDS: FeedConfig[] = [
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=reuters-best', category: 'economy' },
  { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'politics' },
];

export class NewsAggregator {
  private cache: Map<string, { items: NewsItem[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async fetchAll(): Promise<NewsItem[]> {
    const promises = FEEDS.map(feed => this.fetchFeed(feed));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  }

  private async fetchFeed(config: FeedConfig): Promise<NewsItem[]> {
    // Check cache
    const cached = this.cache.get(config.name);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.items;
    }

    try {
      // Use RSS to JSON service (or proxy through your backend)
      const response = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(config.url)}`
      );
      const data = await response.json();

      const items: NewsItem[] = data.items.map((item: any) => ({
        id: `${config.name}-${item.guid || item.link}`,
        title: item.title,
        url: item.link,
        source: config.name,
        pubDate: new Date(item.pubDate),
        category: config.category,
        threatLevel: this.classifyThreat(item.title)
      }));

      // Update cache
      this.cache.set(config.name, { items, timestamp: Date.now() });
      
      return items;
    } catch (error) {
      console.error(`Failed to fetch ${config.name}:`, error);
      return cached?.items || [];
    }
  }

  private classifyThreat(title: string): NewsItem['threatLevel'] {
    const critical = /war|attack|invasion|strike|kill/i;
    const high = /crisis|conflict|sanctions|tension/i;
    const medium = /protest|dispute|concern/i;

    if (critical.test(title)) return 'critical';
    if (high.test(title)) return 'high';
    if (medium.test(title)) return 'medium';
    return 'low';
  }
}
```

### React Hook Pattern

```typescript
// useNews.ts
import { useState, useEffect } from 'react';

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const aggregator = new NewsAggregator();
    
    aggregator.fetchAll()
      .then(items => {
        setNews(items);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      aggregator.fetchAll().then(setNews);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { news, loading, error };
}
```

---

## 3. DATA PRESENTATION (PANELS)

### Core Architecture
WorldMonitor uses a **Panel class hierarchy**:
- Base `Panel` class provides common UI (header, loading states, errors)
- Subclasses implement specific data rendering
- All panels follow same lifecycle: `fetch → process → render`

### Key Files to Extract

| File | Purpose |
|------|---------|
| `src/components/Panel.ts` | Base panel class with header, loading, error states |
| `src/components/NewsPanel.ts` | Example: News feed panel |
| `src/components/CIIPanel.ts` | Example: Data visualization panel |
| `src/utils/dom-utils.ts` | Helper for creating DOM elements |

### Base Panel Pattern (Copy This)

```typescript
// Panel.ts - Simplified base class
export interface PanelOptions {
  id: string;
  title: string;
  showCount?: boolean;
}

export abstract class Panel {
  public readonly id: string;
  public readonly title: string;
  protected element: HTMLElement;
  protected content: HTMLElement;
  protected header: HTMLElement;
  protected countEl: HTMLElement | null = null;

  constructor(options: PanelOptions) {
    this.id = options.id;
    this.title = options.title;
    this.element = this.createElement(options);
  }

  private createElement(options: PanelOptions): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel';
    el.id = `panel-${options.id}`;

    // Header
    this.header = document.createElement('div');
    this.header.className = 'panel-header';
    this.header.innerHTML = `
      <h3 class="panel-title">${options.title}</h3>
      ${options.showCount ? '<span class="panel-count">0</span>' : ''}
    `;
    el.appendChild(this.header);

    // Content area
    this.content = document.createElement('div');
    this.content.className = 'panel-content';
    el.appendChild(this.content);

    if (options.showCount) {
      this.countEl = this.header.querySelector('.panel-count');
    }

    return el;
  }

  // Show loading state
  showLoading(message = 'Loading...'): void {
    this.content.innerHTML = `
      <div class="panel-loading">
        <div class="spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  // Show error state
  showError(message: string, retry?: () => void): void {
    this.content.innerHTML = `
      <div class="panel-error">
        <span>${message}</span>
        ${retry ? '<button class="retry-btn">Retry</button>' : ''}
      </div>
    `;
    
    if (retry) {
      this.content.querySelector('.retry-btn')?.addEventListener('click', retry);
    }
  }

  // Update count badge
  setCount(count: number): void {
    if (this.countEl) {
      this.countEl.textContent = count.toString();
      this.countEl.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  // Abstract method for data updates
  abstract update(data: unknown): void;

  // Get DOM element
  mount(container: HTMLElement): void {
    container.appendChild(this.element);
  }
}
```

### Concrete Panel Example

```typescript
// ConflictPanel.ts
interface ConflictEvent {
  id: string;
  location: string;
  country: string;
  fatalities: number;
  date: string;
  lat: number;
  lng: number;
}

export class ConflictPanel extends Panel {
  private events: ConflictEvent[] = [];
  private onEventClick?: (event: ConflictEvent) => void;

  constructor() {
    super({ id: 'conflicts', title: 'Conflict Events', showCount: true });
  }

  setOnEventClick(callback: (event: ConflictEvent) => void): void {
    this.onEventClick = callback;
  }

  update(events: ConflictEvent[]): void {
    this.events = events;
    this.setCount(events.length);
    this.render();
  }

  private render(): void {
    if (this.events.length === 0) {
      this.content.innerHTML = '<div class="panel-empty">No recent events</div>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'conflict-list';

    this.events.forEach(event => {
      const item = document.createElement('div');
      item.className = 'conflict-item';
      item.innerHTML = `
        <div class="conflict-header">
          <span class="conflict-location">${event.location}</span>
          <span class="conflict-fatalities">${event.fatalities} deaths</span>
        </div>
        <div class="conflict-meta">
          <span class="conflict-country">${event.country}</span>
          <span class="conflict-date">${this.formatDate(event.date)}</span>
        </div>
      `;
      
      item.addEventListener('click', () => this.onEventClick?.(event));
      list.appendChild(item);
    });

    this.content.innerHTML = '';
    this.content.appendChild(list);
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }
}
```

### React Component Version

```tsx
// ConflictPanel.tsx
interface ConflictPanelProps {
  events: ConflictEvent[];
  onEventClick?: (event: ConflictEvent) => void;
  loading?: boolean;
}

export function ConflictPanel({ events, onEventClick, loading }: ConflictPanelProps) {
  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3>Conflict Events</h3>
          <span className="panel-count">{events.length}</span>
        </div>
        <div className="panel-content">
          <div className="panel-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Conflict Events</h3>
        <span className="panel-count">{events.length}</span>
      </div>
      <div className="panel-content">
        {events.length === 0 ? (
          <div className="panel-empty">No recent events</div>
        ) : (
          <div className="conflict-list">
            {events.map(event => (
              <div 
                key={event.id} 
                className="conflict-item"
                onClick={() => onEventClick?.(event)}
              >
                <div className="conflict-header">
                  <span className="conflict-location">{event.location}</span>
                  <span className="conflict-fatalities">{event.fatalities} deaths</span>
                </div>
                <div className="conflict-meta">
                  <span className="conflict-country">{event.country}</span>
                  <span className="conflict-date">{formatDate(event.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 4. API DATA FLOW PATTERN

### How WorldMonitor Structures API Calls

```typescript
// Pattern: Service → Cache → Transform → Render

// 1. Service Layer (api/conflicts.ts)
export class ConflictService {
  async fetchEvents(): Promise<ConflictEvent[]> {
    // Check Redis cache first
    const cached = await redis.get('conflicts:latest');
    if (cached) return JSON.parse(cached);

    // Fetch from API
    const response = await fetch('https://ucdpapi.pcr.uu.se/api/gedevents/25.1', {
      headers: { 'x-ucdp-access-token': process.env.UCDP_TOKEN }
    });
    const data = await response.json();

    // Transform to app format
    const events = data.Result.map(this.transformEvent);

    // Cache for 1 hour
    await redis.setex('conflicts:latest', 3600, JSON.stringify(events));

    return events;
  }

  private transformEvent(apiEvent: any): ConflictEvent {
    return {
      id: apiEvent.id,
      location: apiEvent.where_coordinates?.name || 'Unknown',
      country: apiEvent.where_countries?.[0]?.name,
      fatalities: apiEvent.deaths_best || 0,
      date: apiEvent.date_start,
      lat: apiEvent.where_coordinates?.latitude,
      lng: apiEvent.where_coordinates?.longitude
    };
  }
}

// 2. Hook Layer (hooks/useConflicts.ts)
export function useConflicts() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const service = new ConflictService();
    service.fetchEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return { events, loading };
}

// 3. Component Layer (components/ConflictMap.tsx)
export function ConflictMap() {
  const { events, loading } = useConflicts();
  const mapRef = useRef<SimpleMap>();

  useEffect(() => {
    mapRef.current = new SimpleMap('map-container');
  }, []);

  useEffect(() => {
    if (!mapRef.current || loading) return;
    
    // Clear old markers
    mapRef.current.clearMarkers();
    
    // Add new markers
    events.forEach(event => {
      mapRef.current?.addMarker({
        id: event.id,
        lat: event.lat,
        lng: event.lng,
        type: 'conflict',
        severity: event.fatalities > 10 ? 'critical' : event.fatalities > 0 ? 'high' : 'medium',
        title: `${event.location}: ${event.fatalities} deaths`
      });
    });
  }, [events, loading]);

  return <div id="map-container" style={{ width: '100%', height: '100%' }} />;
}
```

---

## 5. COMPLETE MINIMAL EXAMPLE

Here's a complete working example combining all three features:

```tsx
// App.tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Types
interface ConflictEvent {
  id: string;
  location: string;
  country: string;
  fatalities: number;
  date: string;
  lat: number;
  lng: number;
}

// API Service
async function fetchConflicts(): Promise<ConflictEvent[]> {
  // Using a mock endpoint - replace with real API
  const response = await fetch('https://api.example.com/conflicts');
  return response.json();
}

// Components
function Map({ events }: { events: ConflictEvent[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [20, 0],
      zoom: 2
    });

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current) return;
    
    // Clear old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Add new markers
    events.forEach(event => {
      const color = event.fatalities > 10 ? '#ef4444' : event.fatalities > 0 ? '#f97316' : '#eab308';
      
      const el = document.createElement('div');
      el.style.cssText = `width:12px;height:12px;background:${color};border-radius:50%;border:2px solid white;cursor:pointer;`;
      
      const marker = new maplibregl.Marker(el)
        .setLngLat([event.lng, event.lat])
        .setPopup(new maplibregl.Popup().setText(`${event.location}: ${event.fatalities} deaths`))
        .addTo(map.current!);
      
      markers.current.push(marker);
    });
  }, [events]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}

function ConflictList({ events, onSelect }: { events: ConflictEvent[]; onSelect: (e: ConflictEvent) => void }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Conflict Events</h3>
        <span className="count">{events.length}</span>
      </div>
      <div className="panel-content" style={{ maxHeight: '400px', overflow: 'auto' }}>
        {events.map(event => (
          <div key={event.id} className="event-item" onClick={() => onSelect(event)}>
            <div className="event-title">{event.location}</div>
            <div className="event-meta">
              {event.country} • {event.fatalities} deaths
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ConflictEvent | null>(null);

  useEffect(() => {
    fetchConflicts().then(setEvents);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Map events={events} />
      </div>
      <div style={{ width: '350px', borderLeft: '1px solid #333' }}>
        <ConflictList events={events} onSelect={setSelectedEvent} />
        {selectedEvent && (
          <div className="detail-panel">
            <h4>{selectedEvent.location}</h4>
            <p>Country: {selectedEvent.country}</p>
            <p>Fatalities: {selectedEvent.fatalities}</p>
            <p>Date: {selectedEvent.date}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Quick Start Checklist

- [ ] Install dependencies: `npm install maplibre-gl`
- [ ] Copy the SimpleMap class
- [ ] Copy the RSS fetcher or API service
- [ ] Copy the Panel pattern (or use React components)
- [ ] Set up your API keys in `.env`
- [ ] Wire components together in your App

---

## Need More Detail?

Tell me which specific feature to expand:
1. **Map clustering** (group nearby markers)
2. **Real-time updates** (WebSocket or polling)
3. **Data caching** (localStorage or Redis)
4. **Search/filter** (search events, filter by region)
5. **Mobile responsive** (touch gestures, smaller panels)
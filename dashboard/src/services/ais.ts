import type { AisDisruptionEvent, AisDensityZone, AisStatus } from '@/types/ais';
import { MOCK_AIS_DENSITY, MOCK_AIS_DISRUPTIONS } from '@/config/ais-mock-data';

// For real API: AISStream endpoint (you need API key from aisstream.io)
const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY || '';
const USE_MOCK_DATA = true; // Set to false when you have real API

// State
let latestDisruptions: AisDisruptionEvent[] = [];
let latestDensity: AisDensityZone[] = [];
let hasFetched = false;

/**
 * Initialize with mock data
 */
function initWithMockData(): void {
  latestDensity = [...MOCK_AIS_DENSITY];
  latestDisruptions = [...MOCK_AIS_DISRUPTIONS];
}

/**
 * Manually fetch AIS data - call this only when you want to refresh data
 * This replaces the old auto-polling behavior
 */
export async function fetchAisSignals(): Promise<{
  disruptions: AisDisruptionEvent[];
  density: AisDensityZone[];
}> {
  if (USE_MOCK_DATA) {
    console.log('[AIS] Using mock data');
    initWithMockData();
  } else {
    console.log('[AIS] Manually fetching AIS data...');
    await fetchRealAisData();
  }
  hasFetched = true;
  return {
    disruptions: latestDisruptions,
    density: latestDensity,
  };
}

/**
 * Check if AIS data has been fetched at least once
 */
export function hasAisData(): boolean {
  return hasFetched;
}

// Deprecated: No longer used - manual fetch only
export function startAisPolling(): void {
  console.warn('[AIS] Auto-polling is disabled. Use fetchAisSignals() to manually fetch data.');
}

// Deprecated: No longer used - manual fetch only
export function stopAisPolling(): void {
  // No-op - polling is disabled
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
    connected: hasFetched,
    vessels: latestDensity.reduce((sum, z) => sum + (z.shipsPerDay || 0), 0),
    messages: hasFetched ? Math.floor(Math.random() * 50000) + 10000 : 0,
  };
}

/**
 * For real-time vessel positions via WebSocket callback
 * NOTE: Auto-polling is disabled. You must manually call fetchAisSignals() to get data.
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
  // Auto-polling disabled - data will only update when fetchAisSignals() is called manually
}

export function unregisterAisCallback(callback: AisPositionCallback): void {
  positionCallbacks.delete(callback);
}

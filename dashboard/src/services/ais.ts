import type { AisDisruptionEvent, AisDensityZone, AisStatus } from '@/types/ais';
import { MOCK_AIS_DENSITY, MOCK_AIS_DISRUPTIONS } from '@/config/ais-mock-data';

// For real API: AISStream endpoint (you need API key from aisstream.io)
const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY || '';
const USE_MOCK_DATA = true; // Set to false when you have real API

const STORAGE_KEY = 'navicore_ais_data';

// State
let latestDisruptions: AisDisruptionEvent[] = [];
let latestDensity: AisDensityZone[] = [];
let hasFetched = false;

/**
 * Load data from localStorage on module init
 */
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.disruptions && parsed.density) {
        latestDisruptions = parsed.disruptions;
        latestDensity = parsed.density;
        hasFetched = true;
        console.log('[AIS] Loaded from localStorage:', { disruptions: latestDisruptions.length, density: latestDensity.length });
      }
    }
  } catch (e) {
    console.warn('[AIS] Failed to load from localStorage:', e);
  }
}

/**
 * Save data to localStorage
 */
function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      disruptions: latestDisruptions,
      density: latestDensity,
    }));
  } catch (e) {
    console.warn('[AIS] Failed to save to localStorage:', e);
  }
}

/**
 * Initialize with mock data
 */
function initWithMockData(): void {
  latestDensity = [...MOCK_AIS_DENSITY];
  latestDisruptions = [...MOCK_AIS_DISRUPTIONS];
  saveToStorage();
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
  const result = {
    disruptions: latestDisruptions,
    density: latestDensity,
  };
  console.log('[AIS] fetchAisSignals returning:', { disruptions: result.disruptions.length, density: result.density.length });
  return result;
}

/**
 * Check if AIS data has been fetched AND has actual content
 */
export function hasAisData(): boolean {
  // Check both the flag AND that arrays have content
  return hasFetched && latestDisruptions.length > 0 && latestDensity.length > 0;
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
    connected: hasAisData(),
    vessels: latestDensity.reduce((sum, z) => sum + (z.shipsPerDay || 0), 0),
    messages: hasAisData() ? Math.floor(Math.random() * 50000) + 10000 : 0,
  };
}

/**
 * Clear stored AIS data (useful for debugging)
 */
export function clearAisData(): void {
  latestDisruptions = [];
  latestDensity = [];
  hasFetched = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  console.log('[AIS] Data cleared');
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

// Load from storage on module initialization
loadFromStorage();

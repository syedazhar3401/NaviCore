import type { AisDisruptionEvent, AisDensityZone, AisStatus } from '@/types/ais';
import { MOCK_AIS_DENSITY, MOCK_AIS_DISRUPTIONS } from '@/config/ais-mock-data';

// Configuration
const AIS_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const USE_MOCK_DATA = true; // Set to false when you have real API

// State
let latestDisruptions: AisDisruptionEvent[] = [];
let latestDensity: AisDensityZone[] = [];
let isPolling = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;

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

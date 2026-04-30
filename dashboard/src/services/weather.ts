import type { WeatherAlert, WeatherStatus } from '@/types/weather';
import { MOCK_WEATHER_ALERTS } from '@/config/weather-mock-data';

// Configuration
const WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const USE_MOCK_DATA = true;

// State
let latestAlerts: WeatherAlert[] = [];
let isPolling = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastUpdate: Date | null = null;

function initWithMockData(): void {
  latestAlerts = [...MOCK_WEATHER_ALERTS];
  lastUpdate = new Date();
}

export function startWeatherPolling(): void {
  if (isPolling) return;
  
  isPolling = true;
  
  if (USE_MOCK_DATA) {
    initWithMockData();
    pollInterval = setInterval(() => {
      const allAlerts = [...MOCK_WEATHER_ALERTS];
      latestAlerts = allAlerts.filter(() => Math.random() > 0.3);
      lastUpdate = new Date();
    }, WEATHER_REFRESH_INTERVAL_MS);
  } else {
    fetchRealWeatherAlerts();
    pollInterval = setInterval(fetchRealWeatherAlerts, WEATHER_REFRESH_INTERVAL_MS);
  }
}

export function stopWeatherPolling(): void {
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function fetchRealWeatherAlerts(): Promise<void> {
  try {
    const response = await fetch('https://api.weather.gov/alerts/active');
    if (!response.ok) throw new Error(`NWS API error: ${response.status}`);
    
    const data = await response.json();
    
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

export function getWeatherStatus(): WeatherStatus {
  return {
    status: isPolling ? 'ok' : 'error',
    alertCount: latestAlerts.length,
    lastUpdate: lastUpdate || new Date(),
  };
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  if (!isPolling) {
    startWeatherPolling();
  }
  
  return latestAlerts;
}

export function getSeverityColorRGBA(severity: WeatherAlert['severity']): [number, number, number, number] {
  switch (severity) {
    case 'Extreme': return [255, 0, 0, 200];
    case 'Severe': return [255, 100, 0, 180];
    case 'Moderate': return [255, 170, 0, 160];
    case 'Minor': return [128, 128, 128, 150];
    default: return [200, 200, 200, 150];
  }
}

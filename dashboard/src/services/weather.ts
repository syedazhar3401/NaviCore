import type { WeatherAlert, WeatherStatus } from '@/types/weather';
import { MOCK_WEATHER_ALERTS } from '@/config/weather-mock-data';

// Configuration
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY || '';

// Use real API if key is available, otherwise use mock
const USE_MOCK_DATA = !OPENWEATHER_API_KEY && !WEATHERAPI_KEY;
const API_PROVIDER = OPENWEATHER_API_KEY ? 'openweather' : WEATHERAPI_KEY ? 'weatherapi' : 'nws';

// State
let latestAlerts: WeatherAlert[] = [];
let hasFetched = false;
let lastUpdate: Date | null = null;

function initWithMockData(): void {
  latestAlerts = [...MOCK_WEATHER_ALERTS];
  lastUpdate = new Date();
}

/**
 * Manually fetch weather alerts - call this only when you want to refresh data
 * This replaces the old auto-polling behavior
 */
export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  if (USE_MOCK_DATA) {
    console.log('[Weather] Using mock data (no API keys configured)');
    initWithMockData();
  } else {
    console.log('[Weather] Manually fetching weather alerts...');
    await fetchRealWeatherAlerts();
  }
  hasFetched = true;
  return latestAlerts;
}

/**
 * Check if weather data has been fetched at least once
 */
export function hasWeatherData(): boolean {
  return hasFetched;
}

// Deprecated: No longer used - manual fetch only
export async function startWeatherPolling(): Promise<void> {
  console.warn('[Weather] Auto-polling is disabled. Use fetchWeatherAlerts() to manually fetch data.');
}

// Deprecated: No longer used - manual fetch only
export function stopWeatherPolling(): void {
  // No-op - polling is disabled
}

async function fetchRealWeatherAlerts(): Promise<void> {
  try {
    const alertPromises: Promise<WeatherAlert[]>[] = [];
    
    // Fetch from all available APIs for comprehensive coverage
    if (OPENWEATHER_API_KEY) {
      alertPromises.push(fetchOpenWeatherAlerts());
    }
    
    if (WEATHERAPI_KEY) {
      alertPromises.push(fetchWeatherAPIAlerts());
    }
    
    // Always include NWS for US coverage (free, no key needed)
    alertPromises.push(fetchNWSAlerts());
    
    // Wait for all API calls
    const results = await Promise.allSettled(alertPromises);
    
    // Combine all successful results
    let allAlerts: WeatherAlert[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allAlerts = [...allAlerts, ...result.value];
      }
    }
    
    // Remove duplicates based on event + area
    const seen = new Set<string>();
    allAlerts = allAlerts.filter(alert => {
      const key = `${alert.event}-${alert.areaDesc}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Use results if we got any, otherwise fallback to mock
    latestAlerts = allAlerts.length > 0 ? allAlerts : [...MOCK_WEATHER_ALERTS];
    lastUpdate = new Date();
    
    console.log(`[Weather] Fetched ${latestAlerts.length} alerts from ${alertPromises.length} source(s)`);
  } catch (error) {
    console.error('[Weather] Failed to fetch alerts:', error);
    latestAlerts = [...MOCK_WEATHER_ALERTS];
  }
}

/**
 * Fetch from OpenWeatherMap API
 * Free tier: 60 calls/minute
 * Requires API key from: https://openweathermap.org/api
 */
async function fetchOpenWeatherAlerts(): Promise<WeatherAlert[]> {
  // OpenWeatherMap One Call API 3.0 provides alerts for specific locations
  // We'll fetch alerts for major maritime regions
  const regions = [
    { lat: 26.5, lon: -80.0, name: 'Florida Coast' },
    { lat: 29.7, lon: -95.0, name: 'Gulf of Mexico' },
    { lat: 40.7, lon: -74.0, name: 'New York Harbor' },
    { lat: 34.0, lon: -118.2, name: 'Los Angeles' },
    { lat: 51.9, lon: 4.5, name: 'Rotterdam' },
    { lat: 1.26, lon: 103.84, name: 'Singapore' },
    { lat: 35.6, lon: 139.6, name: 'Tokyo Bay' },
    { lat: -33.8, lon: 151.2, name: 'Sydney' },
  ];
  
  const allAlerts: WeatherAlert[] = [];
  
  for (const region of regions.slice(0, 3)) { // Limit to avoid rate limits
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${region.lat}&lon=${region.lon}&exclude=minutely,hourly,daily&appid=${OPENWEATHER_API_KEY}`
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.alerts) {
        for (const alert of data.alerts) {
          allAlerts.push({
            id: `${region.name}-${alert.event}-${Date.now()}`,
            event: alert.event,
            severity: mapOpenWeatherSeverity(alert.tags),
            headline: alert.event,
            description: alert.description,
            areaDesc: region.name,
            onset: new Date(alert.start * 1000),
            expires: new Date(alert.end * 1000),
            coordinates: generatePolygonAroundPoint(region.lon, region.lat, 2),
            centroid: [region.lon, region.lat],
          });
        }
      }
    } catch (e) {
      console.warn(`[Weather] Failed to fetch for ${region.name}:`, e);
    }
  }
  
  return allAlerts.length > 0 ? allAlerts : [...MOCK_WEATHER_ALERTS];
}

/**
 * Fetch from WeatherAPI.com
 * Free tier: 1 million calls/month
 * Requires API key from: https://www.weatherapi.com/
 */
async function fetchWeatherAPIAlerts(): Promise<WeatherAlert[]> {
  // WeatherAPI.com provides alerts via the forecast endpoint
  const regions = [
    'New York',
    'London',
    'Singapore',
    'Tokyo',
    'Sydney',
    'Mumbai',
    'Dubai',
    'Rotterdam',
  ];
  
  const allAlerts: WeatherAlert[] = [];
  
  for (const region of regions.slice(0, 3)) {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(region)}&alerts=yes`
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.alerts && data.alerts.alert) {
        const location = data.location;
        
        for (const alert of data.alerts.alert) {
          allAlerts.push({
            id: `${region}-${alert.event}-${Date.now()}`,
            event: alert.event,
            severity: mapWeatherAPISeverity(alert.severity),
            headline: alert.headline || alert.event,
            description: alert.desc || alert.instruction || '',
            areaDesc: alert.areas || region,
            onset: new Date(alert.effective || Date.now()),
            expires: new Date(alert.expires || Date.now() + 86400000),
            coordinates: generatePolygonAroundPoint(location.lon, location.lat, 3),
            centroid: [location.lon, location.lat],
          });
        }
      }
    } catch (e) {
      console.warn(`[Weather] Failed to fetch for ${region}:`, e);
    }
  }
  
  return allAlerts.length > 0 ? allAlerts : [...MOCK_WEATHER_ALERTS];
}

/**
 * Fetch from US National Weather Service (NWS) API
 * FREE - No API key required
 * US coverage only
 */
async function fetchNWSAlerts(): Promise<WeatherAlert[]> {
  const response = await fetch('https://api.weather.gov/alerts/active');
  
  if (!response.ok) throw new Error(`NWS API error: ${response.status}`);
  
  const data = await response.json();
  
  return data.features.map((feature: any) => {
    // Handle both Polygon and MultiPolygon geometries
    let coordinates: [number, number][] = [];
    const geom = feature.geometry;
    
    if (geom?.type === 'Polygon') {
      coordinates = geom.coordinates?.[0] || [];
    } else if (geom?.type === 'MultiPolygon') {
      // For MultiPolygon, use the first polygon's outer ring
      coordinates = geom.coordinates?.[0]?.[0] || [];
    }
    
    // Calculate centroid from coordinates
    const centroid = calculateCentroid(coordinates);
    
    return {
      id: feature.properties.id,
      event: feature.properties.event,
      severity: feature.properties.severity,
      headline: feature.properties.headline,
      description: feature.properties.description,
      areaDesc: feature.properties.areaDesc,
      onset: new Date(feature.properties.onset),
      expires: new Date(feature.properties.expires),
      coordinates,
      centroid,
    };
  }).filter((alert: WeatherAlert) => alert.coordinates.length > 0); // Only include alerts with valid coordinates
}

/**
 * Map OpenWeather severity tags to our severity levels
 */
function mapOpenWeatherSeverity(tags: string[] = []): WeatherAlert['severity'] {
  const tagStr = tags.join(' ').toLowerCase();
  if (tagStr.includes('extreme') || tagStr.includes('hurricane') || tagStr.includes('tornado')) {
    return 'Extreme';
  }
  if (tagStr.includes('severe') || tagStr.includes('warning')) {
    return 'Severe';
  }
  if (tagStr.includes('moderate') || tagStr.includes('watch')) {
    return 'Moderate';
  }
  return 'Minor';
}

/**
 * Map WeatherAPI severity to our severity levels
 */
function mapWeatherAPISeverity(severity: string = ''): WeatherAlert['severity'] {
  const sev = severity.toLowerCase();
  if (sev.includes('extreme') || sev === '3') return 'Extreme';
  if (sev.includes('severe') || sev === '2') return 'Severe';
  if (sev.includes('moderate') || sev === '1') return 'Moderate';
  return 'Minor';
}

/**
 * Generate a simple polygon around a point (for APIs that don't provide geometry)
 */
function generatePolygonAroundPoint(lon: number, lat: number, radiusDegrees: number): [number, number][] {
  return [
    [lon - radiusDegrees, lat - radiusDegrees],
    [lon + radiusDegrees, lat - radiusDegrees],
    [lon + radiusDegrees, lat + radiusDegrees],
    [lon - radiusDegrees, lat + radiusDegrees],
    [lon - radiusDegrees, lat - radiusDegrees],
  ];
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
    status: hasFetched ? 'ok' : 'error',
    alertCount: latestAlerts.length,
    lastUpdate: lastUpdate || new Date(),
  };
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

export function getApiProvider(): string {
  return API_PROVIDER;
}

export function isUsingMockData(): boolean {
  return USE_MOCK_DATA;
}

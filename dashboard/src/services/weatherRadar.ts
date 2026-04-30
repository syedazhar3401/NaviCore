/**
 * Weather Radar Service - RainViewer Integration
 * Fetches precipitation tiles and manages the radar layer
 * Free API, no key required
 */

export interface RadarState {
  isActive: boolean;
  tileUrl: string | null;
  lastUpdate: Date | null;
}

let radarTileUrl: string | null = null;
let isActive = false;

/**
 * Fetch latest radar tiles from RainViewer
 * Free API, no key required
 */
export async function fetchRadarTiles(): Promise<string | null> {
  try {
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!response.ok) throw new Error(`Radar API error: ${response.status}`);

    const data = await response.json();
    const past = data.radar?.past;
    const latest = past?.[past.length - 1];

    if (!latest) return null;

    // Format: host + path + tileSize/{z}/{x}/{y}/colorScheme/smoothness.png
    // colorScheme 6 = Original style (blue to red)
    // smoothness 1_1 = High smoothness with snow
    radarTileUrl = `${data.host}${latest.path}/256/{z}/{x}/{y}/6/1_1.png`;
    isActive = true;
    return radarTileUrl;
  } catch (error) {
    console.error('[WeatherRadar] Failed to fetch:', error);
    return null;
  }
}

/**
 * Get current radar state
 */
export function getRadarState(): RadarState {
  return {
    isActive,
    tileUrl: radarTileUrl,
    lastUpdate: radarTileUrl ? new Date() : null,
  };
}

/**
 * Check if radar is active
 */
export function isRadarActive(): boolean {
  return isActive;
}

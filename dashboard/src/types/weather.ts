export interface WeatherAlert {
  id: string;
  event: string;           // "Hurricane", "Flood Warning", etc.
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  headline: string;        // Short summary
  description: string;     // Full alert text
  areaDesc: string;        // "Coastal Florida"
  onset: Date;             // When alert starts
  expires: Date;           // When alert ends
  coordinates: [number, number][]; // Polygon of affected area
  centroid?: [number, number];     // Center point for mapping
}

export interface WeatherStatus {
  status: 'ok' | 'warning' | 'error';
  alertCount: number;
  lastUpdate: Date;
}

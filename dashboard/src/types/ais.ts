export type AisDisruptionType = 'gap_spike' | 'chokepoint_congestion';

export interface AisDisruptionEvent {
  id: string;
  name: string;
  type: AisDisruptionType;
  lat: number;
  lon: number;
  severity: 'low' | 'elevated' | 'high';
  changePct: number;
  windowHours: number;
  darkShips?: number;
  vesselCount?: number;
  region?: string;
  description: string;
}

export interface AisDensityZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  intensity: number; // 0-1 scale
  deltaPct: number;
  shipsPerDay?: number;
  note?: string;
}

export interface AisStatus {
  connected: boolean;
  vessels: number;
  messages: number;
}

export type PortType = 'container' | 'oil' | 'lng' | 'mixed' | 'bulk' | 'naval';

export interface Port {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  type: PortType;
  rank?: number;
  note?: string;
}

export interface StrategicWaterway {
  id: string;
  chokepointId: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
}

export type TradeRouteCategory = 'container' | 'energy' | 'bulk';
export type TradeRouteStatus = 'active' | 'disrupted' | 'high_risk';

export interface TradeRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  category: TradeRouteCategory;
  status: TradeRouteStatus;
  volumeDesc: string;
  waypoints: string[];
}

export interface TradeRouteSegment {
  routeId: string;
  routeName: string;
  category: TradeRouteCategory;
  status: TradeRouteStatus;
  volumeDesc: string;
  sourcePosition: [number, number];
  targetPosition: [number, number];
  segmentIndex: number;
  totalSegments: number;
}

export interface TripData {
  path: [number, number][];
  timestamps: number[];
  color: [number, number, number, number];
  width: number;
}

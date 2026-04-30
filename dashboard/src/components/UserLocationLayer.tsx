import { useMemo } from 'react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  timestamp: number;
}

interface UserLocationLayerProps {
  location: UserLocation | null;
  visible?: boolean;
}

interface UserLocationDatum extends UserLocation {
  id: string;
  name: string;
  isUserLocation: true;
}

export function useUserLocationLayers({
  location,
  visible = true,
}: UserLocationLayerProps) {
  return useMemo(() => {
    if (!visible || !location) return [];

    const data: UserLocationDatum[] = [{
      ...location,
      id: 'current-user-location',
      name: 'Your current location',
      isUserLocation: true,
    }];

    const accuracyLayer = new ScatterplotLayer<UserLocationDatum>({
      id: 'user-location-accuracy-layer',
      data,
      getPosition: d => [d.longitude, d.latitude],
      getRadius: d => Math.max(d.accuracy || 30, 30),
      getFillColor: [0, 212, 255, 35],
      getLineColor: [0, 212, 255, 120],
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      radiusMinPixels: 18,
      radiusMaxPixels: 120,
      pickable: false,
    });

    const dotLayer = new ScatterplotLayer<UserLocationDatum>({
      id: 'user-location-dot-layer',
      data,
      getPosition: d => [d.longitude, d.latitude],
      getRadius: 20,
      getFillColor: [0, 230, 255, 240],
      getLineColor: [255, 255, 255, 220],
      stroked: true,
      filled: true,
      lineWidthMinPixels: 2,
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
    });

    const shipLayer = new TextLayer<UserLocationDatum>({
      id: 'user-location-ship-layer',
      data,
      getPosition: d => [d.longitude, d.latitude],
      getText: () => '⛴',
      getSize: 24,
      getColor: [255, 255, 255, 245],
      getPixelOffset: [0, -20],
      getAngle: d => (typeof d.heading === 'number' ? d.heading : 0),
      billboard: true,
      pickable: false,
      characterSet: 'auto',
      fontFamily: 'Inter, system-ui, sans-serif',
    });

    return [accuracyLayer, dotLayer, shipLayer];
  }, [location, visible]);
}

export default useUserLocationLayers;

import { useMemo } from 'react';
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import type { WeatherAlert } from '@/types/weather';
import { getSeverityColorRGBA } from '@/services/weather';

interface WeatherLayerProps {
  alerts: WeatherAlert[];
  showCentroids?: boolean;
  showPolygons?: boolean;
}

export function useWeatherLayers({
  alerts,
  showCentroids = true,
  showPolygons = true,
}: WeatherLayerProps) {
  const alertsWithCoords = useMemo(() => 
    alerts.filter(a => a.centroid && a.centroid.length === 2),
    [alerts]
  );

  const alertsWithPolygons = useMemo(() => 
    alerts.filter(a => a.coordinates && a.coordinates.length > 2),
    [alerts]
  );

  const centroidLayer = useMemo(() => {
    if (!showCentroids || alertsWithCoords.length === 0) return null;

    return new ScatterplotLayer<WeatherAlert>({
      id: 'weather-centroids-layer',
      data: alertsWithCoords,
      getPosition: d => d.centroid as [number, number],
      getRadius: 25000,
      getFillColor: d => getSeverityColorRGBA(d.severity),
      radiusMinPixels: 8,
      radiusMaxPixels: 20,
      pickable: true,
    });
  }, [alertsWithCoords, showCentroids]);

  const polygonLayer = useMemo(() => {
    if (!showPolygons || alertsWithPolygons.length === 0) return null;

    return new PolygonLayer<WeatherAlert>({
      id: 'weather-polygons-layer',
      data: alertsWithPolygons,
      getPolygon: d => d.coordinates,
      getFillColor: d => {
        const color = getSeverityColorRGBA(d.severity);
        return [color[0], color[1], color[2], color[3] / 2] as [number, number, number, number];
      },
      getLineColor: d => getSeverityColorRGBA(d.severity),
      getLineWidth: 2,
      lineWidthMinPixels: 1,
      pickable: true,
      stroked: true,
      filled: true,
    });
  }, [alertsWithPolygons, showPolygons]);

  return [centroidLayer, polygonLayer].filter(Boolean);
}

export default useWeatherLayers;

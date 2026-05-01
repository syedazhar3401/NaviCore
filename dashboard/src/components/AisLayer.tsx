import { useMemo } from 'react';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { AisDisruptionEvent, AisDensityZone } from '@/types/ais';

interface AisLayerProps {
  disruptions: AisDisruptionEvent[];
  density: AisDensityZone[];
  showDensity?: boolean;
  showDisruptions?: boolean;
}

export function useAisLayers({
  disruptions,
  density,
  showDensity = true,
  showDisruptions = true,
}: AisLayerProps) {
  // Debug logging
  console.log('[useAisLayers] Props:', { showDensity, showDisruptions, densityCount: density.length, disruptionsCount: disruptions.length });

  // AIS Density Layer (traffic heatmap)
  const densityLayer = useMemo(() => {
    if (!showDensity || density.length === 0) return null;

    return new ScatterplotLayer<AisDensityZone>({
      id: 'ais-density-layer',
      data: density,
      getPosition: d => [d.lon, d.lat],
      getRadius: d => 4000 + d.intensity * 8000,
      getFillColor: d => {
        const intensity = Math.min(Math.max(d.intensity, 0.15), 1);
        const isCongested = (d.deltaPct || 0) >= 15;
        const alpha = Math.round(40 + intensity * 160);
        
        // Orange for congested areas, cyan for normal traffic
        if (isCongested) {
          return [255, 183, 3, alpha] as [number, number, number, number]; // #ffb703
        }
        return [0, 209, 255, alpha] as [number, number, number, number]; // #00d1ff
      },
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
    });
  }, [density, showDensity]);

  // AIS Disruptions Layer (spoofing, gaps)
  const disruptionsLayer = useMemo(() => {
    console.log('[useAisLayers] disruptionsLayer memo - showDisruptions:', showDisruptions, 'disruptions.length:', disruptions.length);
    if (!showDisruptions || disruptions.length === 0) return null;

    return new ScatterplotLayer<AisDisruptionEvent>({
      id: 'ais-disruptions-layer',
      data: disruptions,
      getPosition: d => [d.lon, d.lat],
      getRadius: 12000,
      getFillColor: d => {
        // Color by severity
        if (d.severity === 'high') {
          return [255, 50, 50, 220] as [number, number, number, number]; // Red
        }
        if (d.severity === 'elevated') {
          return [255, 150, 0, 200] as [number, number, number, number]; // Orange
        }
        return [255, 200, 100, 180] as [number, number, number, number]; // Yellow
      },
      radiusMinPixels: 6,
      radiusMaxPixels: 14,
      pickable: true,
      stroked: true,
      getLineColor: [255, 255, 255, 150] as [number, number, number, number],
      lineWidthMinPixels: 1,
    });
  }, [disruptions, showDisruptions]);

  const result = [densityLayer, disruptionsLayer].filter(Boolean);
  console.log('[useAisLayers] Returning layers:', result.length, 'disruptionsLayer:', disruptionsLayer ? 'present' : 'null');
  return result;
}

export default useAisLayers;

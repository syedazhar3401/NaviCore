import { useMemo } from 'react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PORTS } from '@/config/ports';
import type { Port } from '@/types/trade';

interface PortsLayerProps {
  visible?: boolean;
  showLabels?: boolean;
}

// Color mapping for port types
const PORT_COLORS: Record<string, [number, number, number, number]> = {
  container: [0, 209, 255, 200],   // Cyan
  oil: [255, 100, 50, 200],        // Orange-red
  lng: [100, 255, 150, 200],       // Green
  mixed: [200, 150, 255, 200],     // Purple
  bulk: [255, 200, 100, 200],      // Yellow
  naval: [255, 50, 100, 200],      // Pink-red
};

export function usePortsLayers({
  visible = true,
  showLabels = true,
}: PortsLayerProps) {
  const portsLayer = useMemo(() => {
    if (!visible) return null;

    return new ScatterplotLayer<Port>({
      id: 'ports-layer',
      data: PORTS,
      getPosition: d => [d.lon, d.lat],
      getRadius: d => {
        // Size based on rank or importance
        if (d.rank && d.rank <= 10) return 8000;
        if (d.rank && d.rank <= 20) return 6000;
        return 4000;
      },
      getFillColor: d => {
        const color = PORT_COLORS[d.type] || PORT_COLORS.mixed;
        return color;
      },
      getLineColor: [255, 255, 255, 150],
      stroked: true,
      lineWidthMinPixels: 1,
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
    });
  }, [visible]);

  const labelsLayer = useMemo(() => {
    if (!visible || !showLabels) return null;

    return new TextLayer<Port>({
      id: 'ports-labels-layer',
      data: PORTS.filter(p => p.rank && p.rank <= 30), // Only label top 30 ports to avoid clutter
      getPosition: d => [d.lon, d.lat],
      getText: d => d.name.split(' ').slice(-2).join(' '), // Short name
      getSize: d => d.rank && d.rank <= 10 ? 14 : 11,
      getColor: [255, 255, 255, 200],
      getPixelOffset: [0, -15],
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '500',
      billboard: true,
      pickable: false,
      characterSet: 'auto',
    });
  }, [visible, showLabels]);

  return [portsLayer, labelsLayer].filter(Boolean);
}

export default usePortsLayers;

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import {
  resolveTradeRouteSegments,
  TRADE_ROUTES,
  ROUTE_WAYPOINTS_MAP,
  type TradeRouteSegment,
} from '@/config/trade-routes';
import { STRATEGIC_WATERWAYS } from '@/config/waterways';
import type { TripData } from '@/types/trade';

// Animation constants
const TRADE_ANIMATION_SPEED = 0.5;
const TRADE_ANIMATION_CYCLE = 4000;
const TRADE_TRAIL_LENGTH = 80;
const TRADE_GC_INTERPOLATION_POINTS = 50;

// Color palettes (RGBA)
const COLORS = {
  active: [100, 200, 255, 160] as [number, number, number, number],
  disrupted: [255, 80, 80, 200] as [number, number, number, number],
  highRisk: [255, 180, 50, 180] as [number, number, number, number],
  chokepoint: [255, 180, 50, 180] as [number, number, number, number],
};

// Great circle interpolation helper
function interpolateGreatCircle(
  start: [number, number],
  end: [number, number],
  numPoints: number
): [number, number][] {
  const points: [number, number][] = [];
  const lat1 = (start[1] * Math.PI) / 180;
  const lon1 = (start[0] * Math.PI) / 180;
  const lat2 = (end[1] * Math.PI) / 180;
  const lon2 = (end[0] * Math.PI) / 180;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((lat2 - lat1) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
    )
  );

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = (180 / Math.PI) * Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = (180 / Math.PI) * Math.atan2(y, x);
    points.push([lon, lat]);
  }
  return points;
}

interface TradeRoutesLayerProps {
  visible: boolean;
  animationEnabled?: boolean;
  showChokepoints?: boolean;
}

export function useTradeRoutesLayers({
  visible,
  animationEnabled = true,
  showChokepoints = true,
}: TradeRoutesLayerProps) {
  const segments = useMemo(() => resolveTradeRouteSegments(), []);
  const [animationTime, setAnimationTime] = useState(0);
  const animationFrame = useRef<number | null>(null);
  const lastTime = useRef(performance.now());

  // Build animated trips data
  const trips = useMemo(() => {
    if (!visible || !animationEnabled) return [];

    const routeGroups = new Map<string, TradeRouteSegment[]>();
    for (const seg of segments) {
      const existing = routeGroups.get(seg.routeId);
      if (existing) existing.push(seg);
      else routeGroups.set(seg.routeId, [seg]);
    }

    const tripsData: TripData[] = [];
    for (const [, routeSegments] of routeGroups) {
      const sorted = routeSegments.sort((a, b) => a.segmentIndex - b.segmentIndex);
      const fullPath: [number, number][] = [];

      for (let i = 0; i < sorted.length; i++) {
        const seg = sorted[i]!;
        const arcPoints = interpolateGreatCircle(
          seg.sourcePosition,
          seg.targetPosition,
          TRADE_GC_INTERPOLATION_POINTS
        );
        if (i === 0) {
          fullPath.push(...arcPoints);
        } else {
          fullPath.push(...arcPoints.slice(1));
        }
      }

      const timestamps: number[] = [];
      for (let i = 0; i < fullPath.length; i++) {
        timestamps.push((i / (fullPath.length - 1)) * TRADE_ANIMATION_CYCLE);
      }

      const first = sorted[0]!;
      const color =
        first.status === 'disrupted'
          ? COLORS.disrupted
          : first.status === 'high_risk'
          ? COLORS.highRisk
          : COLORS.active;
      const width = first.category === 'energy' ? 4 : first.category === 'container' ? 2.5 : 2;

      tripsData.push({ path: fullPath, timestamps, color, width });
    }

    return tripsData;
  }, [segments, visible, animationEnabled]);

  // Animation loop
  useEffect(() => {
    if (!visible || !animationEnabled) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const animate = (now: number) => {
      const delta = now - lastTime.current;
      lastTime.current = now;
      setAnimationTime(t => (t + delta * TRADE_ANIMATION_SPEED) % TRADE_ANIMATION_CYCLE);
      animationFrame.current = requestAnimationFrame(animate);
    };

    lastTime.current = performance.now();
    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [visible, animationEnabled]);

  // Get chokepoints used by routes
  const routeChokepoints = useMemo(() => {
    if (!visible || !showChokepoints) return [];
    const waypointIds = new Set<string>();
    for (const seg of segments) {
      const waypoints = ROUTE_WAYPOINTS_MAP.get(seg.routeId);
      if (waypoints) for (const wp of waypoints) waypointIds.add(wp);
    }
    return STRATEGIC_WATERWAYS.filter(w => waypointIds.has(w.id));
  }, [segments, visible, showChokepoints]);

  // Color helper
  const getColor = useCallback((status: string): [number, number, number, number] => {
    switch (status) {
      case 'disrupted':
        return COLORS.disrupted;
      case 'high_risk':
        return COLORS.highRisk;
      default:
        return COLORS.active;
    }
  }, []);

  // Create layers
  const layers = useMemo(() => {
    if (!visible) return [];

    const arcLayer = new ArcLayer<TradeRouteSegment>({
      id: 'trade-routes-layer',
      data: segments,
      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,
      getSourceColor: d => getColor(d.status),
      getTargetColor: d => getColor(d.status),
      getWidth: d => (d.category === 'energy' ? 3 : 2),
      widthMinPixels: 1,
      widthMaxPixels: 8,
      greatCircle: true,
      pickable: true,
    });

    const tripsLayer =
      animationEnabled && trips.length > 0
        ? new TripsLayer<TripData>({
            id: 'trade-route-trips-layer',
            data: trips,
            getPath: d => d.path,
            getTimestamps: d => d.timestamps,
            getColor: d => d.color,
            getWidth: d => d.width,
            widthMinPixels: 2,
            currentTime: animationTime,
            trailLength: TRADE_TRAIL_LENGTH,
            pickable: false,
          })
        : null;

    const chokepointsLayer = showChokepoints
      ? new ScatterplotLayer({
          id: 'trade-chokepoints-layer',
          data: routeChokepoints,
          getPosition: d => [d.lon, d.lat],
          getFillColor: COLORS.chokepoint,
          getLineColor: [255, 220, 120, 255],
          getRadius: 30000,
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
        })
      : null;

    return [arcLayer, tripsLayer, chokepointsLayer].filter(Boolean);
  }, [visible, segments, trips, animationTime, routeChokepoints, animationEnabled, showChokepoints, getColor]);

  return { layers, segments };
}

export default useTradeRoutesLayers;

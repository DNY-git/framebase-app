import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import type { FeatureCollection, Geometry } from 'geojson';

interface SimpleNigeriaMapProps {
  data: FeatureCollection<Geometry, { state?: string; value?: number; [key: string]: unknown }>;
  width?: number;
  height?: number;
}

export function SimpleNigeriaMap({ data, width = 800, height = 400 }: SimpleNigeriaMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width, height });
  const [hovered, setHovered] = useState<{ state: string; value: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          setDims({ width: cr.width, height: cr.height });
        }
      }
    });
    obs.observe(containerRef.current);
    // Initial
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDims({ width: rect.width, height: rect.height });
    }
    return () => obs.disconnect();
  }, []);

  const { paths, colorScale, max } = useMemo(() => {
    if (!data || !data.features.length) return { paths: [], colorScale: null as unknown as ReturnType<typeof scaleSequential>, max: 0 };
    const counts = data.features.map((f) => Number((f.properties as { value?: number })?.value ?? 0));
    const maxVal = Math.max(1, ...counts);
    const sc = scaleSequential(interpolateBlues).domain([0, maxVal]);
    const projection = geoMercator().fitSize([dims.width, dims.height], data as never);
    const pathGen = geoPath(projection);
    const paths = data.features.map((feature, idx) => {
      const d = pathGen(feature as unknown as Parameters<typeof pathGen>[0]);
      const props = feature.properties as { state?: string; value?: number };
      const state = String(props.state ?? `feature-${idx}`);
      const value = Number(props.value ?? 0);
      // Debug log for first feature
      if (idx === 0) {
        console.log('[SimpleNigeriaMap] first feature', state, 'd length', d?.length, 'd snippet', d?.slice(0,120), 'value', value, 'dims', dims);
      }
      return {
        d: d ?? '',
        state,
        value,
        fill: value === 0 ? 'var(--surface-muted)' : sc(value),
        idx,
        feature,
      };
    }).filter(p => p.d && p.d.length > 10); // filter out degenerate paths
    console.log('[SimpleNigeriaMap] generated paths', paths.length, 'out of', data.features.length, 'dims', dims, 'max', maxVal);
    return { paths, colorScale: sc, max: maxVal };
  }, [data, dims.width, dims.height]);

  if (!data || !data.features.length) {
    return <div className="flex h-full items-center justify-center text-xs text-foreground-muted">No geo data</div>;
  }

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ minHeight: '384px' }}>
      <svg width={dims.width} height={dims.height} viewBox={`0 0 ${dims.width} ${dims.height}`} className="h-full w-full">
        <g>
          {paths.map((p) => (
            <path
              key={p.state + p.idx}
              d={p.d}
              fill={p.fill}
              stroke="var(--border-color)"
              strokeWidth={0.5}
              className="cursor-pointer transition-colors hover:opacity-80"
              onMouseEnter={(e) => {
                const rect = (e.target as SVGPathElement).getBoundingClientRect();
                const containerRect = containerRef.current?.getBoundingClientRect();
                if (containerRect) {
                  setHovered({ state: p.state, value: p.value, x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top });
                }
              }}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </g>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: `${hovered.x}px`, top: `${hovered.y}px`, transform: 'translate(-50%, -100%) translateY(-8px)' }}
        >
          <p className="font-medium text-popover-foreground">{hovered.state}</p>
          <p className="text-popover-foreground">{hovered.value} projects</p>
        </div>
      )}
      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-1.5 text-xs shadow-sm">
        <div className="h-3 w-20 rounded-full" style={{ background: `linear-gradient(to right, ${colorScale(0)}, ${colorScale(max)})` }} />
        <span className="text-foreground-muted">0</span>
        <span className="text-foreground-muted">—</span>
        <span className="font-medium text-foreground">{max} projects</span>
      </div>
    </div>
  );
}

"use client";

import { ParentSize } from "@visx/responsive";
import { scaleBand, scaleLinear, scaleTime } from "@visx/scale";
import { motion } from "motion/react";
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  ChartProvider,
  type ChartContextValue,
  type Margin,
  useChartHover,
  useChartStable,
} from "./chart-context";
import { DEFAULT_CHART_STATUS, resolveRestingChartPhase } from "./chart-phase";

/**
 * Categorical bar chart. Complements the time-series `AreaChart`: same
 * composition API (`Grid`, `ChartTooltip`, portal-based axis labels) but a
 * band scale on x instead of a time scale.
 *
 * Example:
 * ```jsx
 * <BarChart data={data} xDataKey="day" aspectRatio="4 / 1" barGap={0.1}>
 *   <Grid horizontal />
 *   <Bar dataKey="value" lineCap="butt" />
 *   <BarXAxis maxLabels={8} />
 *   <ChartTooltip />
 * </BarChart>
 * ```
 */

export interface BarChartProps {
  /** Data array — each item needs the `xDataKey` field plus numeric series values. */
  data: Record<string, unknown>[];
  /** Key in data for the categorical x-axis. Default: "day" */
  xDataKey?: string;
  /** Gap between bars as a fraction of each band. Default: 0.1 */
  barGap?: number;
  /** Aspect ratio as "width / height". Default: "2 / 1" */
  aspectRatio?: string;
  /** Chart margins */
  margin?: Partial<Margin>;
  /** Additional class name for the container */
  className?: string;
  /** Child components (Bar, Grid, BarXAxis, ChartTooltip, …) */
  children: ReactNode;
}

const DEFAULT_MARGIN: Margin = { top: 16, right: 16, bottom: 32, left: 32 };

export interface BarProps {
  /** Key in data for the numeric value. */
  dataKey: string;
  /** Bar fill color. A per-point `fill` string takes precedence. Default: var(--chart-line-primary) */
  fill?: string;
  /** Cap style of the bar top. Default: "butt" */
  lineCap?: "butt" | "round";
  /** Opacity applied to non-hovered bars while one bar is hovered. Default: 0.45 */
  dimOpacity?: number;
}

export function Bar({
  dataKey,
  fill = "var(--chart-line-primary)",
  lineCap = "butt",
  dimOpacity = 0.45,
}: BarProps): React.JSX.Element {
  const { data, barScale, barXAccessor, yScale, orientation } = useChartStable();
  const { hoveredBarIndex } = useChartHover();

  if (!barScale || orientation !== "vertical") {
    return <g className="chart-bar-series" />;
  }

  const radius = lineCap === "round" ? Math.min(4, barScale.bandwidth() / 2) : 0;

  return (
    <g className="chart-bar-series">
      {data.map((point, index) => {
        const bandKey =
          typeof barXAccessor === "function"
            ? barXAccessor(point)
            : String(point.__barKey__ ?? index);
        const x = barScale(bandKey);
        if (x == null) {
          return null;
        }
        const rawValue = Number(point[dataKey] ?? 0);
        const value = Number.isFinite(rawValue) ? rawValue : 0;
        const yTop = yScale(Math.max(value, 0));
        const height = Math.max(0, yScale(0) - yTop);
        return (
          <motion.rect
            animate={{
              height,
              opacity:
                hoveredBarIndex != null && hoveredBarIndex !== index
                  ? dimOpacity
                  : 1,
              y: yTop,
            }}
            fill={typeof point.fill === "string" ? point.fill : fill}
            initial={{ height: 0, opacity: 1, y: yScale(0) }}
            key={`${bandKey}-${index}`}
            rx={radius}
            transition={{ duration: 0.5, ease: "easeOut" }}
            width={barScale.bandwidth()}
            x={x}
          />
        );
      })}
    </g>
  );
}

Bar.displayName = "Bar";

function truncateLabel(label: string, maxLength = 10): string {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

export interface BarXAxisProps {
  /** Maximum number of tick labels to render. Excess labels are evenly sampled. Default: 8 */
  maxLabels?: number;
}

const BarXAxisInner = memo(function BarXAxisInner({ maxLabels = 8 }: BarXAxisProps) {
  const { barScale, margin, containerRef } = useChartStable();

  if (!(containerRef.current && barScale)) {
    return null;
  }

  const keys = barScale.domain();
  const step = Math.max(1, Math.ceil(keys.length / maxLabels));
  const ticks = keys.filter((_, index) => index % step === 0);

  return createPortal(
    <div className="pointer-events-none absolute inset-0">
      {ticks.map((label) => {
        const x = barScale(label);
        if (x == null) {
          return null;
        }
        return (
          <div
            className="absolute"
            key={label}
            style={{
              bottom: 12,
              display: "flex",
              justifyContent: "center",
              left: margin.left + x + barScale.bandwidth() / 2,
              width: 0,
            }}
          >
            <span className="whitespace-nowrap text-xs text-chart-label">
              {truncateLabel(label)}
            </span>
          </div>
        );
      })}
    </div>,
    containerRef.current,
  );
});

/** Portal targets need a client mount before `containerRef.current` exists. */
export function BarXAxis(props: BarXAxisProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <BarXAxisInner {...props} />;
}

BarXAxis.displayName = "BarXAxis";

interface HoverOverlayProps {
  keys: string[];
  barScale: ReturnType<typeof scaleBand<string>>;
  innerHeight: number;
  onHover: (index: number | null) => void;
}

function HoverOverlay({ keys, barScale, innerHeight, onHover }: HoverOverlayProps) {
  return (
    <>
      {keys.map((key, index) => {
        const x = barScale(key);
        if (x == null) {
          return null;
        }
        return (
          <rect
            fill="transparent"
            height={innerHeight}
            key={`hover-${key}-${index}`}
            onMouseLeave={() => onHover(null)}
            onMouseMove={() => onHover(index)}
            width={barScale.bandwidth()}
            x={x}
            y={0}
          />
        );
      })}
    </>
  );
}

export function BarChart({
  data,
  xDataKey = "day",
  barGap = 0.1,
  aspectRatio = "2 / 1",
  margin: marginProp,
  className = "",
  children,
}: BarChartProps): React.JSX.Element {
  const margin = { ...DEFAULT_MARGIN, ...marginProp };
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  const rows = useMemo<
    Array<Record<string, unknown> & { __barKey__: string }>
  >(
    () =>
      data.map((point) => ({
        ...point,
        __barKey__: String(point[xDataKey]),
      })),
    [data, xDataKey],
  );

  const chartPhase = resolveRestingChartPhase(DEFAULT_CHART_STATUS);

  return (
    <div
      className={cn("relative w-full", className)}
      ref={containerRef}
      style={{ aspectRatio, touchAction: "none" }}
    >
      <ParentSize debounceTime={10}>
        {({ width, height }) => {
          const innerWidth = Math.max(0, width - margin.left - margin.right);
          const innerHeight = Math.max(0, height - margin.top - margin.bottom);

          const barScale = scaleBand<string>({
            domain: rows.map((row) => row.__barKey__),
            paddingInner: barGap,
            paddingOuter: barGap / 2,
            range: [0, innerWidth],
          });

          // Sum every numeric series field across rows so multi-`Bar`
          // compositions share one sensible domain.
          const yMax = rows.reduce((max, row) => {
            for (const [key, value] of Object.entries(row)) {
              if (key.startsWith("__")) continue;
              const numeric = Number(value);
              if (Number.isFinite(numeric) && numeric > max) {
                max = numeric;
              }
            }
            return max;
          }, 0);
          const yScale = scaleLinear({
            clamp: true,
            domain: [0, yMax > 0 ? yMax * 1.05 : 1],
            nice: true,
            range: [innerHeight, 0],
          });

          const tooltipData =
            hoveredIndex != null && rows[hoveredIndex] != null
              ? {
                  point: rows[hoveredIndex],
                  index: hoveredIndex,
                  x:
                    (barScale(rows[hoveredIndex].__barKey__) ?? 0) +
                    barScale.bandwidth() / 2,
                  yPositions: {},
                }
              : null;

          // The shared context is typed around time-series charts; provide an
          // inert time scale so time-series-only consumers never engage.
          const inertXScale = scaleTime<number>({
            domain: [0, 1] as unknown as [number, number],
            range: [0, innerWidth],
          }) as ChartContextValue["xScale"];

          const contextValue: ChartContextValue = {
            animationDuration: 0,
            barScale,
            barXAccessor: (point) => String(point[xDataKey]),
            bandWidth: barScale.bandwidth(),
            chartPhase,
            chartStatus: DEFAULT_CHART_STATUS,
            columnWidth: barScale.bandwidth(),
            containerRef,
            data: rows,
            dateLabels: rows.map((row) => String(row[xDataKey])),
            height,
            hoveredBarIndex: hoveredIndex,
            innerHeight,
            innerWidth,
            isLoaded: true,
            lines: [],
            margin,
            orientation: "vertical",
            referenceAreas: [],
            renderData: rows,
            setHoveredBarIndex: handleHover,
            setTooltipData: () => {},
            stacked: false,
            tooltipData,
            width,
            xAccessor: () => new Date(0),
            xScale: inertXScale,
            yDomainSkeletonByAxis: {},
            yDomainTargetByAxis: {},
            yDomainTweenDuration: 0,
            yScale,
            yScales: { left: yScale },
          };

          return (
            <ChartProvider value={contextValue}>
              <svg height={height} width={width}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                  {children}
                  <HoverOverlay
                    barScale={barScale}
                    innerHeight={innerHeight}
                    keys={rows.map((row) => row.__barKey__)}
                    onHover={handleHover}
                  />
                </g>
              </svg>
            </ChartProvider>
          );
        }}
      </ParentSize>
    </div>
  );
}

export default BarChart;

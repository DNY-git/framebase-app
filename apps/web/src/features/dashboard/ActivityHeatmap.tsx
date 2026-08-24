import { useMemo } from 'react';
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  type HeatmapColumn,
} from '@bklitui/ui/charts';

export interface ActivityHeatmapDatum {
  date: string;
  count: number;
}

/**
 * Reshape flat daily activity counts into the calendar-column shape the Bklit
 * `HeatmapChart` expects: one `HeatmapColumn` per week (Sunday-start), each
 * holding 7 `HeatmapBin`s (one per weekday) with a real `Date` and `count`.
 * Leading/trailing partial weeks are padded with zero-count days so the grid
 * stays rectangular.
 */
function toHeatmapColumns(daily: ActivityHeatmapDatum[]): HeatmapColumn[] {
  if (daily.length === 0) return [];

  const days = daily
    .map((d) => ({ date: new Date(`${d.date}T00:00:00Z`), count: d.count }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const padded: Array<{ date: Date; count: number }> = [];
  const firstDow = days[0].date.getUTCDay(); // 0 = Sunday
  for (let i = firstDow; i > 0; i--) {
    const d = new Date(days[0].date);
    d.setUTCDate(d.getUTCDate() - i);
    padded.push({ date: d, count: 0 });
  }
  padded.push(...days);
  while (padded.length % 7 !== 0) {
    const last = padded[padded.length - 1].date;
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() + 1);
    padded.push({ date: d, count: 0 });
  }

  const columns: HeatmapColumn[] = [];
  for (let w = 0; w < padded.length; w += 7) {
    const week = padded.slice(w, w + 7);
    columns.push({
      bin: w / 7,
      bins: week.map((d, i) => ({ count: d.count, bin: i, date: d.date })),
    });
  }
  return columns;
}

/**
 * Calendar-style work-activity heatmap built on the Bklit `HeatmapChart`.
 * Cell intensity uses the 5-step grey scale defined by `--chart-scale-01…05`
 * (subtle and neutral, readable in both light and dark themes).
 */
export function ActivityHeatmap({
  data,
  binSize = 14,
  gap = 3,
}: {
  data: ActivityHeatmapDatum[];
  binSize?: number;
  gap?: number;
}) {
  const columns = useMemo(() => toHeatmapColumns(data), [data]);

  return (
    <HeatmapChart
      data={columns}
      weekStartDay={0}
      binSize={binSize}
      gap={gap}
      className="w-full"
    >
      <HeatmapCells />
      <HeatmapXAxis />
      <HeatmapYAxis />
      <HeatmapLegend />
      <HeatmapTooltip />
    </HeatmapChart>
  );
}

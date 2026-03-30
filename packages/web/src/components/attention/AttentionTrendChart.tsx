import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../../api/attention.js";

// ─── Label helpers ─────────────────────────────────────────────────────────────

/** Convert "2026-W12" → "W12" for axis display */
function formatWeekLabel(isoWeek: string): string {
  const match = /W(\d+)$/.exec(isoWeek);
  return match ? `W${match[1]}` : isoWeek;
}

// ─── Chart ─────────────────────────────────────────────────────────────────────

interface AttentionTrendChartProps {
  data: TrendPoint[];
}

export function AttentionTrendChart({ data }: AttentionTrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        No trend data available.
      </p>
    );
  }

  const [showTable, setShowTable] = useState(false);

  const totalFlags = data.reduce((sum, p) => sum + p.count, 0);
  const chartData = data.map((p) => ({ ...p, label: formatWeekLabel(p.isoWeek) }));

  return (
    <div>
      {totalFlags < 3 && (
        <p className="text-xs text-neutral-400 mb-3">
          Limited data — fewer than 3 flags in this period.
        </p>
      )}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "#f3f4f6" }}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
              formatter={(value) => [value, "Flags"]}
            />
            <Bar dataKey="count" fill="#1a1d2e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        className="text-sm text-primary-700 hover:underline mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded px-1"
      >
        {showTable ? "Hide data table" : "View as table"}
      </button>
      {showTable && (
        <table className="mt-3 w-full text-sm border-collapse">
          <caption className="sr-only">Attention flags by week</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left py-1 pr-4 font-medium text-neutral-700 border-b border-neutral-200">Week</th>
              <th scope="col" className="text-right py-1 font-medium text-neutral-700 border-b border-neutral-200">Flags</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.isoWeek}>
                <td className="py-1 pr-4 text-neutral-600">{formatWeekLabel(point.isoWeek)}</td>
                <td className="py-1 text-right text-neutral-900">{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { TooltipContentProps, TooltipPayloadEntry } from "recharts";
import type { WellbeingTrajectoryPoint } from "@indomitable-unity/shared";
import { swemwbsBand, uclaBand } from "../../lib/wellbeing-norms.js";

// UK SWEMWBS population mean (source: SWEMWBS scoring guide)
const SWEMWBS_UK_MEAN = 23.6;

interface ChartDatum {
  date: string;
  swemwbs: number;
  ucla: number;
  completedAt: string;
}

interface Props {
  trajectory: WellbeingTrajectoryPoint[];
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

function WellbeingTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;

  const swemwbsEntry = (payload as ReadonlyArray<TooltipPayloadEntry>).find((p) => p.dataKey === "swemwbs");
  const uclaEntry = (payload as ReadonlyArray<TooltipPayloadEntry>).find((p) => p.dataKey === "ucla");

  const swScore = swemwbsEntry?.value as number | undefined;
  const ucScore = uclaEntry?.value as number | undefined;

  const swBand = swScore != null ? swemwbsBand(swScore) : null;
  const ucBand = ucScore != null ? uclaBand(ucScore) : null;

  return (
    <div className="rounded-[var(--radius-md)] border border-neutral-200 bg-white p-3 shadow-sm text-sm">
      <p className="font-medium text-neutral-700 mb-2">{label}</p>
      {swScore != null && swBand && (
        <p className="text-neutral-600">
          SWEMWBS:{" "}
          <span className="font-semibold text-neutral-900">{swScore}/35</span>{" "}
          <span className={`text-xs font-semibold ${swBand.color}`}>{swBand.label}</span>
        </p>
      )}
      {ucScore != null && ucBand && (
        <p className="text-neutral-600 mt-1">
          UCLA:{" "}
          <span className="font-semibold text-neutral-900">{ucScore}/12</span>{" "}
          <span className={`text-xs font-semibold ${ucBand.color}`}>{ucBand.label}</span>
        </p>
      )}
    </div>
  );
}

// ─── WellbeingChart ────────────────────────────────────────────────────────────

export function WellbeingChart({ trajectory }: Props) {
  if (trajectory.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Your wellbeing journey will appear here after your first check-in.
      </p>
    );
  }

  const chartData: ChartDatum[] = trajectory.map((p) => ({
    date: new Date(p.completedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    swemwbs: p.wemwbsScore,
    ucla: p.uclaScore,
    completedAt: p.completedAt,
  }));

  return (
    <>
      {/* Chart — aria-hidden because companion table provides data to screen readers */}
      <div className="h-72" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 80, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            {/* Single Y axis: SWEMWBS 7-35 and UCLA 3-12 both visible on [0,40] domain.
                UCLA will appear in the lower quarter — acceptable per research decision. */}
            <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} />
            <Legend />
            <Tooltip content={(props) => <WellbeingTooltip {...(props as TooltipContentProps<number, string>)} />} />
            <ReferenceLine
              y={SWEMWBS_UK_MEAN}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{
                value: `UK mean (${SWEMWBS_UK_MEAN})`,
                position: "right",
                fontSize: 10,
                fill: "#d97706",
              }}
            />
            <Line
              type="monotone"
              dataKey="swemwbs"
              name="SWEMWBS"
              stroke="#1e3a5f"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="ucla"
              name="UCLA (loneliness)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Companion accessible table — visually hidden, screen reader only */}
      <table className="sr-only" aria-label="Wellbeing scores by date">
        <caption>
          Wellbeing trajectory: SWEMWBS (mental wellbeing, higher is better, scale 7–35) and UCLA
          (loneliness, lower is better, scale 3–12) scores per check-in.
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">SWEMWBS score (out of 35)</th>
            <th scope="col">SWEMWBS band</th>
            <th scope="col">UCLA score (out of 12)</th>
            <th scope="col">UCLA band</th>
          </tr>
        </thead>
        <tbody>
          {trajectory.map((p) => {
            const sw = swemwbsBand(p.wemwbsScore);
            const uc = uclaBand(p.uclaScore);
            return (
              <tr key={p.completedAt}>
                <td>
                  {new Date(p.completedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>{p.wemwbsScore}</td>
                <td>{sw.label}</td>
                <td>{p.uclaScore}</td>
                <td>{uc.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

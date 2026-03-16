import { useEffect } from "react";
import { Link } from "react-router";
import { Card } from "../components/ui/Card.js";
import { useAuth } from "../hooks/useAuth.js";
import { useWellbeingDue } from "../hooks/useWellbeing.js";
import { useImpactSummary } from "../hooks/useImpact.js";
import { useMyCircles } from "../hooks/useCircles.js";
import { swemwbsBand } from "../lib/wellbeing-norms.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 animate-pulse">
      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-neutral-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-neutral-100 rounded w-2/3" />
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  to,
  label,
  value,
  sub,
}: {
  to: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="block no-underline rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6 hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all duration-150"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">{label}</p>
      <p className="text-3xl font-bold text-primary-900 leading-tight">{value}</p>
      {sub && <p className="text-sm text-neutral-500 mt-1">{sub}</p>}
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Dashboard() {
  const { contributor } = useAuth();
  const wellbeingDue = useWellbeingDue();
  const impactQuery = useImpactSummary();
  const circlesQuery = useMyCircles();

  const isLoading = wellbeingDue.isLoading || impactQuery.isLoading || circlesQuery.isLoading;

  useEffect(() => {
    document.title = "Dashboard — Indomitable Unity";
  }, []);

  // Derived values
  const summary = impactQuery.data;
  const circles = circlesQuery.data ?? [];
  const activeCircles = circles.filter((c) => c.status === "active").length;
  const openMatches = summary
    ? summary.challengesParticipated.filter((c) => c.status === "open").length
    : 0;

  // Latest SWEMWBS band from trajectory
  const trajectory = summary?.wellbeingTrajectory ?? [];
  const latestPoint = trajectory.length > 0 ? trajectory[trajectory.length - 1] : null;
  const latestBand = latestPoint ? swemwbsBand(latestPoint.wemwbsScore) : null;

  const wellbeingIsDue = wellbeingDue.data?.due === true;

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">
        Welcome, {contributor?.name}
      </h1>

      {/* Wellbeing check-in nudge banner */}
      {wellbeingIsDue && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary-900">
              Your wellbeing check-in is due
            </p>
            <p className="text-sm text-primary-700 mt-0.5">
              It takes about 3 minutes and helps us track the positive impact of your contributions.
            </p>
          </div>
          <Link
            to="/wellbeing/checkin"
            className="shrink-0 inline-flex items-center justify-center min-h-[2.5rem] px-5 py-2 rounded-[var(--radius-md)] bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Complete now
          </Link>
        </div>
      )}

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Active Circles */}
          <SummaryCard
            to="/circles"
            label="Active Circles"
            value={activeCircles}
          />

          {/* Open Matches */}
          <SummaryCard
            to="/challenges"
            label="Open Matches"
            value={openMatches}
          />

          {/* Earnings */}
          <SummaryCard
            to="/impact"
            label="Total Earnings"
            value={summary ? formatGBP(summary.totalEarningsPence) : "—"}
          />

          {/* Hours Contributed */}
          <SummaryCard
            to="/impact"
            label="Hours Contributed"
            value={summary ? summary.totalHours : "—"}
            sub={
              summary
                ? `${summary.paidHours} paid | ${summary.unpaidHours} volunteered`
                : undefined
            }
          />

          {/* Wellbeing Status */}
          <Link
            to={wellbeingIsDue ? "/wellbeing/checkin" : "/impact"}
            className="block no-underline rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6 hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all duration-150"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
              Wellbeing Status
            </p>
            {wellbeingIsDue ? (
              <p className="text-base font-semibold text-primary-800">Check-in due</p>
            ) : (
              <p className="text-base font-semibold text-green-700">
                <span className="mr-1">&#10003;</span> Up to date
              </p>
            )}
            {latestBand && (
              <p className={`text-sm mt-1 font-medium ${latestBand.color}`}>
                {latestBand.label} wellbeing
              </p>
            )}
          </Link>
        </div>
      )}

      {/* Browse Challenges fallback CTA */}
      <Card>
        <Link
          to="/challenges"
          className="text-base font-medium text-primary-800 hover:text-primary-700 underline"
        >
          Browse Challenges
        </Link>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Input } from "../../components/ui/Input.js";
import { useImpactSummary, useLogHours } from "../../hooks/useImpact.js";
import type { ImpactChallenge, ImpactEarning, WellbeingTrajectoryPoint } from "@indomitable-unity/shared";
import { swemwbsBand, uclaBand, trendDirection } from "../../lib/wellbeing-norms.js";
import { WellbeingChart } from "../../components/wellbeing/WellbeingChart.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Status badge styles ───────────────────────────────────────────────────────

function ChallengeStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-green-50 text-green-700 border border-green-200",
    closed: "bg-neutral-100 text-neutral-600 border border-neutral-200",
    archived: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  const cls = styles[status] ?? "bg-neutral-100 text-neutral-600 border border-neutral-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function PaymentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    retainer: "bg-blue-50 text-blue-700 border border-blue-200",
    stipend: "bg-green-50 text-green-700 border border-green-200",
    sme_subscription: "bg-purple-50 text-purple-700 border border-purple-200",
  };
  const cls = styles[type] ?? "bg-neutral-100 text-neutral-600 border border-neutral-200";
  const label = type === "sme_subscription" ? "SME subscription" : type;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 sm:p-8 animate-pulse">
      <div className="h-5 bg-neutral-200 rounded w-1/3 mb-4" />
      <div className="h-4 bg-neutral-100 rounded w-full mb-2" />
      <div className="h-4 bg-neutral-100 rounded w-4/5" />
    </div>
  );
}

// ─── Log Hours Form ────────────────────────────────────────────────────────────

interface LogHoursFormProps {
  challenges: ImpactChallenge[];
  onClose: () => void;
}

function LogHoursForm({ challenges, onClose }: LogHoursFormProps) {
  const circlesAvailable = challenges.filter((c) => !!c.circleId);
  const logHours = useLogHours();

  const [circleId, setCircleId] = useState(circlesAvailable[0]?.circleId ?? "");
  const [hours, setHours] = useState(1);
  const [description, setDescription] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!circleId) return;
    await logHours.mutateAsync({ circleId, hoursLogged: hours, description: description || undefined, isPaid });
    setSuccess(true);
    setTimeout(onClose, 1200);
  }

  if (success) {
    return (
      <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-green-50 border border-green-200 text-sm text-green-700">
        Hours logged successfully.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
      {circlesAvailable.length === 0 ? (
        <p className="text-sm text-neutral-500">Join a circle first to log hours.</p>
      ) : (
        <>
          <div>
            <label htmlFor="log-hours-circle" className="block text-sm font-medium text-neutral-700 mb-1">Circle</label>
            <select
              id="log-hours-circle"
              value={circleId}
              onChange={(e) => setCircleId(e.target.value)}
              required
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {circlesAvailable.map((c) => (
                <option key={c.circleId} value={c.circleId!}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Input
              label="Hours"
              type="number"
              value={String(hours)}
              onChange={(e) => setHours(Number(e.target.value))}
              min={1}
              max={24}
              required
            />
          </div>
          <div>
            <label htmlFor="log-hours-description" className="block text-sm font-medium text-neutral-700 mb-1">Description (optional)</label>
            <textarea
              id="log-hours-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPaid"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPaid" className="text-sm text-neutral-700">Paid work</label>
          </div>
          {logHours.isError && (
            <Alert variant="error">Failed to log hours. Please try again.</Alert>
          )}
          <div className="flex gap-3">
            <Button type="submit" variant="primary" loading={logHours.isPending}>
              Log Hours
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

// ─── Section: Challenges ───────────────────────────────────────────────────────

function ChallengesSection({ challenges }: { challenges: ImpactChallenge[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Challenges</h2>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs font-bold">
          {challenges.length}
        </span>
      </div>
      {challenges.length === 0 ? (
        <p className="text-sm text-neutral-500">You haven't participated in any challenges yet.</p>
      ) : (
        <ul className="space-y-3">
          {challenges.map((c) => (
            <li key={c.id} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{c.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.domain.map((d) => (
                    <span key={d} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <ChallengeStatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Section: Hours ────────────────────────────────────────────────────────────

function HoursSection({
  totalHours,
  paidHours,
  unpaidHours,
  challenges,
}: {
  totalHours: number;
  paidHours: number;
  unpaidHours: number;
  challenges: ImpactChallenge[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Hours Contributed</h2>
      {totalHours === 0 ? (
        <p className="text-sm text-neutral-500 mb-4">No hours logged yet.</p>
      ) : (
        <>
          <p className="text-4xl font-bold text-primary-900 mb-1">{totalHours}</p>
          <p className="text-sm text-neutral-500 mb-4">
            {paidHours} paid &nbsp;|&nbsp; {unpaidHours} volunteered
          </p>
        </>
      )}
      {!showForm && (
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Log Hours
        </Button>
      )}
      {showForm && (
        <LogHoursForm challenges={challenges} onClose={() => setShowForm(false)} />
      )}
    </Card>
  );
}

// ─── Section: Earnings ─────────────────────────────────────────────────────────

function EarningsSection({
  totalEarningsPence,
  earnings,
}: {
  totalEarningsPence: number;
  earnings: ImpactEarning[];
}) {
  const recent = earnings.slice(0, 10);
  return (
    <Card>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Earnings</h2>
      {earnings.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No earnings yet. Earnings will appear here when you complete paid challenges.
        </p>
      ) : (
        <>
          <p className="text-4xl font-bold text-primary-900 mb-1">{formatGBP(totalEarningsPence)}</p>
          <ul className="mt-4 space-y-2">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PaymentTypeBadge type={e.paymentType} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-900">{formatGBP(e.amountPence)}</span>
                  <span className="text-xs text-neutral-400">{formatDate(e.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

// ─── Section: Unpaid recognition ──────────────────────────────────────────────

function UnpaidRecognitionSection({ unpaidHours }: { unpaidHours: number }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-neutral-900 mb-4">Unpaid Contribution Recognised</h2>
      {unpaidHours === 0 ? (
        <p className="text-sm text-neutral-500">Your volunteer contributions will be recognised here.</p>
      ) : (
        <>
          <p className="text-4xl font-bold text-primary-900 mb-2">{unpaidHours} hrs</p>
          <p className="text-sm text-neutral-600">
            {unpaidHours} {unpaidHours === 1 ? "hour" : "hours"} of mentoring, volunteering, and community
            contribution formally recognised.
          </p>
        </>
      )}
    </Card>
  );
}

// ─── Section: Wellbeing Trajectory ────────────────────────────────────────────

function WellbeingSection({ trajectory }: { trajectory: WellbeingTrajectoryPoint[] }) {
  const hasData = trajectory.length > 0;
  const latest = hasData ? trajectory[trajectory.length - 1] : null;

  // Trend arrows (only when 2+ data points available)
  // SWEMWBS: up = good (green), down = concerning (red)
  // UCLA: down = good (less lonely = green), up = concerning (red) — inverted per Phase 7 decision
  const swemwbsTrendEl = (() => {
    if (!hasData || trajectory.length < 2 || !latest) return null;
    const prev = trajectory[trajectory.length - 2];
    const dir = trendDirection([prev.wemwbsScore, latest.wemwbsScore]);
    if (dir === "up") return <span className="text-green-600 font-bold" title="Improving">&#8593;</span>;
    if (dir === "down") return <span className="text-red-600 font-bold" title="Declining">&#8595;</span>;
    return <span className="text-neutral-400" title="Stable">&#8212;</span>;
  })();

  const uclaTrendEl = (() => {
    if (!hasData || trajectory.length < 2 || !latest) return null;
    const prev = trajectory[trajectory.length - 2];
    const dir = trendDirection([prev.uclaScore, latest.uclaScore]);
    if (dir === "down") return <span className="text-green-600 font-bold" title="Less lonely">&#8595;</span>;
    if (dir === "up") return <span className="text-red-600 font-bold" title="More lonely">&#8593;</span>;
    return <span className="text-neutral-400" title="Stable">&#8212;</span>;
  })();

  const swBand = latest ? swemwbsBand(latest.wemwbsScore) : null;
  const ucBand = latest ? uclaBand(latest.uclaScore) : null;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-neutral-700 mb-4">Wellbeing Trajectory</h2>

      {/* Latest score summary — shown only when data exists */}
      {hasData && latest && swBand && ucBand && (
        <div className="flex flex-wrap gap-6 text-sm mb-4">
          <span className="text-neutral-700">
            SWEMWBS:{" "}
            <span className="font-medium">{latest.wemwbsScore}/35</span>{" "}
            <span className={`text-xs font-semibold ${swBand.color}`}>{swBand.label}</span>
            {swemwbsTrendEl && <>{" "}{swemwbsTrendEl}</>}
          </span>
          <span className="text-neutral-700">
            UCLA:{" "}
            <span className="font-medium">{latest.uclaScore}/12</span>{" "}
            <span className={`text-xs font-semibold ${ucBand.color}`}>{ucBand.label}</span>
            {uclaTrendEl && <>{" "}{uclaTrendEl}</>}
          </span>
        </div>
      )}

      {/* Chart (handles empty state internally) */}
      <WellbeingChart trajectory={trajectory} />

      <p className="text-xs text-neutral-400 mt-3">
        SWEMWBS: 7–35 (Low &lt; 19, Average 19–26, High &gt; 26). Higher = better wellbeing.
        UCLA: 3–12 (Low &lt; 5, Average 5–7, High &gt; 7). Lower = less loneliness.
      </p>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ImpactDashboard() {
  const { data: summary, isLoading, isError } = useImpactSummary();

  useEffect(() => {
    document.title = "My Impact — Indomitable Unity";
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">My Impact</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Your full contribution picture — challenges, hours, earnings, and recognition.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <Alert variant="error">Failed to load impact data. Please refresh the page.</Alert>
      )}

      {!isLoading && !isError && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChallengesSection challenges={summary.challengesParticipated} />
          <HoursSection
            totalHours={summary.totalHours}
            paidHours={summary.paidHours}
            unpaidHours={summary.unpaidHours}
            challenges={summary.challengesParticipated}
          />
          <EarningsSection
            totalEarningsPence={summary.totalEarningsPence}
            earnings={summary.earnings}
          />
          <UnpaidRecognitionSection unpaidHours={summary.unpaidHours} />
          <div className="lg:col-span-2">
            <WellbeingSection trajectory={summary.wellbeingTrajectory} />
          </div>
        </div>
      )}
    </div>
  );
}

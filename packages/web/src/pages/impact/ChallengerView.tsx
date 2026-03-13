import { useEffect } from "react";
import { Card } from "../../components/ui/Card.js";
import { Alert } from "../../components/ui/Alert.js";
import { useChallengerImpact } from "../../hooks/useImpact.js";
import type { ChallengerChallenge } from "@agenoconcern/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12" aria-label="Loading challenge outcomes">
      <svg
        className="animate-spin h-8 w-8 text-primary-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

// ─── Challenge outcome card ────────────────────────────────────────────────────

function ChallengeOutcomeCard({ challenge }: { challenge: ChallengerChallenge }) {
  const statusStyles: Record<string, string> = {
    open: "bg-green-50 text-green-700 border border-green-200",
    closed: "bg-neutral-100 text-neutral-600 border border-neutral-200",
    archived: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  const statusCls = statusStyles[challenge.status] ?? "bg-neutral-100 text-neutral-600 border border-neutral-200";

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-neutral-900">{challenge.title}</h2>
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0 ${statusCls}`}>
          {challenge.status}
        </span>
      </div>

      {/* Resolution */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Resolution</p>
        {challenge.resolution ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">
              {truncate(challenge.resolution.problemSummary, 200)}
            </p>
            {challenge.resolution.recommendations && (
              <p className="text-sm text-neutral-600 italic">
                {truncate(challenge.resolution.recommendations, 150)}
              </p>
            )}
            <p className="text-xs text-neutral-400">
              Submitted {formatDate(challenge.resolution.submittedAt)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Awaiting resolution</p>
        )}
      </div>

      {/* Rating */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Rating</p>
        {challenge.rating ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-900">{challenge.rating.rating}/5</p>
            {challenge.rating.feedback && (
              <p className="text-sm text-neutral-600">{challenge.rating.feedback}</p>
            )}
            <p className="text-xs text-neutral-400">
              Rated {formatDate(challenge.rating.createdAt)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Not yet rated</p>
        )}
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ChallengerView() {
  const { data: impact, isLoading, isError } = useChallengerImpact();

  useEffect(() => {
    document.title = "Challenge Outcomes — Age No Concern";
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Challenge Outcomes</h1>
        <p className="text-sm text-neutral-500 mt-1">
          View the resolutions and feedback for your challenges.
        </p>
      </div>

      {isLoading && <Spinner />}

      {isError && (
        <Alert variant="error">Failed to load challenge outcomes. Please refresh the page.</Alert>
      )}

      {!isLoading && !isError && impact?.challenges.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            You haven't created any challenges yet.
          </p>
          <p className="text-sm text-neutral-500">
            Challenge outcomes will appear here once you post a challenge.
          </p>
        </div>
      )}

      {!isLoading && !isError && impact && impact.challenges.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {impact.challenges.map((c) => (
            <ChallengeOutcomeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button.js";
import { useChallengerOrg, useMyChallengerChallenges } from "../../hooks/useChallenger.js";
import { ROUTES } from "../../lib/constants.js";
import type { ChallengerPortalChallenge } from "@indomitable-unity/shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "bg-amber-100 text-amber-800";
    case "open":
      return "bg-emerald-100 text-emerald-800";
    case "closed":
      return "bg-sky-100 text-sky-800";
    case "archived":
      return "bg-neutral-100 text-neutral-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-5 animate-pulse">
      <div className="h-5 bg-neutral-200 rounded w-2/3 mb-3" />
      <div className="h-3 bg-neutral-100 rounded w-1/4 mb-2" />
      <div className="h-3 bg-neutral-100 rounded w-1/3" />
    </div>
  );
}

// ─── Challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: ChallengerPortalChallenge }) {
  return (
    <Link
      to={`/challenger/challenges/${challenge.id}`}
      className="block no-underline bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-5 hover:border-primary-300 hover:shadow-sm transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold text-neutral-900 leading-snug">
          {challenge.title}
        </h3>
        <span
          className={`shrink-0 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadgeClass(challenge.status)}`}
        >
          {challenge.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {challenge.domain.slice(0, 3).map((d) => (
          <span
            key={d}
            className="inline-block px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-xs"
          >
            {d}
          </span>
        ))}
        <span className="inline-block px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-medium capitalize">
          {challenge.type.replace(/_/g, " ")}
        </span>
      </div>

      {challenge.circle && (
        <p className="text-sm text-neutral-500 mb-1">
          Circle:{" "}
          <span className="font-medium capitalize">
            {challenge.circle.status.replace(/_/g, " ")}
          </span>{" "}
          &mdash; {challenge.circle.memberCount} member
          {challenge.circle.memberCount !== 1 ? "s" : ""}
        </p>
      )}

      <p className="text-xs text-neutral-400">
        Submitted {formatDate(challenge.createdAt)}
      </p>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChallengerDashboard() {
  const navigate = useNavigate();
  const orgQuery = useChallengerOrg();
  const challengesQuery = useMyChallengerChallenges();

  useEffect(() => {
    document.title = "Your Challenges — Indomitable Unity";
  }, []);

  const challenges = challengesQuery.data ?? [];
  const isLoading = orgQuery.isLoading || challengesQuery.isLoading;
  const hasError = orgQuery.isError || challengesQuery.isError;

  return (
    <div className="py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Your Challenges
          </h1>
          {orgQuery.data && (
            <p className="text-sm text-neutral-500 mt-0.5">
              {orgQuery.data.name}
            </p>
          )}
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(ROUTES.CHALLENGER_SUBMIT)}
        >
          Submit a Challenge
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : hasError && challenges.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="text-base mb-2">
            Could not load challenger data.
          </p>
          <p className="text-sm">
            If you switched roles via the dev tool, register at{" "}
            <Link to={ROUTES.CHALLENGER_REGISTER} className="text-primary-800 underline">
              /challenger/register
            </Link>{" "}
            to create an organisation first.
          </p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="text-base mb-2">No challenges submitted yet.</p>
          <p className="text-sm">
            Submit your first challenge to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </div>
  );
}

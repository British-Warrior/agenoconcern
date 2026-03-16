import { Link } from "react-router";
import { useMyCircles } from "../../hooks/useCircles.js";
import { useAuth } from "../../hooks/useAuth.js";
import type { CircleStatus } from "@indomitable-unity/shared";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_STYLES: Record<CircleStatus, string> = {
  forming: "bg-blue-50 text-blue-700 border border-blue-200",
  active: "bg-green-100 text-green-700 border border-green-200",
  submitted: "bg-violet-50 text-violet-700 border border-violet-200",
  completed: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  dissolved: "bg-amber-50 text-amber-700 border border-amber-200",
};

function Spinner() {
  return (
    <div className="flex justify-center py-12" aria-label="Loading circles">
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

export function MyCircles() {
  const { data: circles, isLoading, isError } = useMyCircles();
  const { contributor } = useAuth();
  const isCM = contributor?.role === "community_manager" || contributor?.role === "admin";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">My Circles</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {isCM
            ? "Circles you've formed for challenges."
            : "Your active and past collaboration Circles."}
        </p>
      </div>

      {isLoading && <Spinner />}

      {isError && (
        <div className="rounded-[var(--radius-lg)] bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">Failed to load circles. Please try again.</p>
        </div>
      )}

      {!isLoading && !isError && circles?.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
          {isCM ? (
            <>
              <p className="text-sm font-medium text-neutral-700 mb-1">
                No Circles formed yet.
              </p>
              <p className="text-sm text-neutral-500">
                Post a challenge and form a Circle from interested contributors.
              </p>
              <Link
                to="/challenges/manage"
                className="inline-flex items-center mt-4 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium bg-primary-800 text-white hover:bg-primary-700 transition-colors duration-150 no-underline"
              >
                Manage Challenges
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-neutral-700 mb-1">
                You're not in any Circles yet.
              </p>
              <p className="text-sm text-neutral-500">
                Express interest in challenges to get started.
              </p>
              <Link
                to="/challenges"
                className="inline-flex items-center mt-4 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium bg-primary-800 text-white hover:bg-primary-700 transition-colors duration-150 no-underline"
              >
                Browse challenges
              </Link>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && circles && circles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map((circle) => (
            <Link
              key={circle.id}
              to={`/circles/${circle.id}`}
              className="group block rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-5 hover:border-primary-300 hover:shadow-sm transition-all duration-150 no-underline"
            >
              {/* Challenge title */}
              <p className="text-sm font-semibold text-neutral-900 group-hover:text-primary-800 line-clamp-2 mb-3">
                {circle.challengeTitle}
              </p>

              {/* Meta row */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[circle.status]}`}
                >
                  {circle.status}
                </span>
                <span className="text-xs text-neutral-500">
                  {circle.memberCount} member{circle.memberCount !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Created date */}
              <p className="text-[11px] text-neutral-400 mt-3">
                Created {formatDate(circle.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

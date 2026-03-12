import { useEffect, useRef, useCallback, useState } from "react";
import { useChallengeFeed } from "../../hooks/useChallenges.js";
import { useAuth } from "../../hooks/useAuth.js";
import { ChallengeAccordion } from "../../components/challenges/ChallengeAccordion.js";
import { FilterBar } from "../../components/challenges/FilterBar.js";
import { ChallengeManage } from "./ChallengeManage.js";
import type { FilterState } from "../../components/challenges/FilterBar.js";
import type { ChallengeType } from "@agenoconcern/shared";

function Spinner() {
  return (
    <div className="flex justify-center py-8" aria-label="Loading challenges">
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

type Tab = "browse" | "manage";

function BrowseTab() {
  const [filters, setFilters] = useState<FilterState>({
    domain: "",
    type: "",
    timeline: "any",
  });

  // Map UI filters to API filters (timeline is client-side — API only has domain/type)
  const apiFilters = {
    domain: filters.domain || undefined,
    type: (filters.type || undefined) as ChallengeType | undefined,
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
    error,
  } = useChallengeFeed(apiFilters);

  // Flatten all pages
  const challenges = data?.pages.flatMap((p) => p.challenges) ?? [];

  // Apply client-side timeline filter
  const now = new Date();
  const filteredChallenges = challenges.filter((c) => {
    if (filters.timeline === "any" || !c.deadline) return true;
    const deadline = new Date(c.deadline);
    if (filters.timeline === "this-week") {
      const weekFromNow = new Date(now);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return deadline <= weekFromNow;
    }
    if (filters.timeline === "this-month") {
      const monthFromNow = new Date(now);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      return deadline <= monthFromNow;
    }
    return true;
  });

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const hasActiveFilters =
    filters.domain !== "" ||
    filters.type !== "" ||
    filters.timeline !== "any";

  const clearFilters = () =>
    setFilters({ domain: "", type: "", timeline: "any" });

  return (
    <>
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Loading initial */}
      {isLoading && <Spinner />}

      {/* Error */}
      {isError && (
        <div className="text-sm text-error bg-error-bg px-4 py-3 rounded-[var(--radius-md)]">
          {error instanceof Error ? error.message : "Failed to load challenges."}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && !isError && filteredChallenges.length === 0 && (
        <div className="text-center py-16">
          {hasActiveFilters ? (
            <div className="space-y-3">
              <p className="text-base text-neutral-600">
                No challenges match your filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-accent-600 hover:text-accent-500 transition-colors duration-150"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <p className="text-base text-neutral-500">
              No challenges posted yet. Check back soon.
            </p>
          )}
        </div>
      )}

      {/* Challenge list */}
      {filteredChallenges.length > 0 && (
        <ChallengeAccordion challenges={filteredChallenges} />
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Loading next page */}
      {isFetchingNextPage && <Spinner />}

      {/* End of results */}
      {!hasNextPage && challenges.length > 0 && !isLoading && (
        <p className="text-center text-sm text-neutral-400 py-6">
          You've seen all challenges.
        </p>
      )}
    </>
  );
}

export function ChallengeFeed() {
  const { contributor } = useAuth();
  const isCM =
    contributor?.role === "community_manager" || contributor?.role === "admin";

  const [activeTab, setActiveTab] = useState<Tab>("browse");

  useEffect(() => {
    document.title = "Challenges — Age No Concern";
  }, []);

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Challenges</h1>
        {/* CM floating action in Browse tab */}
        {isCM && activeTab === "browse" && (
          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 transition-colors duration-150"
          >
            Post a Challenge
          </button>
        )}
      </div>

      {/* Tab bar — CM only */}
      {isCM && (
        <div className="flex border-b border-neutral-200 mb-6">
          {(["browse", "manage"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors duration-150 border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {tab === "browse" ? "Browse" : "Manage"}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "browse" ? <BrowseTab /> : <ChallengeManage />}
    </div>
  );
}

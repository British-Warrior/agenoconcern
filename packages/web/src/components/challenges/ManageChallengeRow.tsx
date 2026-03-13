import { useState } from "react";
import type { Challenge } from "@agenoconcern/shared";
import { useChallengeInterests, useTeamSuggestions, useUpdateChallenge } from "../../hooks/useChallenges.js";
import { TeamCompositionCard } from "./TeamCompositionCard.js";

interface ManageChallengeRowProps {
  challenge: Challenge & { myInterest?: "active" | "withdrawn" | null };
  onEdit: (challenge: Challenge) => void;
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-700 border border-green-200",
  closed: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  archived: "bg-amber-50 text-amber-700 border border-amber-200",
  draft: "bg-blue-50 text-blue-700 border border-blue-200",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ManageChallengeRow({ challenge, onEdit }: ManageChallengeRowProps) {
  const [showInterests, setShowInterests] = useState(false);
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false);

  const isEditable = challenge.status === "open" && challenge.interestCount === 0;
  const canViewInterests = challenge.status === "open" && challenge.interestCount > 0;
  const isReadOnly = challenge.status === "closed" || challenge.status === "archived";

  const { data: interestsData, isLoading: interestsLoading } =
    useChallengeInterests(showInterests ? challenge.id : null);

  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useTeamSuggestions(showTeamSuggestions ? challenge.id : null);

  const closeMutation = useUpdateChallenge(challenge.id);

  const handleClose = () => {
    closeMutation.mutate({ status: "closed" });
  };

  return (
    <div className="border border-neutral-200 rounded-[var(--radius-lg)] bg-white overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {challenge.title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Created {formatDate(challenge.createdAt)}
            {challenge.deadline && (
              <span className="ml-2">
                &middot; Deadline {formatDate(challenge.deadline)}
              </span>
            )}
          </p>
        </div>

        {/* Status badge */}
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_STYLES[challenge.status] ?? STATUS_STYLES.draft}`}
        >
          {challenge.status}
        </span>

        {/* Interest count */}
        <span className="text-xs text-neutral-600 whitespace-nowrap">
          {challenge.interestCount} interested
        </span>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditable && (
              <button
                type="button"
                onClick={() => onEdit(challenge)}
                className="px-3 py-1 rounded-[var(--radius-md)] text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
              >
                Edit
              </button>
            )}
            {canViewInterests && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowInterests((v) => !v);
                    setShowTeamSuggestions(false);
                  }}
                  className="px-3 py-1 rounded-[var(--radius-md)] text-xs font-medium border border-primary-300 text-primary-700 hover:bg-primary-50 transition-colors duration-150"
                >
                  {showInterests ? "Hide Interests" : "View Interests"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTeamSuggestions((v) => !v);
                    setShowInterests(false);
                  }}
                  className="px-3 py-1 rounded-[var(--radius-md)] text-xs font-medium border border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors duration-150"
                >
                  {showTeamSuggestions ? "Hide Teams" : "View Team Suggestions"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={closeMutation.isPending}
              className="px-3 py-1 rounded-[var(--radius-md)] text-xs font-medium border border-error/40 text-error hover:bg-error-bg disabled:opacity-50 transition-colors duration-150"
            >
              {closeMutation.isPending ? "Closing..." : "Close"}
            </button>
          </div>
        )}
      </div>

      {/* Expanded: Interested contributors */}
      {showInterests && (
        <div className="border-t border-neutral-100 px-4 py-3 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-700 mb-2">
            Interested contributors
          </p>
          {interestsLoading && (
            <p className="text-xs text-neutral-400">Loading...</p>
          )}
          {interestsData && interestsData.interests.length === 0 && (
            <p className="text-xs text-neutral-400">No interests yet.</p>
          )}
          {interestsData && interestsData.interests.length > 0 && (
            <ul className="space-y-1">
              {interestsData.interests.map((interest) => (
                <li
                  key={interest.id}
                  className="flex items-start gap-2"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-primary-700">
                      {interest.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-800">
                      {interest.name ?? "Unknown contributor"}
                    </span>
                    {interest.note && (
                      <p className="text-[11px] text-neutral-500 mt-0.5 italic">
                        "{interest.note}"
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Expanded: Team suggestions */}
      {showTeamSuggestions && (
        <div className="border-t border-neutral-100 px-4 py-3 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-700 mb-3">
            Team suggestions
          </p>
          {suggestionsLoading && (
            <p className="text-xs text-neutral-400">Generating suggestions...</p>
          )}
          {suggestionsData && suggestionsData.compositions.length === 0 && (
            <p className="text-xs text-neutral-400">
              Not enough interested contributors to generate team suggestions.
            </p>
          )}
          {suggestionsData && suggestionsData.compositions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestionsData.compositions.map((composition, i) => (
                <TeamCompositionCard key={i} composition={composition} index={i} challengeId={challenge.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

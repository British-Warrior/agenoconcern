import { useState } from "react";
import type {
  CircleResolution,
  CircleStatus,
  ResolutionRating,
} from "@indomitable-unity/shared";
import { useRateResolution } from "../../hooks/useCircles.js";
import { ResolutionForm } from "./ResolutionForm.js";

interface ResolutionCardProps {
  circleId: string;
  resolution: CircleResolution | null;
  rating: ResolutionRating | null;
  isChallenger: boolean;
  isMember: boolean;
  circleStatus: CircleStatus;
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </p>
    </div>
  );
}

export function ResolutionCard({
  circleId,
  resolution,
  rating,
  isChallenger,
  isMember,
  circleStatus,
}: ResolutionCardProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const rateMutation = useRateResolution(circleId);

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRating) {
      setRatingError("Please select a rating before submitting.");
      return;
    }
    setRatingError(null);
    try {
      await rateMutation.mutateAsync({
        rating: selectedRating,
        feedback: feedback.trim() || undefined,
      });
      setRatingSuccess(true);
    } catch {
      setRatingError("Failed to submit rating. Please try again.");
    }
  }

  if (!resolution) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-neutral-50 px-4 py-5 space-y-4">
        <p className="text-sm text-neutral-500">No resolution submitted yet.</p>
        {isMember && (circleStatus === "active" || circleStatus === "submitted") && (
          <ResolutionForm
            circleId={circleId}
            existingResolution={null}
            circleStatus={circleStatus}
          />
        )}
      </div>
    );
  }

  const canRate =
    isChallenger &&
    !rating &&
    !ratingSuccess &&
    circleStatus === "submitted";

  const memberAwaitingRating =
    isMember &&
    !isChallenger &&
    circleStatus === "submitted" &&
    !rating;

  return (
    <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white px-4 py-4 space-y-4">
      {/* Resolution content */}
      {showEditForm ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Edit Resolution
            </p>
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <ResolutionForm
            circleId={circleId}
            existingResolution={resolution}
            circleStatus={circleStatus}
            onSuccess={() => setShowEditForm(false)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Section label="Problem Summary" content={resolution.problemSummary} />
          <Section label="Recommendations" content={resolution.recommendations} />
          <Section label="Evidence" content={resolution.evidence} />
          {resolution.dissentingViews && (
            <Section label="Dissenting Views" content={resolution.dissentingViews} />
          )}
          {resolution.implementationNotes && (
            <Section
              label="Implementation Notes"
              content={resolution.implementationNotes}
            />
          )}
          {/* Edit button for members when circle is active or submitted */}
          {isMember && !isChallenger && (circleStatus === "active" || circleStatus === "submitted") && (
            <button
              type="button"
              onClick={() => setShowEditForm(true)}
              disabled={showEditForm}
              className={`text-xs font-medium text-primary-700 border border-primary-300 rounded-[var(--radius-md)] px-2.5 py-1 transition-colors duration-150 cursor-pointer ${
                showEditForm
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary-50"
              }`}
            >
              Edit Resolution
            </button>
          )}
        </div>
      )}

      {/* Divider before rating section */}
      {(canRate || rating || memberAwaitingRating) && (
        <div className="border-t border-neutral-100 pt-4" />
      )}

      {/* Rating submitted */}
      {(rating || ratingSuccess) && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Challenger Rating
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-800">
              {rating?.rating ?? selectedRating}/5
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    n <= (rating?.rating ?? selectedRating ?? 0)
                      ? "bg-amber-400 text-white"
                      : "bg-neutral-100 text-neutral-400"
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          {rating?.feedback && (
            <p className="text-sm text-neutral-700 leading-relaxed">{rating.feedback}</p>
          )}
        </div>
      )}

      {/* Rating form for challenger */}
      {canRate && (
        <form onSubmit={(e) => void handleSubmitRating(e)} className="space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Rate this Resolution
          </p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSelectedRating(n)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-colors duration-150 ${
                  selectedRating === n
                    ? "bg-amber-400 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-amber-100 hover:text-amber-700"
                }`}
                aria-label={`Rate ${n} out of 5`}
                aria-pressed={selectedRating === n}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add optional feedback for the Circle..."
            rows={2}
            className="w-full text-sm border border-neutral-300 rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y"
          />
          {ratingError && (
            <p className="text-xs text-red-600">{ratingError}</p>
          )}
          <button
            type="submit"
            disabled={rateMutation.isPending}
            className="text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-[var(--radius-md)] px-4 py-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rateMutation.isPending ? "Submitting..." : "Submit Rating"}
          </button>
        </form>
      )}

      {/* Member waiting message */}
      {memberAwaitingRating && (
        <p className="text-xs text-neutral-500 italic">
          Awaiting challenger rating
        </p>
      )}
    </div>
  );
}

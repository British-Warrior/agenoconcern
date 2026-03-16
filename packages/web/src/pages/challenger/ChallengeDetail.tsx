import { useState, useEffect, type FormEvent } from "react";
import { useParams, Link } from "react-router";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import { useChallengeDetail } from "../../hooks/useChallenger.js";
import { useRateResolution } from "../../hooks/useCircles.js";
import { ROUTES } from "../../lib/constants.js";
import { ApiResponseError } from "../../api/client.js";

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
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ─── Star rating input ────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input
            type="radio"
            name="rating"
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            className="sr-only"
          />
          <span
            className={`text-2xl select-none ${
              n <= value ? "text-amber-400" : "text-neutral-300"
            } hover:text-amber-400 transition-colors`}
            aria-hidden="true"
          >
            &#9733;
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── Rating form ──────────────────────────────────────────────────────────────

function RatingForm({ circleId }: { circleId: string }) {
  const rateMutation = useRateResolution(circleId);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating before submitting.");
      return;
    }

    try {
      await rateMutation.mutateAsync({
        rating,
        feedback: feedback.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  if (submitted) {
    return (
      <Alert variant="success">
        Thank you — your rating has been submitted.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <p className="text-sm font-medium text-neutral-700 mb-2">
          How would you rate the resolution?
        </p>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label
          htmlFor="feedback"
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          Feedback (optional)
        </label>
        <textarea
          id="feedback"
          rows={3}
          placeholder="What worked well? What could be improved?"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={rateMutation.isPending}
      >
        Submit Rating
      </Button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: challenge, isLoading, error } = useChallengeDetail(id ?? "");

  useEffect(() => {
    document.title = challenge
      ? `${challenge.title} — Indomitable Unity`
      : "Challenge — Indomitable Unity";
  }, [challenge]);

  if (isLoading) {
    return (
      <div className="py-8 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-neutral-200 rounded w-2/3" />
          <div className="h-4 bg-neutral-100 rounded w-1/4" />
          <div className="h-24 bg-neutral-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="py-8 max-w-2xl mx-auto">
        <Link
          to={ROUTES.CHALLENGER}
          className="text-sm text-primary-800 hover:text-primary-700 underline mb-6 block"
        >
          &larr; Back to Dashboard
        </Link>
        <p className="text-neutral-500">Challenge not found.</p>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <Link
        to={ROUTES.CHALLENGER}
        className="text-sm text-primary-800 hover:text-primary-700 underline mb-6 block"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-neutral-900">
            {challenge.title}
          </h1>
          <span
            className={`shrink-0 inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusBadgeClass(challenge.status)}`}
          >
            {challenge.status}
          </span>
        </div>

        <p className="text-base text-neutral-700 mb-5 leading-relaxed">
          {challenge.brief}
        </p>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-neutral-400 font-medium uppercase text-xs tracking-wide mb-0.5">
              Type
            </dt>
            <dd className="text-neutral-700 capitalize">
              {challenge.type.replace(/_/g, " ")}
            </dd>
          </div>

          {challenge.domain.length > 0 && (
            <div>
              <dt className="text-neutral-400 font-medium uppercase text-xs tracking-wide mb-0.5">
                Domain
              </dt>
              <dd className="text-neutral-700">{challenge.domain.join(", ")}</dd>
            </div>
          )}

          {challenge.skillsNeeded.length > 0 && (
            <div className="col-span-2">
              <dt className="text-neutral-400 font-medium uppercase text-xs tracking-wide mb-0.5">
                Skills needed
              </dt>
              <dd className="text-neutral-700">
                {challenge.skillsNeeded.join(", ")}
              </dd>
            </div>
          )}

          {challenge.deadline && (
            <div>
              <dt className="text-neutral-400 font-medium uppercase text-xs tracking-wide mb-0.5">
                Deadline
              </dt>
              <dd className="text-neutral-700">{formatDate(challenge.deadline)}</dd>
            </div>
          )}

          <div>
            <dt className="text-neutral-400 font-medium uppercase text-xs tracking-wide mb-0.5">
              Submitted
            </dt>
            <dd className="text-neutral-700">{formatDate(challenge.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Circle progress */}
      {challenge.circle && (
        <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Circle Progress
          </h2>

          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusBadgeClass(challenge.circle.status)}`}
            >
              {challenge.circle.status.replace(/_/g, " ")}
            </span>
            <span className="text-sm text-neutral-600">
              {challenge.circle.memberCount} member
              {challenge.circle.memberCount !== 1 ? "s" : ""}
            </span>
          </div>

          {challenge.circle.members.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-2">
                Members
              </p>
              <ul className="flex flex-wrap gap-2">
                {challenge.circle.members.map((m) => (
                  <li
                    key={m.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-sm text-neutral-700"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-800 text-xs font-semibold inline-flex items-center justify-center">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Resolution */}
      {challenge.resolution && (
        <div className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Resolution
          </h2>

          <p className="text-sm text-neutral-500 mb-4">
            Submitted {formatDate(challenge.resolution.submittedAt)}
          </p>

          {challenge.resolution.rating ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-1">
                Your rating
              </p>
              <div className="flex items-center gap-2 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-2xl ${
                      i < challenge.resolution!.rating!.rating
                        ? "text-amber-400"
                        : "text-neutral-300"
                    }`}
                    aria-hidden="true"
                  >
                    &#9733;
                  </span>
                ))}
                <span className="text-sm text-neutral-600 ml-1">
                  {challenge.resolution.rating.rating}/5
                </span>
              </div>
              {challenge.resolution.rating.feedback && (
                <p className="text-sm text-neutral-700 italic">
                  &ldquo;{challenge.resolution.rating.feedback}&rdquo;
                </p>
              )}
            </div>
          ) : challenge.circle ? (
            <div>
              <p className="text-sm text-neutral-600 mb-4">
                How did the circle do? Share your rating to help us improve.
              </p>
              <RatingForm circleId={challenge.circle.id} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

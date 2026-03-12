import { useState } from "react";
import { useInterestToggle } from "../../hooks/useChallenges.js";
import { ApiResponseError } from "../../api/client.js";

interface MyInterest {
  status: "active" | "withdrawn";
  note: string | null;
}

interface InterestButtonProps {
  challengeId: string;
  myInterest: MyInterest | null;
  interestCount: number;
  maxCircles?: number;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
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
  );
}

export function InterestButton({
  challengeId,
  myInterest,
  interestCount,
  maxCircles,
}: InterestButtonProps) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownHours, setCooldownHours] = useState<number | null>(null);
  const [capacityWarning, setCapacityWarning] = useState(false);

  const mutation = useInterestToggle(challengeId);

  const handleExpress = async (skipNote?: boolean) => {
    setErrorMessage(null);
    try {
      const result = await mutation.mutateAsync(skipNote ? undefined : note || undefined);
      setShowNoteForm(false);
      setNote("");
      // Soft capacity warning: if activeInterestCount >= maxCircles
      if (
        result.activeInterestCount !== undefined &&
        result.maxCircles !== undefined &&
        result.activeInterestCount >= result.maxCircles
      ) {
        setCapacityWarning(true);
      } else {
        setCapacityWarning(false);
      }
    } catch (err) {
      if (err instanceof ApiResponseError && err.status === 429) {
        const hours = (err.data as { cooldownRemainingHours?: number }).cooldownRemainingHours;
        setCooldownHours(hours ?? 24);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    }
  };

  const handleWithdraw = async () => {
    setErrorMessage(null);
    setCooldownHours(null);
    setCapacityWarning(false);
    try {
      await mutation.mutateAsync(undefined);
    } catch (err) {
      if (err instanceof ApiResponseError && err.status === 429) {
        const hours = (err.data as { cooldownRemainingHours?: number }).cooldownRemainingHours;
        setCooldownHours(hours ?? 24);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    }
  };

  const isLoading = mutation.isPending;

  return (
    <div className="space-y-3">
      {/* Interest count */}
      <p className="text-sm text-neutral-500">
        {interestCount === 0
          ? "No one has expressed interest yet"
          : interestCount === 1
          ? "1 person interested"
          : `${interestCount} people interested`}
      </p>

      {/* Cooldown state */}
      {cooldownHours !== null && (
        <p className="text-sm text-warning-700 bg-warning-bg px-3 py-2 rounded-[var(--radius-sm)]">
          Re-express interest in {cooldownHours} hour{cooldownHours === 1 ? "" : "s"}
        </p>
      )}

      {/* Active interest — show note + withdraw */}
      {myInterest?.status === "active" && cooldownHours === null && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {/* Filled checkmark button */}
            <button
              type="button"
              disabled
              className="
                inline-flex items-center gap-2
                bg-primary-800 text-white
                min-h-[3rem] px-6 py-3 text-sm font-semibold
                rounded-[var(--radius-md)] opacity-90 cursor-default
              "
              aria-label="You are interested in this challenge"
            >
              {/* Checkmark icon */}
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Interested
            </button>

            <button
              type="button"
              onClick={() => void handleWithdraw()}
              disabled={isLoading}
              className="
                inline-flex items-center gap-2
                border border-neutral-300 text-neutral-700 bg-white
                hover:bg-neutral-50 hover:border-neutral-400
                min-h-[3rem] px-4 py-3 text-sm font-medium
                rounded-[var(--radius-md)] transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isLoading ? <Spinner /> : "Withdraw"}
            </button>
          </div>

          {myInterest.note && (
            <p className="text-sm text-neutral-600 italic">
              Your note: {myInterest.note}
            </p>
          )}
        </div>
      )}

      {/* Withdrawn state */}
      {myInterest?.status === "withdrawn" && cooldownHours === null && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-500">
            You previously withdrew interest.
          </p>
          <button
            type="button"
            onClick={() => setShowNoteForm(true)}
            disabled={isLoading}
            className="
              inline-flex items-center gap-2
              border-2 border-primary-800 text-primary-800 bg-transparent
              hover:bg-primary-800 hover:text-white
              min-h-[3rem] px-6 py-3 text-sm font-semibold
              rounded-[var(--radius-md)] transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isLoading ? <Spinner /> : "Express Interest Again"}
          </button>
        </div>
      )}

      {/* No interest — show button or note form */}
      {!myInterest && cooldownHours === null && (
        <>
          {!showNoteForm ? (
            <button
              type="button"
              onClick={() => setShowNoteForm(true)}
              disabled={isLoading}
              className="
                inline-flex items-center gap-2
                bg-primary-800 text-white
                hover:bg-primary-700 active:bg-primary-900
                min-h-[3rem] px-6 py-3 text-sm font-semibold
                rounded-[var(--radius-md)] transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isLoading ? <Spinner /> : "I'm Interested"}
            </button>
          ) : (
            <div className="space-y-3">
              <label
                htmlFor={`note-${challengeId}`}
                className="block text-sm font-medium text-neutral-700"
              >
                Add a note{" "}
                <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <textarea
                id={`note-${challengeId}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Why are you interested? Any relevant experience?"
                className="
                  w-full rounded-[var(--radius-md)] border border-neutral-300
                  px-3 py-2 text-sm text-neutral-900
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-accent-500
                  resize-y
                "
              />
              <p className="text-xs text-neutral-400 text-right">
                {note.length}/500
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleExpress(false)}
                  disabled={isLoading}
                  className="
                    inline-flex items-center gap-2
                    bg-primary-800 text-white
                    hover:bg-primary-700 active:bg-primary-900
                    min-h-[3rem] px-6 py-3 text-sm font-semibold
                    rounded-[var(--radius-md)] transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isLoading ? <Spinner /> : "Express Interest"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleExpress(true)}
                  disabled={isLoading}
                  className="
                    inline-flex items-center gap-2
                    border border-neutral-300 text-neutral-700 bg-white
                    hover:bg-neutral-50
                    min-h-[3rem] px-4 py-3 text-sm font-medium
                    rounded-[var(--radius-md)] transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Skip note
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNoteForm(false); setNote(""); }}
                  className="
                    text-sm text-neutral-500 hover:text-neutral-700
                    px-2 py-3 transition-colors duration-150
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {errorMessage && (
        <p className="text-sm text-error bg-error-bg px-3 py-2 rounded-[var(--radius-sm)]">
          {errorMessage}
        </p>
      )}

      {/* Soft capacity warning */}
      {capacityWarning && maxCircles !== undefined && (
        <p className="text-sm text-warning bg-warning-bg px-3 py-2 rounded-[var(--radius-sm)]">
          You're interested in {maxCircles}+ challenges — sure you have capacity?
        </p>
      )}
    </div>
  );
}

import { useState } from "react";
import { useAddMember } from "../../hooks/useCircles.js";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
}

export function AddMemberModal({ isOpen, onClose, circleId }: AddMemberModalProps) {
  const [contributorId, setContributorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useAddMember(circleId);

  function handleClose() {
    setContributorId("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = contributorId.trim();
    if (!id) {
      setError("Please enter a contributor ID.");
      return;
    }
    // Basic UUID format check
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      setError("Please enter a valid contributor UUID.");
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync(id);
      setSuccess(true);
      setTimeout(() => handleClose(), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add member.";
      if (message.includes("maximum")) {
        setError("Contributor has reached their maximum number of Circles.");
      } else if (message.includes("already")) {
        setError("This contributor is already a member of the Circle.");
      } else {
        setError("Failed to add member. Please check the ID and try again.");
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-modal-title"
    >
      <div className="bg-white rounded-[var(--radius-lg)] shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="add-member-modal-title"
            className="text-base font-semibold text-neutral-900"
          >
            Add Member to Circle
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <p className="text-sm text-green-600 font-medium">
              Member added successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label
                htmlFor="contributor-id-input"
                className="block text-xs font-semibold text-neutral-700 mb-1"
              >
                Contributor ID (UUID)
              </label>
              <input
                id="contributor-id-input"
                type="text"
                value={contributorId}
                onChange={(e) => {
                  setContributorId(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className={`w-full text-sm border rounded-[var(--radius-md)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  error ? "border-red-400 bg-red-50" : "border-neutral-300"
                }`}
              />
              {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-300 rounded-[var(--radius-md)] px-4 py-2 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-[var(--radius-md)] px-4 py-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

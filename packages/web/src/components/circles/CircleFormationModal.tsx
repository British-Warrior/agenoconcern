import { useNavigate } from "react-router";
import { Button } from "../ui/Button.js";
import { Modal } from "../ui/Modal.js";
import { useCreateCircle } from "../../hooks/useCircles.js";

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

interface CircleFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeId: string;
  memberIds: string[];
  memberNames: string[];
}

export function CircleFormationModal({
  isOpen,
  onClose,
  challengeId,
  memberIds,
  memberNames,
}: CircleFormationModalProps) {
  const navigate = useNavigate();
  const createCircle = useCreateCircle();

  const handleFormCircle = () => {
    createCircle.mutate(
      { challengeId, memberIds },
      {
        onSuccess: (newCircle) => {
          void navigate(`/circles/${newCircle.id}`);
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="circle-formation-title"
      className="border border-neutral-200"
    >
      <h2
        id="circle-formation-title"
        className="text-lg font-semibold text-neutral-900 mb-1"
      >
        Form a Circle
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        The following members will be added to a new Circle for this challenge.
      </p>

      {/* Member list */}
      <ul className="space-y-2 mb-6">
        {memberNames.map((name, i) => {
          const displayName = (!name || UUID_PATTERN.test(name)) ? "Unknown contributor" : name;
          return (
            <li key={memberIds[i]} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-700">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-neutral-800">{displayName}</span>
            </li>
          );
        })}
      </ul>

      {/* Error message */}
      {createCircle.isError && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">
            {createCircle.error instanceof Error && !UUID_PATTERN.test(createCircle.error.message)
              ? createCircle.error.message
              : "Failed to form circle. Please try again."}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={createCircle.isPending}
          className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors duration-150"
        >
          Cancel
        </button>
        <Button
          variant="primary"
          size="default"
          onClick={handleFormCircle}
          loading={createCircle.isPending}
          disabled={createCircle.isPending}
          className="px-4 py-2 text-sm min-h-0"
        >
          Form Circle
        </Button>
      </div>
    </Modal>
  );
}

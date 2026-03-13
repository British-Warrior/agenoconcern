import { useParams } from "react-router";
import { useCircleWorkspace } from "../../hooks/useCircles.js";
import { CircleWorkspaceShell } from "../../components/circles/CircleWorkspaceShell.js";
import { useAuth } from "../../hooks/useAuth.js";

function Spinner() {
  return (
    <div className="flex justify-center py-16" aria-label="Loading workspace">
      <svg
        className="animate-spin h-10 w-10 text-primary-600"
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

export function CircleWorkspace() {
  const { id: circleId } = useParams<{ id: string }>();
  const { contributor } = useAuth();
  const { data: workspace, isLoading, isError, error } = useCircleWorkspace(circleId ?? null);

  if (!circleId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-neutral-500">Invalid Circle ID.</p>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  if (isError) {
    const is403 =
      error instanceof Error && error.message.toLowerCase().includes("403");
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-neutral-700 font-medium mb-2">
          {is403
            ? "You're not a member of this Circle."
            : "Failed to load workspace."}
        </p>
        <p className="text-xs text-neutral-400">
          {is403
            ? "Ask a Circle member to add you."
            : "Please try refreshing the page."}
        </p>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <CircleWorkspaceShell
      workspace={workspace}
      currentContributorId={contributor?.id ?? null}
    />
  );
}

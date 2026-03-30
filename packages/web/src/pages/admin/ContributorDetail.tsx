import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useAllContributors,
  useInstitutions,
  useSetContributorInstitutions,
} from "../../hooks/useInstitutions.js";
import { Button } from "../../components/ui/Button.js";

export function ContributorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: allContributors, isLoading: loadingContributors } = useAllContributors();
  const { data: allInstitutions, isLoading: loadingInstitutions } = useInstitutions();
  const setAssignments = useSetContributorInstitutions();

  const contributor = allContributors?.find((c) => c.id === id);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  // Pre-populate checkboxes once contributor data loads
  useEffect(() => {
    if (contributor) {
      setChecked(new Set(contributor.institutions.map((i) => i.id)));
    }
  }, [contributor]);

  const isLoading = loadingContributors || loadingInstitutions;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 rounded w-1/2" />
          <div className="h-5 bg-neutral-200 rounded w-1/4" />
          <div className="h-64 bg-neutral-200 rounded" />
        </div>
      </div>
    );
  }

  if (!contributor) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-neutral-600">Contributor not found.</p>
        <button
          type="button"
          onClick={() => void navigate("/admin/institutions")}
          className="mt-4 text-primary-700 hover:underline font-medium text-sm"
        >
          Back to institutions
        </button>
      </div>
    );
  }

  const toggle = (institutionId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(institutionId)) {
        next.delete(institutionId);
      } else {
        next.add(institutionId);
      }
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    await setAssignments.mutateAsync({
      contributorId: contributor.id,
      institutionIds: [...checked],
    });
    navigate("/admin/institutions");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <button
        type="button"
        onClick={() => void navigate("/admin/institutions")}
        className="mb-6 text-sm text-primary-700 hover:text-primary-900 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
      >
        &larr; Back to institutions
      </button>

      {/* Contributor info */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">{contributor.name}</h1>
        <p className="text-sm text-neutral-500 mt-1 capitalize">
          {contributor.role.replace("_", " ")} &middot; {contributor.status}
        </p>
      </div>

      {/* Institution picker */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Institution Assignments</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Select the institutions this contributor is linked to.
          </p>
        </div>

        {!allInstitutions || allInstitutions.length === 0 ? (
          <div className="px-6 py-8 text-center text-neutral-400 text-sm">
            No institutions available. Create one first.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {allInstitutions.map((inst) => (
              <li key={inst.id}>
                <label className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked.has(inst.id)}
                    onChange={() => toggle(inst.id)}
                    disabled={setAssignments.isPending}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-700 focus-visible:ring-accent-500 focus-visible:ring-2 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{inst.name}</p>
                    {inst.city && (
                      <p className="text-xs text-neutral-500">{inst.city}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      inst.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {inst.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-4">
          {saved && !setAssignments.isPending && (
            <p className="text-sm text-green-700 font-medium">Assignments saved.</p>
          )}
          {setAssignments.isError && (
            <p className="text-sm text-red-600">Failed to save. Please try again.</p>
          )}
          {!saved && !setAssignments.isError && <span />}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => void navigate("/admin/institutions")}
              disabled={setAssignments.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              loading={setAssignments.isPending}
              disabled={allInstitutions?.length === 0}
            >
              Save Assignments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

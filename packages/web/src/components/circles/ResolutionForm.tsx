import { useState } from "react";
import type { CircleResolution, CircleStatus, SubmitResolutionInput } from "@indomitable-unity/shared";
import { submitResolutionSchema } from "@indomitable-unity/shared";
import { useSubmitResolution, useUpdateResolution } from "../../hooks/useCircles.js";

interface ResolutionFormProps {
  circleId: string;
  existingResolution: CircleResolution | null;
  circleStatus: CircleStatus;
  onSuccess?: () => void;
}

type FieldErrors = Partial<Record<keyof SubmitResolutionInput, string>>;

const EMPTY_FORM: SubmitResolutionInput = {
  problemSummary: "",
  recommendations: "",
  evidence: "",
  dissentingViews: "",
  implementationNotes: "",
};

export function ResolutionForm({
  circleId,
  existingResolution,
  circleStatus,
  onSuccess,
}: ResolutionFormProps) {
  const isEditMode = !!existingResolution;

  const [form, setForm] = useState<SubmitResolutionInput>(
    existingResolution
      ? {
          problemSummary: existingResolution.problemSummary,
          recommendations: existingResolution.recommendations,
          evidence: existingResolution.evidence,
          dissentingViews: existingResolution.dissentingViews ?? "",
          implementationNotes: existingResolution.implementationNotes ?? "",
        }
      : { ...EMPTY_FORM },
  );

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const submitMutation = useSubmitResolution(circleId);
  const updateMutation = useUpdateResolution(circleId);
  const activeMutation = isEditMode ? updateMutation : submitMutation;

  if (circleStatus === "completed" || circleStatus === "dissolved") {
    return null;
  }

  function handleChange(field: keyof SubmitResolutionInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const payload: SubmitResolutionInput = {
      problemSummary: form.problemSummary,
      recommendations: form.recommendations,
      evidence: form.evidence,
      dissentingViews: form.dissentingViews || undefined,
      implementationNotes: form.implementationNotes || undefined,
    };

    const result = submitResolutionSchema.safeParse(payload);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SubmitResolutionInput;
        if (field) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await activeMutation.mutateAsync(result.data);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      onSuccess?.();
    } catch {
      setSubmitError("Failed to submit resolution. Please try again.");
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {/* Problem Summary */}
      <div>
        <label htmlFor="resolution-problem-summary" className="block text-xs font-semibold text-neutral-700 mb-1">
          Problem Summary <span className="text-red-500">*</span>
        </label>
        <textarea
          id="resolution-problem-summary"
          value={form.problemSummary}
          onChange={(e) => handleChange("problemSummary", e.target.value)}
          placeholder="Describe the core problem or challenge being addressed..."
          rows={3}
          className={`w-full text-sm border rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y ${
            fieldErrors.problemSummary
              ? "border-red-400 bg-red-50"
              : "border-neutral-300"
          }`}
        />
        {fieldErrors.problemSummary && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.problemSummary}</p>
        )}
      </div>

      {/* Recommendations */}
      <div>
        <label htmlFor="resolution-recommendations" className="block text-xs font-semibold text-neutral-700 mb-1">
          Recommendations <span className="text-red-500">*</span>
        </label>
        <textarea
          id="resolution-recommendations"
          value={form.recommendations}
          onChange={(e) => handleChange("recommendations", e.target.value)}
          placeholder="Provide your recommended actions or solutions..."
          rows={4}
          className={`w-full text-sm border rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y ${
            fieldErrors.recommendations
              ? "border-red-400 bg-red-50"
              : "border-neutral-300"
          }`}
        />
        {fieldErrors.recommendations && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.recommendations}</p>
        )}
      </div>

      {/* Evidence */}
      <div>
        <label htmlFor="resolution-evidence" className="block text-xs font-semibold text-neutral-700 mb-1">
          Evidence <span className="text-red-500">*</span>
        </label>
        <textarea
          id="resolution-evidence"
          value={form.evidence}
          onChange={(e) => handleChange("evidence", e.target.value)}
          placeholder="What evidence supports your recommendations?"
          rows={3}
          className={`w-full text-sm border rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y ${
            fieldErrors.evidence
              ? "border-red-400 bg-red-50"
              : "border-neutral-300"
          }`}
        />
        {fieldErrors.evidence && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.evidence}</p>
        )}
      </div>

      {/* Dissenting Views (optional) */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1">
          Dissenting Views{" "}
          <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.dissentingViews ?? ""}
          onChange={(e) => handleChange("dissentingViews", e.target.value)}
          placeholder="Note any minority positions or disagreements within the Circle..."
          rows={2}
          className="w-full text-sm border border-neutral-300 rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y"
        />
      </div>

      {/* Implementation Notes (optional) */}
      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1">
          Implementation Notes{" "}
          <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.implementationNotes ?? ""}
          onChange={(e) => handleChange("implementationNotes", e.target.value)}
          placeholder="Practical steps, timelines, or considerations for implementing recommendations..."
          rows={2}
          className="w-full text-sm border border-neutral-300 rounded-[var(--radius-md)] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent resize-y"
        />
      </div>

      {submitError && (
        <p className="text-xs text-red-600">{submitError}</p>
      )}

      {submitSuccess && (
        <p className="text-xs text-green-600 font-medium">
          Resolution {isEditMode ? "updated" : "submitted"} successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={activeMutation.isPending}
        className="w-full sm:w-auto text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-[var(--radius-md)] px-4 py-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {activeMutation.isPending
          ? "Submitting..."
          : isEditMode
            ? "Update Resolution"
            : "Submit Resolution"}
      </button>
    </form>
  );
}

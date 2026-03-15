import { useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  useMyChallenges,
  useCreateChallenge,
  useUpdateChallenge,
} from "../../hooks/useChallenges.js";
import { ChallengeForm } from "../../components/challenges/ChallengeForm.js";
import { ManageChallengeRow } from "../../components/challenges/ManageChallengeRow.js";
import type { Challenge, CreateChallengeInput } from "@indomitable-unity/shared";

type FormMode = "create" | "edit";

export function ChallengeManage() {
  const { contributor } = useAuth();
  const { myChallenges, isLoading } = useMyChallenges(contributor?.id ?? null);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge(editingChallenge?.id ?? "");

  const handlePost = () => {
    setEditingChallenge(null);
    setFormMode("create");
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormMode("edit");
  };

  const handleCancel = () => {
    setFormMode(null);
    setEditingChallenge(null);
    createMutation.reset();
    updateMutation.reset();
  };

  const handleSubmit = (data: CreateChallengeInput) => {
    if (formMode === "edit" && editingChallenge) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          setFormMode(null);
          setEditingChallenge(null);
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setFormMode(null);
        },
      });
    }
  };

  const isEditing = formMode === "edit";
  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;
  const errorMessage = mutationError instanceof Error ? mutationError.message : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">My Challenges</h2>
        {formMode === null && (
          <button
            type="button"
            onClick={handlePost}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 transition-colors duration-150"
          >
            Post a Challenge
          </button>
        )}
      </div>

      {/* Inline form */}
      {formMode !== null && (
        <div className="border border-neutral-200 rounded-[var(--radius-lg)] bg-white p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-4">
            {isEditing ? "Edit Challenge" : "New Challenge"}
          </h3>
          <ChallengeForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialValues={
              editingChallenge
                ? {
                    title: editingChallenge.title,
                    description: editingChallenge.description,
                    brief: editingChallenge.brief,
                    domain: editingChallenge.domain as CreateChallengeInput["domain"],
                    skillsNeeded: editingChallenge.skillsNeeded,
                    type: editingChallenge.type,
                    deadline: editingChallenge.deadline ?? undefined,
                    circleSize: editingChallenge.circleSize,
                  }
                : undefined
            }
            isEditing={isEditing}
            interestCount={editingChallenge?.interestCount ?? 0}
            isPending={isPending}
            error={errorMessage}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <svg
            className="animate-spin h-6 w-6 text-primary-600"
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
      )}

      {/* Empty state */}
      {!isLoading && myChallenges.length === 0 && formMode === null && (
        <div className="text-center py-16">
          <p className="text-base text-neutral-500">
            You haven't posted any challenges yet.
          </p>
          <button
            type="button"
            onClick={handlePost}
            className="mt-4 text-sm text-primary-600 hover:text-primary-500 transition-colors duration-150"
          >
            Post your first challenge
          </button>
        </div>
      )}

      {/* Challenge rows */}
      {myChallenges.length > 0 && (
        <div className="space-y-3">
          {myChallenges.map((challenge) => (
            <ManageChallengeRow
              key={challenge.id}
              challenge={challenge}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

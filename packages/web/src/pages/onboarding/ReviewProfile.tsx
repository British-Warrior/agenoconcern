import { useEffect, useState, useCallback, KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { useProfile, useUpdateProfile } from "../../hooks/useOnboarding.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import type { ContributorProfile } from "@indomitable-unity/shared";

// ---------------------------------------------------------------------------
// Tag pill component
// ---------------------------------------------------------------------------

interface TagPillProps {
  value: string;
  onRemove: () => void;
  disabled?: boolean;
}

function TagPill({ value, onRemove, disabled = false }: TagPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-900 border border-primary-200">
      {value}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          className="text-primary-600 hover:text-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-full p-0.5 -mr-1"
          aria-label={`Remove ${value}`}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tag list editor
// ---------------------------------------------------------------------------

interface TagListEditorProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

function TagListEditor({
  label,
  tags,
  onChange,
  placeholder = "Type and press Enter to add",
  disabled = false,
}: TagListEditorProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }, [input, tags, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-base font-medium text-neutral-800 mb-1">{label}</legend>
      {/* Tag pills */}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {tags.map((tag, index) => (
          <TagPill
            key={`${tag}-${index}`}
            value={tag}
            onRemove={() => removeTag(index)}
            disabled={disabled}
          />
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-neutral-400 italic">None added yet</span>
        )}
      </div>
      {/* Add input */}
      {!disabled && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-h-[2.5rem] px-3 py-2 text-sm text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-accent-500 placeholder:text-neutral-400"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={!input.trim()}
            className="px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Add
          </button>
        </div>
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Editable profile state
// ---------------------------------------------------------------------------

interface EditableProfile {
  name: string;
  professionalSummary: string;
  rolesAndTitles: string[];
  skills: string[];
  qualifications: string[];
  sectors: string[];
  yearsOfExperience: number;
}

function profileToEditable(profile: ContributorProfile): EditableProfile {
  return {
    name: "",
    professionalSummary: profile.professionalSummary ?? "",
    rolesAndTitles: profile.rolesAndTitles ?? [],
    skills: profile.skills ?? [],
    qualifications: profile.qualifications ?? [],
    sectors: profile.sectors ?? [],
    yearsOfExperience: profile.yearsOfExperience ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Main ReviewProfile component
// ---------------------------------------------------------------------------

export function ReviewProfile() {
  const navigate = useNavigate();
  const { data: profile, isLoading, error: profileError } = useProfile();
  const updateProfile = useUpdateProfile();

  const [editable, setEditable] = useState<EditableProfile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Populate editable state once profile loads
  useEffect(() => {
    if (profile && !editable) {
      setEditable(profileToEditable(profile));
    }
  }, [profile, editable]);

  useEffect(() => {
    document.title = "Review Your Profile — Indomitable Unity";
  }, []);

  const handleConfirm = async () => {
    if (!editable) return;
    setSubmitError(null);

    try {
      await updateProfile.mutateAsync({
        professionalSummary: editable.professionalSummary,
        rolesAndTitles: editable.rolesAndTitles,
        skills: editable.skills,
        qualifications: editable.qualifications,
        sectors: editable.sectors,
        yearsOfExperience: editable.yearsOfExperience,
      });
      navigate("/onboarding/affirmation");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save your profile. Please try again."
      );
    }
  };

  // Loading state
  if (isLoading || !editable) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status">
        <svg
          className="animate-spin h-10 w-10 text-primary-800"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="sr-only">Loading your profile...</span>
      </div>
    );
  }

  // Error loading profile
  if (profileError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Alert variant="error">
            Failed to load your profile. Please{" "}
            <button
              onClick={() => window.location.reload()}
              className="underline font-semibold"
            >
              try again
            </button>
            .
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Review your profile
          </h1>
          <p className="text-lg text-neutral-600">
            We've filled this in from your CV. Edit anything that needs changing
            before confirming.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Professional Summary */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-3">
              Professional Summary
            </h2>
            <textarea
              value={editable.professionalSummary}
              onChange={(e) =>
                setEditable({ ...editable, professionalSummary: e.target.value })
              }
              rows={5}
              placeholder="A brief overview of your professional background and strengths"
              className="w-full px-4 py-3 text-base text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-accent-500 placeholder:text-neutral-400 resize-y"
            />
          </section>

          {/* Roles & Titles */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <TagListEditor
              label="Roles & Titles"
              tags={editable.rolesAndTitles}
              onChange={(tags) => setEditable({ ...editable, rolesAndTitles: tags })}
              placeholder="e.g. Senior Engineer"
            />
          </section>

          {/* Skills */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <TagListEditor
              label="Skills"
              tags={editable.skills}
              onChange={(tags) => setEditable({ ...editable, skills: tags })}
              placeholder="e.g. Project Management"
            />
          </section>

          {/* Qualifications */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <TagListEditor
              label="Qualifications"
              tags={editable.qualifications}
              onChange={(tags) => setEditable({ ...editable, qualifications: tags })}
              placeholder="e.g. MBA, PMP"
            />
          </section>

          {/* Sectors */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <TagListEditor
              label="Sectors"
              tags={editable.sectors}
              onChange={(tags) => setEditable({ ...editable, sectors: tags })}
              placeholder="e.g. Healthcare, Finance"
            />
          </section>

          {/* Years of Experience */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <label htmlFor="years-of-experience" className="block text-base font-medium text-neutral-800 mb-2">
              Years of Experience
            </label>
            <input
              id="years-of-experience"
              type="number"
              min={0}
              max={60}
              value={editable.yearsOfExperience}
              onChange={(e) =>
                setEditable({
                  ...editable,
                  yearsOfExperience: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              className="w-32 min-h-[3rem] px-4 py-3 text-base text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-accent-500"
            />
          </section>

          {/* Confirm error */}
          {submitError && (
            <Alert variant="error">{submitError}</Alert>
          )}

          {/* Confirm button */}
          <Button
            size="lg"
            fullWidth
            onClick={handleConfirm}
            loading={updateProfile.isPending}
          >
            Confirm Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, type FormEvent, type KeyboardEvent } from "react";
import { DOMAIN_TAXONOMY } from "@agenoconcern/shared";
import type { CreateChallengeInput } from "@agenoconcern/shared";

interface ChallengeFormProps {
  onSubmit: (data: CreateChallengeInput) => void;
  onCancel?: () => void;
  initialValues?: Partial<CreateChallengeInput>;
  isEditing?: boolean;
  interestCount?: number;
  isPending?: boolean;
  error?: string | null;
}

interface FormErrors {
  title?: string;
  description?: string;
  brief?: string;
  domain?: string;
  type?: string;
  skillsNeeded?: string;
  circleSize?: string;
  deadline?: string;
}

function validateForm(values: {
  title: string;
  description: string;
  brief: string;
  domain: string[];
  type: string;
  skillsNeeded: string[];
  circleSize: number;
  deadline: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (values.title.length < 5) errors.title = "Title must be at least 5 characters.";
  else if (values.title.length > 200) errors.title = "Title must be 200 characters or fewer.";

  if (values.description.length < 20) errors.description = "Description must be at least 20 characters.";
  else if (values.description.length > 5000) errors.description = "Description must be 5000 characters or fewer.";

  if (values.brief.length < 10) errors.brief = "Brief must be at least 10 characters.";
  else if (values.brief.length > 500) errors.brief = "Brief must be 500 characters or fewer.";

  if (values.domain.length === 0) errors.domain = "At least one domain is required.";

  if (!values.type) errors.type = "Please select a type.";

  if (values.skillsNeeded.length > 20) errors.skillsNeeded = "Maximum 20 skills allowed.";

  if (values.circleSize < 1) errors.circleSize = "Circle size must be at least 1.";

  if (values.deadline) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(values.deadline)) errors.deadline = "Invalid date format.";
  }

  return errors;
}

export function ChallengeForm({
  onSubmit,
  onCancel,
  initialValues,
  isEditing = false,
  interestCount = 0,
  isPending = false,
  error = null,
}: ChallengeFormProps) {
  const isLocked = isEditing && interestCount > 0;

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [brief, setBrief] = useState(initialValues?.brief ?? "");
  const [domain, setDomain] = useState<string[]>(initialValues?.domain ?? []);
  const [customDomain, setCustomDomain] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>(
    initialValues?.skillsNeeded ?? [],
  );
  const [skillInput, setSkillInput] = useState("");
  const [type, setType] = useState<"paid" | "free">(initialValues?.type ?? "free");
  const [deadline, setDeadline] = useState(initialValues?.deadline ?? "");
  const [circleSize, setCircleSize] = useState(initialValues?.circleSize ?? 4);
  const [circleSizeConfirmed, setCircleSizeConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const toggleDomain = useCallback((d: string) => {
    setDomain((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }, []);

  const addCustomDomain = useCallback(() => {
    const trimmed = customDomain.trim();
    if (!trimmed || domain.includes(trimmed)) {
      setCustomDomain("");
      return;
    }
    setDomain((prev) => [...prev, trimmed]);
    setCustomDomain("");
  }, [customDomain, domain]);

  const addSkill = useCallback(() => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skillsNeeded.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    if (skillsNeeded.length >= 20) return;
    setSkillsNeeded((prev) => [...prev, trimmed]);
    setSkillInput("");
  }, [skillInput, skillsNeeded]);

  const removeSkill = useCallback((skill: string) => {
    setSkillsNeeded((prev) => prev.filter((s) => s !== skill));
  }, []);

  const handleSkillKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSkill();
      }
    },
    [addSkill],
  );

  const handleCustomDomainKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomDomain();
      }
    },
    [addCustomDomain],
  );

  const circleSizeOutOfRange = circleSize < 2 || circleSize > 10;
  const needsCircleSizeConfirm = circleSizeOutOfRange && !circleSizeConfirmed;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (needsCircleSizeConfirm) return;

    const formErrors = validateForm({
      title,
      description,
      brief,
      domain,
      type,
      skillsNeeded,
      circleSize,
      deadline,
    });

    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    const data: CreateChallengeInput = {
      title,
      description,
      brief,
      domain,
      skillsNeeded,
      type,
      deadline: deadline || undefined,
      circleSize,
    };
    onSubmit(data);
  };

  const fieldClass = (hasError: boolean) =>
    `w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 transition-colors duration-150 ${
      hasError
        ? "border-error focus:ring-error/30"
        : "border-neutral-300 focus:ring-primary-500/30 focus:border-primary-500"
    } ${isLocked ? "bg-neutral-50 cursor-not-allowed text-neutral-500" : ""}`;

  const labelClass = "block text-sm font-medium text-neutral-700 mb-1";
  const errorClass = "mt-1 text-xs text-error";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {isLocked && (
        <div className="rounded-[var(--radius-md)] bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Challenge cannot be edited after interest has been expressed.
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-md)] bg-error-bg border border-error/30 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="cf-title" className={labelClass}>
          Title <span className="text-error">*</span>
        </label>
        <input
          id="cf-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLocked || isPending}
          maxLength={200}
          className={fieldClass(touched && !!errors.title)}
          placeholder="What is this challenge about?"
        />
        {touched && errors.title && <p className={errorClass}>{errors.title}</p>}
        <p className="mt-1 text-xs text-neutral-400">{title.length}/200</p>
      </div>

      {/* Brief */}
      <div>
        <label htmlFor="cf-brief" className={labelClass}>
          Brief summary <span className="text-error">*</span>
        </label>
        <input
          id="cf-brief"
          type="text"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          disabled={isLocked || isPending}
          maxLength={500}
          className={fieldClass(touched && !!errors.brief)}
          placeholder="One or two sentences to catch attention (10–500 chars)"
        />
        {touched && errors.brief && <p className={errorClass}>{errors.brief}</p>}
        <p className="mt-1 text-xs text-neutral-400">{brief.length}/500</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="cf-description" className={labelClass}>
          Full description <span className="text-error">*</span>
        </label>
        <textarea
          id="cf-description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLocked || isPending}
          maxLength={5000}
          className={fieldClass(touched && !!errors.description)}
          placeholder="Detailed context, expected outcomes, and requirements (20–5000 chars)"
        />
        {touched && errors.description && (
          <p className={errorClass}>{errors.description}</p>
        )}
        <p className="mt-1 text-xs text-neutral-400">{description.length}/5000</p>
      </div>

      {/* Domain — checkbox list + custom input */}
      <div>
        <p className={labelClass}>
          Domain <span className="text-error">*</span>
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          {DOMAIN_TAXONOMY.map((d) => (
            <label
              key={d}
              className={`flex items-center gap-2 text-sm cursor-pointer ${isLocked || isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                type="checkbox"
                checked={domain.includes(d)}
                onChange={() => toggleDomain(d)}
                disabled={isLocked || isPending}
                className="accent-primary-600 rounded"
              />
              {d}
            </label>
          ))}
        </div>
        {/* Custom domain input */}
        {!isLocked && (
          <div className="flex gap-2">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              onKeyDown={handleCustomDomainKeyDown}
              disabled={isPending}
              placeholder="Add a custom domain"
              className="flex-1 rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addCustomDomain}
              disabled={!customDomain.trim() || isPending}
              className="px-3 py-2 rounded-[var(--radius-md)] bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Add
            </button>
          </div>
        )}
        {/* Show selected custom domains (ones not in DOMAIN_TAXONOMY) */}
        {domain.filter((d) => !DOMAIN_TAXONOMY.includes(d as typeof DOMAIN_TAXONOMY[number])).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {domain
              .filter((d) => !DOMAIN_TAXONOMY.includes(d as typeof DOMAIN_TAXONOMY[number]))
              .map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-50 border border-accent-200 text-xs text-accent-700"
                >
                  {d}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setDomain((prev) => prev.filter((x) => x !== d))}
                      disabled={isPending}
                      aria-label={`Remove ${d}`}
                      className="ml-0.5 text-accent-400 hover:text-accent-700 transition-colors duration-100"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
          </div>
        )}
        {touched && errors.domain && <p className={errorClass}>{errors.domain}</p>}
      </div>

      {/* Skills needed */}
      <div>
        <label className={labelClass}>
          Skills needed{" "}
          <span className="text-neutral-400 font-normal">(max 20)</span>
        </label>
        {!isLocked && (
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              disabled={skillsNeeded.length >= 20 || isPending}
              placeholder="Type a skill and press Enter"
              className="flex-1 rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={
                !skillInput.trim() || skillsNeeded.length >= 20 || isPending
              }
              className="px-3 py-2 rounded-[var(--radius-md)] bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Add
            </button>
          </div>
        )}
        {skillsNeeded.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skillsNeeded.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs text-primary-700"
              >
                {skill}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    disabled={isPending}
                    aria-label={`Remove ${skill}`}
                    className="ml-0.5 text-primary-400 hover:text-primary-700 transition-colors duration-100"
                  >
                    &times;
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {touched && errors.skillsNeeded && (
          <p className={errorClass}>{errors.skillsNeeded}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <p className={labelClass}>
          Type <span className="text-error">*</span>
        </p>
        <div className="flex gap-6">
          {(["paid", "free"] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center gap-2 text-sm cursor-pointer ${isLocked || isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="cf-type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                disabled={isLocked || isPending}
                className="accent-primary-600"
              />
              <span className="capitalize">{t}</span>
            </label>
          ))}
        </div>
        {touched && errors.type && <p className={errorClass}>{errors.type}</p>}
      </div>

      {/* Circle size — soft guideline */}
      <div>
        <label htmlFor="cf-circleSize" className={labelClass}>
          Circle size{" "}
          <span className="text-neutral-400 font-normal">(recommended 2–10)</span>
        </label>
        <input
          id="cf-circleSize"
          type="number"
          min={1}
          value={circleSize}
          onChange={(e) => {
            setCircleSize(Number(e.target.value));
            setCircleSizeConfirmed(false);
          }}
          disabled={isLocked || isPending}
          className={`w-24 ${fieldClass(touched && !!errors.circleSize)}`}
        />
        {circleSizeOutOfRange && (
          <div className="mt-2 rounded-[var(--radius-md)] bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <p>
              {circleSize < 2
                ? "A Circle with fewer than 2 people limits collaboration. Continue anyway?"
                : `A Circle of ${circleSize} is larger than the recommended maximum of 10. Are you sure?`}
            </p>
            {!circleSizeConfirmed ? (
              <button
                type="button"
                onClick={() => setCircleSizeConfirmed(true)}
                className="mt-1 text-sm font-medium text-amber-900 underline hover:text-amber-700"
              >
                Yes, I'm sure
              </button>
            ) : (
              <p className="mt-1 text-xs text-amber-600">Confirmed.</p>
            )}
          </div>
        )}
        {touched && errors.circleSize && (
          <p className={errorClass}>{errors.circleSize}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="cf-deadline" className={labelClass}>
          Deadline{" "}
          <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <input
          id="cf-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          disabled={isLocked || isPending}
          className={`w-48 ${fieldClass(touched && !!errors.deadline)}`}
        />
        {touched && errors.deadline && (
          <p className={errorClass}>{errors.deadline}</p>
        )}
      </div>

      {/* Value — what the completed challenge is worth */}
      {/* TODO: Add value/compensation field in Phase 5 when payments are implemented */}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium text-neutral-700 border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 transition-colors duration-150"
          >
            Cancel
          </button>
        )}
        {!isLocked && (
          <button
            type="submit"
            disabled={isPending || needsCircleSizeConfirm}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {isPending
              ? isEditing
                ? "Saving..."
                : "Posting..."
              : isEditing
                ? "Save Changes"
                : "Post Challenge"}
          </button>
        )}
      </div>
    </form>
  );
}

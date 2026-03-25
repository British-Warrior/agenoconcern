import { useState } from "react";
import { Button } from "../ui/Button.js";
import { Alert } from "../ui/Alert.js";
import type { WellbeingCheckinInput } from "@indomitable-unity/shared";
import { useSubmitCheckin } from "../../hooks/useWellbeing.js";

// ─── UCLA 3-item scale ─────────────────────────────────────────────────────────

const UCLA_QUESTIONS = [
  "How often do you feel that you lack companionship?",
  "How often do you feel left out?",
  "How often do you feel isolated from others?",
] as const;

const UCLA_OPTIONS = [
  { label: "Never", value: 1 },
  { label: "Rarely", value: 2 },
  { label: "Sometimes", value: 3 },
  { label: "Often", value: 4 },
] as const;

// ─── SWEMWBS 7-item scale ──────────────────────────────────────────────────────

const SWEMWBS_STATEMENTS = [
  "I've been feeling optimistic about the future",
  "I've been feeling useful",
  "I've been feeling relaxed",
  "I've been dealing with problems well",
  "I've been thinking clearly",
  "I've been feeling close to other people",
  "I've been able to make up my own mind about things",
] as const;

const SWEMWBS_OPTIONS = [
  { label: "None of the time", value: 1 },
  { label: "Rarely", value: 2 },
  { label: "Some of the time", value: 3 },
  { label: "Often", value: 4 },
  { label: "All of the time", value: 5 },
] as const;

// ─── Props ─────────────────────────────────────────────────────────────────────

interface WellbeingFormProps {
  onSuccess: () => void;
  submitLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WellbeingForm({
  onSuccess,
  submitLabel = "Submit",
  showSkip = false,
  onSkip,
}: WellbeingFormProps) {
  const submitCheckin = useSubmitCheckin();

  const [uclaAnswers, setUclaAnswers] = useState<(number | null)[]>([null, null, null]);
  const [swemwbsAnswers, setSwemwbsAnswers] = useState<(number | null)[]>([
    null, null, null, null, null, null, null,
  ]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [institutionalReportingChecked, setInstitutionalReportingChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uclaComplete = uclaAnswers.every((a) => a !== null);
  const swemwbsComplete = swemwbsAnswers.every((a) => a !== null);
  const canSubmit = uclaComplete && swemwbsComplete && consentChecked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    const data: WellbeingCheckinInput = {
      uclaItems: uclaAnswers as [number, number, number],
      wemwbsItems: swemwbsAnswers as [number, number, number, number, number, number, number],
      consentGranted: true,
      institutionalReporting: institutionalReportingChecked,
    };

    try {
      await submitCheckin.mutateAsync(data);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Section 1: UCLA Loneliness Scale */}
      <section aria-labelledby="ucla-heading">
        <h2 id="ucla-heading" className="text-xl font-bold text-neutral-900 mb-1">
          Connection Check
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          These questions help us understand how connected you feel. Your answers are confidential.
        </p>

        <div className="space-y-6">
          {UCLA_QUESTIONS.map((question, idx) => (
            <fieldset key={idx} className="space-y-3">
              <legend className="text-base font-medium text-neutral-800">
                {idx + 1}. {question}
              </legend>
              <div className="flex flex-wrap gap-3">
                {UCLA_OPTIONS.map((opt) => {
                  const inputId = `ucla-${idx}-${opt.value}`;
                  const isSelected = uclaAnswers[idx] === opt.value;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={inputId}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border cursor-pointer
                        text-sm font-medium transition-colors
                        ${isSelected
                          ? "bg-primary-800 text-white border-primary-800"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-700"
                        }
                      `}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`ucla-${idx}`}
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => {
                          const updated = [...uclaAnswers];
                          updated[idx] = opt.value;
                          setUclaAnswers(updated);
                        }}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {/* Section 2: SWEMWBS */}
      <section aria-labelledby="swemwbs-heading">
        <h2 id="swemwbs-heading" className="text-xl font-bold text-neutral-900 mb-1">
          Wellbeing Check
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          Please select the option that best describes your experience over the last 2 weeks.
        </p>

        <div className="space-y-6">
          {SWEMWBS_STATEMENTS.map((statement, idx) => (
            <fieldset key={idx} className="space-y-3">
              <legend className="text-base font-medium text-neutral-800">
                {idx + 1}. {statement}
              </legend>
              <div className="flex flex-wrap gap-2">
                {SWEMWBS_OPTIONS.map((opt) => {
                  const inputId = `swemwbs-${idx}-${opt.value}`;
                  const isSelected = swemwbsAnswers[idx] === opt.value;
                  return (
                    <label
                      key={opt.value}
                      htmlFor={inputId}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer
                        text-sm font-medium transition-colors
                        ${isSelected
                          ? "bg-primary-800 text-white border-primary-800"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-700"
                        }
                      `}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`swemwbs-${idx}`}
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => {
                          const updated = [...swemwbsAnswers];
                          updated[idx] = opt.value;
                          setSwemwbsAnswers(updated);
                        }}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {/* Consent section */}
      <section aria-labelledby="consent-heading" className="bg-neutral-50 border border-neutral-200 rounded-[var(--radius-lg)] p-5">
        <h3 id="consent-heading" className="text-sm font-semibold text-neutral-700 mb-3">
          Data consent
        </h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-700"
          />
          <span className="text-sm text-neutral-700 leading-relaxed">
            I understand this data is classified as special category health data under UK GDPR. I
            give explicit consent for Indomitable Unity to collect, store, and process my wellbeing
            responses to track my wellbeing over time. I can withdraw consent and request deletion
            at any time.
          </span>
        </label>
      </section>

      {/* Institutional reporting consent (optional) */}
      <section className="bg-neutral-50 border border-neutral-200 rounded-[var(--radius-lg)] p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={institutionalReportingChecked}
            onChange={(e) => setInstitutionalReportingChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-700"
          />
          <span className="text-sm text-neutral-700 leading-relaxed">
            I also consent to my anonymised wellbeing data being included in aggregate reports
            shared with the institution that referred me. No personally identifiable information
            will be disclosed; results are only reported when at least 5 contributors have
            consented. This is optional and does not affect my check-in.
          </span>
        </label>
      </section>

      {/* Error */}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canSubmit || submitCheckin.isPending}
          loading={submitCheckin.isPending}
        >
          {submitLabel}
        </Button>

        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-neutral-500 hover:text-neutral-700 underline cursor-pointer"
          >
            Skip for now
          </button>
        )}
      </div>
    </form>
  );
}

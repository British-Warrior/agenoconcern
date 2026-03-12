import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSavePreferences } from "../../hooks/useOnboarding.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import { DOMAIN_TAXONOMY } from "@agenoconcern/shared";
import type { Availability, CommChannel, CommFrequency } from "@agenoconcern/shared";

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface PreferencesForm {
  availability: Availability | "";
  domainPreferences: string[];
  domainOther: string;
  maxCircles: number;
  willingToMentor: boolean;
  commChannel: CommChannel | "";
  commFrequency: CommFrequency | "";
}

const DEFAULT_FORM: PreferencesForm = {
  availability: "",
  domainPreferences: [],
  domainOther: "",
  maxCircles: 3,
  willingToMentor: false,
  commChannel: "",
  commFrequency: "",
};

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

interface RadioGroupProps<T extends string> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  required?: boolean;
}

function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  required,
}: RadioGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-medium text-neutral-800 mb-1">
        {legend}
        {required && <span className="text-accent-600 ml-1" aria-hidden="true">*</span>}
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              required={required}
              className="w-4 h-4 accent-primary-800 cursor-pointer"
            />
            <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Preferences() {
  const navigate = useNavigate();
  const savePreferences = useSavePreferences();

  const [form, setForm] = useState<PreferencesForm>(DEFAULT_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Your Preferences — Age No Concern";
  }, []);

  // Toggle a domain checkbox
  const toggleDomain = (domain: string) => {
    setForm((prev) => ({
      ...prev,
      domainPreferences: prev.domainPreferences.includes(domain)
        ? prev.domainPreferences.filter((d) => d !== domain)
        : [...prev.domainPreferences, domain],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validation for required radio fields
    if (!form.availability) {
      setSubmitError("Please select your availability.");
      return;
    }
    if (!form.commChannel) {
      setSubmitError("Please select a preferred contact method.");
      return;
    }
    if (!form.commFrequency) {
      setSubmitError("Please select a notification frequency.");
      return;
    }

    // Merge free-text Other into domainPreferences if provided
    const domainOtherTrimmed = form.domainOther.trim();
    const finalDomains = domainOtherTrimmed
      ? [...form.domainPreferences, domainOtherTrimmed]
      : form.domainPreferences;

    try {
      await savePreferences.mutateAsync({
        availability: form.availability,
        domainPreferences: finalDomains,
        domainOther: domainOtherTrimmed || undefined,
        maxCircles: form.maxCircles,
        willingToMentor: form.willingToMentor,
        commChannel: form.commChannel,
        commFrequency: form.commFrequency,
      });
      navigate("/onboarding/stripe");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
            ? JSON.stringify(err)
            : "Failed to save preferences. Please try again.";
      setSubmitError(message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Set your preferences
          </h1>
          <p className="text-lg text-neutral-600">
            Help us match you with the right opportunities. You can update these at any time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {/* Availability */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <RadioGroup<Availability>
              legend="Availability"
              name="availability"
              value={form.availability}
              onChange={(v) => setForm((p) => ({ ...p, availability: v }))}
              options={[
                { value: "full_time", label: "Full-time" },
                { value: "part_time", label: "Part-time" },
                { value: "occasional", label: "Occasional" },
                { value: "project_only", label: "Project-only" },
              ]}
            />
          </section>

          {/* Domain Preferences */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <fieldset className="flex flex-col gap-3">
              <legend className="text-base font-medium text-neutral-800 mb-1">
                Domain Preferences
              </legend>
              <p className="text-sm text-neutral-500 -mt-1 mb-2">
                Select all areas where you have expertise or interest.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DOMAIN_TAXONOMY.map((domain) => (
                  <label
                    key={domain}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={form.domainPreferences.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                      className="w-4 h-4 accent-primary-800 cursor-pointer rounded"
                    />
                    <span className="text-sm text-neutral-700 group-hover:text-neutral-900">
                      {domain}
                    </span>
                  </label>
                ))}
              </div>
              {/* Free-text Other */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Other (optional)
                </label>
                <input
                  type="text"
                  value={form.domainOther}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, domainOther: e.target.value }))
                  }
                  placeholder="e.g. Aerospace"
                  className="w-full min-h-[2.5rem] px-3 py-2 text-sm text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 placeholder:text-neutral-400"
                />
              </div>
            </fieldset>
          </section>

          {/* Max Circles */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <label className="block text-base font-medium text-neutral-800 mb-1">
              Maximum Circles
            </label>
            <p className="text-sm text-neutral-500 mb-3">
              How many active Circles would you like to be part of at once?
              You can change this anytime.
            </p>
            <input
              type="number"
              min={1}
              max={10}
              value={form.maxCircles}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  maxCircles: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)),
                }))
              }
              className="w-24 min-h-[3rem] px-4 py-3 text-base text-neutral-900 bg-white border-2 border-neutral-300 rounded-[var(--radius-md)] hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
          </section>

          {/* Mentoring */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.willingToMentor}
                onChange={(e) =>
                  setForm((p) => ({ ...p, willingToMentor: e.target.checked }))
                }
                className="mt-0.5 w-4 h-4 accent-primary-800 cursor-pointer rounded"
              />
              <div>
                <span className="block text-base font-medium text-neutral-800">
                  Open to mentoring
                </span>
                <span className="block text-sm text-neutral-500 mt-0.5">
                  Tick this if you are willing to offer informal guidance or mentoring to newer contributors.
                </span>
              </div>
            </label>
          </section>

          {/* Communication Channel */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <RadioGroup<CommChannel>
              legend="Preferred contact method"
              name="commChannel"
              value={form.commChannel}
              onChange={(v) => setForm((p) => ({ ...p, commChannel: v }))}
              options={[
                { value: "email", label: "Email" },
                { value: "phone", label: "Phone" },
                { value: "both", label: "Both" },
              ]}
            />
          </section>

          {/* Communication Frequency */}
          <section className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6">
            <RadioGroup<CommFrequency>
              legend="Notification frequency"
              name="commFrequency"
              value={form.commFrequency}
              onChange={(v) => setForm((p) => ({ ...p, commFrequency: v }))}
              options={[
                { value: "immediate", label: "Immediate" },
                { value: "daily", label: "Daily digest" },
                { value: "weekly", label: "Weekly digest" },
              ]}
            />
          </section>

          {/* Error */}
          {submitError && <Alert variant="error">{submitError}</Alert>}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={savePreferences.isPending}
          >
            Save Preferences
          </Button>
        </form>
      </div>
    </div>
  );
}

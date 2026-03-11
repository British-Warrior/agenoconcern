import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useCvParseStatus } from "../../hooks/useOnboarding.js";

const PARSE_STEPS = [
  "Reading your CV...",
  "Finding your expertise...",
  "Building your profile...",
  "Almost there...",
];

const STEP_DURATION_MS = 3000;

export function Parsing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [currentStep, setCurrentStep] = useState(0);

  // Advance animated labels every STEP_DURATION_MS
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < PARSE_STEPS.length - 1) return prev + 1;
        return prev; // stay on last step
      });
    }, STEP_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  const { data, isError } = useCvParseStatus(jobId);

  // Navigate to review when parsing completes
  useEffect(() => {
    if (data?.status === "complete") {
      navigate("/onboarding/review", { replace: true });
    }
  }, [data?.status, navigate]);

  const isFailed = data?.status === "failed" || isError;

  useEffect(() => {
    document.title = "Analysing your CV — Age No Concern";
  }, []);

  if (!jobId) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <p className="text-lg text-neutral-700 mb-6">
            No job ID found. Please start again.
          </p>
          <Link
            to="/onboarding/upload"
            className="text-primary-800 underline font-semibold hover:text-primary-700"
          >
            Upload your CV
          </Link>
        </div>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 bg-error-bg rounded-full flex items-center justify-center mx-auto mb-6"
            aria-hidden="true"
          >
            <span className="text-3xl text-error">&#x2717;</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-base text-neutral-600 mb-6">
            {data?.errorMessage ??
              "We couldn't process your CV. Please try again with a different file."}
          </p>
          <Link
            to="/onboarding/upload"
            className="text-primary-800 underline font-semibold hover:text-primary-700"
          >
            Try uploading again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-md w-full">
        {/* Spinner */}
        <div className="flex justify-center mb-8" aria-hidden="true">
          <svg
            className="animate-spin h-16 w-16 text-primary-800"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          Analysing your CV
        </h1>

        {/* Animated step label */}
        <p
          key={currentStep}
          className="text-lg text-primary-800 font-semibold mb-8 transition-opacity duration-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {PARSE_STEPS[currentStep]}
        </p>

        {/* Step progress indicators */}
        <div
          className="flex justify-center gap-2 mb-8"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={PARSE_STEPS.length - 1}
          aria-valuenow={currentStep}
          aria-label={`Step ${currentStep + 1} of ${PARSE_STEPS.length}`}
        >
          {PARSE_STEPS.map((step, index) => (
            <div
              key={step}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index <= currentStep
                  ? "w-8 bg-primary-800"
                  : "w-2 bg-neutral-300"
                }
              `.trim()}
            />
          ))}
        </div>

        <p className="text-sm text-neutral-500">
          This usually takes less than a minute.
        </p>
      </div>
    </div>
  );
}

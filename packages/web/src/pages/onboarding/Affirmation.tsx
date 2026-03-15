import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useProfile } from "../../hooks/useOnboarding.js";
import { Button } from "../../components/ui/Button.js";

function SparkleIcon() {
  return (
    <svg
      className="w-16 h-16 text-accent-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    </svg>
  );
}

const FALLBACK_AFFIRMATION =
  "Your experience and expertise are exactly what this community needs. Welcome — you're in the right place.";

export function Affirmation() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();

  const affirmationMessage = profile?.affirmationMessage ?? FALLBACK_AFFIRMATION;

  useEffect(() => {
    document.title = "Welcome to Indomitable Unity";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-neutral-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <SparkleIcon />
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-neutral-900 mb-4 leading-tight">
          Welcome to Indomitable Unity
        </h1>

        <p className="text-lg text-neutral-600 mb-8">
          Your profile is ready.
        </p>

        {/* Personalised affirmation */}
        <blockquote
          className="text-xl font-semibold text-primary-800 leading-relaxed bg-white border border-primary-200 rounded-[var(--radius-lg)] px-8 py-6 mb-10 shadow-sm"
        >
          {affirmationMessage}
        </blockquote>

        {/* Continue CTA */}
        <Button
          size="lg"
          onClick={() => navigate("/onboarding/preferences")}
          className="px-12"
        >
          Continue
        </Button>

        {/* Sub-copy */}
        <p className="text-sm text-neutral-500 mt-6">
          Next: set your availability and communication preferences
        </p>
      </div>
    </div>
  );
}

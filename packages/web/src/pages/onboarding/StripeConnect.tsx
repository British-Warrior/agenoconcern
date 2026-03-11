import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useStartStripeConnect, useSkipStripe } from "../../hooks/useOnboarding.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";

export function StripeConnect() {
  const navigate = useNavigate();
  const startStripeConnect = useStartStripeConnect();
  const skipStripe = useSkipStripe();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Payment Setup — Age No Concern";
  }, []);

  const handleSetUpPayments = async () => {
    setError(null);
    try {
      // On success the mutation navigates via window.location.href
      await startStripeConnect.mutateAsync();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start payment setup. Please try again."
      );
    }
  };

  const handleSkip = async () => {
    setError(null);
    try {
      await skipStripe.mutateAsync();
      navigate("/onboarding/complete");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  const isBusy = startStripeConnect.isPending || skipStripe.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-neutral-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-[var(--radius-lg)] border border-neutral-200 shadow-sm px-8 py-10 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6" aria-hidden="true">
            <svg
              className="w-14 h-14 text-primary-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            Want to earn from your expertise?
          </h1>

          {/* Body */}
          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            Some Circles offer payment for your contributions. Setting up Stripe lets you
            receive those earnings directly — but it is entirely optional.
          </p>
          <p className="text-sm text-neutral-500 mb-8">
            You can set this up at any time from your profile.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          {/* Buttons — equally visible side by side */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSetUpPayments}
              loading={startStripeConnect.isPending}
              disabled={isBusy}
            >
              Set up payments
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleSkip}
              loading={skipStripe.isPending}
              disabled={isBusy}
            >
              Set up later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

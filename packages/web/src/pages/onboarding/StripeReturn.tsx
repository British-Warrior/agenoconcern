import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiClient } from "../../api/client.js";
import { Card } from "../../components/ui/Card.js";

/**
 * Stripe Connect redirects here after onboarding completes.
 * Calls the server to update stripeStatus, then navigates to wellbeing.
 */
export function StripeReturn() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient<{ status: string }>("/api/onboarding/stripe/return")
      .then(() => {
        navigate("/onboarding/wellbeing", { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Stripe Setup Issue</h1>
          <p className="text-neutral-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/onboarding/stripe")}
            className="text-teal-700 underline"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <p className="text-neutral-600">Completing Stripe setup...</p>
      </Card>
    </div>
  );
}

/**
 * Stripe redirects here when onboarding needs to be refreshed/retried.
 * Simply redirects back to the Stripe Connect onboarding page.
 */
export function StripeRefresh() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/onboarding/stripe", { replace: true });
  }, [navigate]);

  return null;
}

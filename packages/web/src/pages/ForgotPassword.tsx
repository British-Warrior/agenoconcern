import { Link } from "react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { Button } from "../components/ui/Button.js";
import { Alert } from "../components/ui/Alert.js";
import { ROUTES } from "../lib/constants.js";
import { forgotPassword } from "../api/auth.js";
import { ApiResponseError } from "../api/client.js";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Forgot Password — Age No Concern";
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-6">
          Reset your password
        </h1>

        {submitted ? (
          <>
            <Alert variant="success" className="mb-6">
              If an account with that email exists, we&rsquo;ve sent a reset
              link. Check your inbox.
            </Alert>
            <p className="text-center text-base text-neutral-600">
              <Link
                to={ROUTES.LOGIN}
                className="text-primary-800 font-medium hover:text-primary-700 underline"
              >
                Back to login
              </Link>
            </p>
          </>
        ) : (
          <>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}
            <p className="text-base text-neutral-600 mb-4">
              Enter your email address and we&rsquo;ll send you a link to reset
              your password.
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mb-6"
            >
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                Send Reset Link
              </Button>
            </form>
            <p className="text-center text-base text-neutral-600">
              <Link
                to={ROUTES.LOGIN}
                className="text-primary-800 font-medium hover:text-primary-700 underline"
              >
                Back to login
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

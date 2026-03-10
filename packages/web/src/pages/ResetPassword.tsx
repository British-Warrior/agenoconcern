import { Link, useNavigate, useSearchParams } from "react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { Button } from "../components/ui/Button.js";
import { Alert } from "../components/ui/Alert.js";
import { ROUTES } from "../lib/constants.js";
import { resetPassword } from "../api/auth.js";
import { ApiResponseError } from "../api/client.js";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Reset Password — Age No Concern";
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate(ROUTES.LOGIN, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  if (!token) {
    return (
      <div className="flex justify-center py-8">
        <Card className="w-full max-w-md">
          <Alert variant="error">
            Invalid reset link. Please request a new password reset.
          </Alert>
          <p className="text-center text-base text-neutral-600 mt-4">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-primary-800 font-medium hover:text-primary-700 underline"
            >
              Request new reset link
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (password.length < 8) errors.password = "At least 8 characters required";
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(token!, password);
      setSuccess(true);
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
          Set a new password
        </h1>

        {success ? (
          <>
            <Alert variant="success" className="mb-4">
              Password reset successfully. Redirecting to login...
            </Alert>
            <p className="text-center text-base text-neutral-600">
              <Link
                to={ROUTES.LOGIN}
                className="text-primary-800 font-medium hover:text-primary-700 underline"
              >
                Go to login now
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
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mb-6"
            >
              <Input
                label="New password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                helperText="At least 8 characters"
              />
              <Input
                label="Confirm new password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
              />
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                Reset Password
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

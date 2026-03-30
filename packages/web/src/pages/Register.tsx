import { Link, useNavigate } from "react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { Button } from "../components/ui/Button.js";
import { Alert } from "../components/ui/Alert.js";
import { useAuth } from "../hooks/useAuth.js";
import { ROUTES } from "../lib/constants.js";
import { ApiResponseError } from "../api/client.js";

export function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Create Account — Indomitable Unity";
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (password.length < 8) errors.password = "At least 8 characters required";
    if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (!privacyConsent)
      errors.privacy = "You must agree to the Privacy Policy";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate(ROUTES.DASHBOARD, { replace: true });
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
          Create your account
        </h1>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* OAuth buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <a
            href="/api/auth/google"
            className="inline-flex items-center justify-center gap-3 min-h-[3rem] px-6 py-3 text-base font-semibold rounded-[var(--radius-md)] border-2 border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-50 transition-colors no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>
          <a
            href="/api/auth/linkedin"
            className="inline-flex items-center justify-center gap-3 min-h-[3rem] px-6 py-3 text-base font-semibold rounded-[var(--radius-md)] border-2 border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-50 transition-colors no-underline"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#0A66C2" d="M20.47 2H3.53A1.45 1.45 0 002.06 3.43v17.14A1.45 1.45 0 003.53 22h16.94a1.45 1.45 0 001.47-1.43V3.43A1.45 1.45 0 0020.47 2zM8.09 18.74h-3v-9h3v9zM6.59 8.48a1.56 1.56 0 110-3.12 1.56 1.56 0 010 3.12zM18.91 18.74h-3v-4.38c0-1.05-.02-2.38-1.45-2.38-1.45 0-1.67 1.13-1.67 2.31v4.45h-3v-9h2.88v1.23h.04a3.16 3.16 0 012.85-1.56c3.04 0 3.6 2 3.6 4.61v4.72z" />
            </svg>
            Continue with LinkedIn
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <hr className="flex-1 border-neutral-200" />
          <span className="text-sm text-neutral-500">
            or create account with email
          </span>
          <hr className="flex-1 border-neutral-200" />
        </div>

        {/* Email registration form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <Input
            label="Full name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            helperText="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
          />

          {/* Privacy consent */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="privacy-consent"
              checked={privacyConsent}
              onChange={(e) => setPrivacyConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-neutral-300 text-primary-800 focus-visible:ring-accent-500 cursor-pointer"
              required
            />
            <label
              htmlFor="privacy-consent"
              className="text-base text-neutral-700 cursor-pointer"
            >
              I agree to the{" "}
              <Link
                to={ROUTES.PRIVACY}
                className="text-primary-800 underline hover:text-primary-700"
                target="_blank"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.privacy && (
            <p className="text-sm text-error font-medium" role="alert">
              {fieldErrors.privacy}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-base text-neutral-600">
          Already have an account?{" "}
          <Link
            to={ROUTES.LOGIN}
            className="text-primary-800 font-medium hover:text-primary-700 underline"
          >
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}

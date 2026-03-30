import { useNavigate } from "react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Card } from "../../components/ui/Card.js";
import { Input } from "../../components/ui/Input.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import { usePortalAuth } from "../../hooks/usePortalAuth.js";
import { ApiResponseError } from "../../api/client.js";

export function PortalLogin() {
  const { login, isAuthenticated } = usePortalAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Institution Portal — Indomitable Unity";
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/portal/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/portal/dashboard", { replace: true });
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
    <div className="flex justify-center items-center min-h-screen bg-neutral-50">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-6">
          Institution Portal
        </h1>

        <p className="text-sm text-neutral-600 text-center mb-6">
          Sign in to access your institution's impact dashboard.
        </p>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}

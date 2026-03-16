import { Link, useNavigate } from "react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Card } from "../../components/ui/Card.js";
import { Input } from "../../components/ui/Input.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useRegisterChallenger } from "../../hooks/useChallenger.js";
import { registerChallengerSchema } from "@indomitable-unity/shared";
import { ROUTES } from "../../lib/constants.js";
import { ApiResponseError } from "../../api/client.js";

export function ChallengerRegister() {
  const { isAuthenticated, contributor } = useAuth();
  const navigate = useNavigate();
  const registerMutation = useRegisterChallenger();

  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationType, setOrganisationType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Register Your Organisation — Indomitable Unity";
  }, []);

  useEffect(() => {
    if (isAuthenticated && contributor?.role === "challenger") {
      navigate(ROUTES.CHALLENGER, { replace: true });
    }
  }, [isAuthenticated, contributor, navigate]);

  function validate(): boolean {
    const result = registerChallengerSchema.safeParse({
      contactName,
      email,
      password,
      organisationName,
      organisationType,
    });

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (field && !errors[field]) {
        errors[field] = issue.message;
      }
    }
    setFieldErrors(errors);
    return false;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    try {
      await registerMutation.mutateAsync({
        contactName,
        email,
        password,
        organisationName,
        organisationType,
      });
      navigate(ROUTES.CHALLENGER, { replace: true });
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-2">
          Register Your Organisation
        </h1>
        <p className="text-center text-sm text-neutral-500 mb-6">
          Submit challenges and track progress through your portal
        </p>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
          <Input
            label="Your name"
            type="text"
            required
            autoComplete="name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={fieldErrors.contactName}
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
            label="Organisation name"
            type="text"
            required
            autoComplete="organization"
            value={organisationName}
            onChange={(e) => setOrganisationName(e.target.value)}
            error={fieldErrors.organisationName}
          />
          <Input
            label="Organisation type"
            type="text"
            required
            placeholder="e.g. Charity, SME, NHS Trust, Social Enterprise"
            value={organisationType}
            onChange={(e) => setOrganisationType(e.target.value)}
            error={fieldErrors.organisationType}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={registerMutation.isPending}
          >
            Register Organisation
          </Button>
        </form>

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

import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { Card } from "../../components/ui/Card.js";
import { Input } from "../../components/ui/Input.js";
import { Button } from "../../components/ui/Button.js";
import { Alert } from "../../components/ui/Alert.js";
import { useSubmitChallenge } from "../../hooks/useChallenger.js";
import { submitChallengerChallengeSchema } from "@indomitable-unity/shared";
import { ROUTES } from "../../lib/constants.js";
import { ApiResponseError } from "../../api/client.js";

export function SubmitChallenge() {
  const navigate = useNavigate();
  const submitMutation = useSubmitChallenge();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [domain, setDomain] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState("");
  const [type, setType] = useState<"community" | "premium" | "knowledge_transition">("community");
  const [deadline, setDeadline] = useState("");
  const [circleSize, setCircleSize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Submit a Challenge — Indomitable Unity";
  }, []);

  function parseCsvToArray(csv: string): string[] {
    return csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function validate(): boolean {
    const domainArr = parseCsvToArray(domain);
    const skillsArr = parseCsvToArray(skillsNeeded);
    const circleSizeNum = circleSize ? parseInt(circleSize, 10) : undefined;
    const deadlineValue = deadline ? new Date(deadline).toISOString() : undefined;

    const result = submitChallengerChallengeSchema.safeParse({
      title,
      brief,
      domain: domainArr,
      skillsNeeded: skillsArr,
      type,
      deadline: deadlineValue,
      circleSize: circleSizeNum,
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
    setSuccess(false);

    if (!validate()) return;

    const domainArr = parseCsvToArray(domain);
    const skillsArr = parseCsvToArray(skillsNeeded);
    const circleSizeNum = circleSize ? parseInt(circleSize, 10) : undefined;
    const deadlineValue = deadline ? new Date(deadline).toISOString() : undefined;

    try {
      await submitMutation.mutateAsync({
        title,
        brief,
        domain: domainArr,
        skillsNeeded: skillsArr,
        type,
        deadline: deadlineValue,
        circleSize: circleSizeNum,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate(ROUTES.CHALLENGER);
      }, 1000);
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <Link
        to={ROUTES.CHALLENGER}
        className="text-sm text-primary-800 hover:text-primary-700 underline mb-6 block"
      >
        &larr; Back to Dashboard
      </Link>

      <Card>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Submit a Challenge
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Describe the challenge you need help with. A community manager will
          review it before it goes live.
        </p>

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-6">
            Challenge submitted. Redirecting to your dashboard...
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Title"
            type="text"
            required
            placeholder="A concise name for your challenge"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
          />

          <div>
            <label htmlFor="challenge-brief" className="block text-sm font-medium text-neutral-700 mb-1">
              Brief <span className="text-error">*</span>
            </label>
            <textarea
              id="challenge-brief"
              required
              rows={5}
              placeholder="Describe the challenge in detail — what the problem is, what success looks like, and any constraints."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y min-h-[120px]"
            />
            {fieldErrors.brief && (
              <p className="mt-1 text-sm text-error font-medium" role="alert">
                {fieldErrors.brief}
              </p>
            )}
          </div>

          <Input
            label="Domain(s)"
            type="text"
            required
            placeholder="e.g. Health, Finance, Education (comma-separated)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            error={fieldErrors.domain}
            helperText="Enter one or more domains separated by commas"
          />

          <Input
            label="Skills needed"
            type="text"
            required
            placeholder="e.g. Project management, Data analysis (comma-separated)"
            value={skillsNeeded}
            onChange={(e) => setSkillsNeeded(e.target.value)}
            error={fieldErrors.skillsNeeded}
            helperText="Enter required skills separated by commas"
          />

          <div>
            <label htmlFor="challenge-type" className="block text-sm font-medium text-neutral-700 mb-1">
              Type <span className="text-error">*</span>
            </label>
            <select
              id="challenge-type"
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as "community" | "premium" | "knowledge_transition",
                )
              }
              className="w-full rounded-[var(--radius-md)] border border-neutral-300 px-3 py-2 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="community">Community</option>
              <option value="premium">Premium</option>
              <option value="knowledge_transition">Knowledge Transition</option>
            </select>
            {fieldErrors.type && (
              <p className="mt-1 text-sm text-error font-medium" role="alert">
                {fieldErrors.type}
              </p>
            )}
          </div>

          <Input
            label="Deadline (optional)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            error={fieldErrors.deadline}
          />

          <Input
            label="Circle size (optional)"
            type="number"
            min={3}
            max={7}
            placeholder="3–7 members"
            value={circleSize}
            onChange={(e) => setCircleSize(e.target.value)}
            error={fieldErrors.circleSize}
            helperText="Preferred number of contributors (3–7)"
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitMutation.isPending}
          >
            Submit Challenge
          </Button>

          <p className="text-xs text-neutral-400 text-center">
            Your challenge will be reviewed by a community manager before being
            published.
          </p>
        </form>
      </Card>
    </div>
  );
}

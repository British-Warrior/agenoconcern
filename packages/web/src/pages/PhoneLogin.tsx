import { Link, useNavigate } from "react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { Card } from "../components/ui/Card.js";
import { Input } from "../components/ui/Input.js";
import { Button } from "../components/ui/Button.js";
import { Alert } from "../components/ui/Alert.js";
import { ROUTES } from "../lib/constants.js";
import { sendPhoneCode, verifyPhoneCode } from "../api/auth.js";
import { ApiResponseError } from "../api/client.js";

export function PhoneLogin() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    document.title = "Phone Login — Age No Concern";
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await sendPhoneCode(phoneNumber.trim());
      setSuccess("Code sent to your phone.");
      setStep("code");
      startCooldown();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Failed to send code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await verifyPhoneCode(phoneNumber.trim(), code.trim());
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await sendPhoneCode(phoneNumber.trim());
      setSuccess("Code resent to your phone.");
      startCooldown();
    } catch (err) {
      if (err instanceof ApiResponseError) {
        setError(err.data.error);
      } else {
        setError("Failed to resend code.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-6">
          Sign in with phone number
        </h1>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4">
            {success}
          </Alert>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4 mb-6">
            <Input
              label="Phone number"
              type="tel"
              required
              placeholder="+44 7700 900000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              helperText="UK numbers: enter 07... or +447... format"
              autoComplete="tel"
            />
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Send Code
            </Button>
          </form>
        )}

        {step === "code" && (
          <form
            onSubmit={handleVerifyCode}
            className="flex flex-col gap-4 mb-6"
          >
            <Input
              label="Verification code"
              type="text"
              required
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
            />
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Verify
            </Button>
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-sm text-neutral-500">
                  Resend available in {cooldown}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-base text-primary-800 underline hover:text-primary-700 cursor-pointer bg-transparent border-none p-0"
                >
                  Didn&rsquo;t receive a code? Resend
                </button>
              )}
            </div>
          </form>
        )}

        <p className="text-center text-base text-neutral-600">
          <Link
            to={ROUTES.LOGIN}
            className="text-primary-800 font-medium hover:text-primary-700 underline"
          >
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}

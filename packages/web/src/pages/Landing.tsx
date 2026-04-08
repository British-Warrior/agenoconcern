import { Link } from "react-router";
import { useEffect } from "react";
import { Button } from "../components/ui/Button.js";
import { ROUTES } from "../lib/constants.js";

export function Landing() {
  useEffect(() => {
    document.title = "Indomitable Unity — Deploying Expertise That Hasn't Passed Its Sell-By Date";
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
      <h1 className="text-3xl sm:text-[2.75rem] font-bold text-primary-900 leading-tight max-w-3xl mb-6">
        Deploying Expertise That Hasn&rsquo;t Passed Its Sell-By Date.
      </h1>

      <p className="text-lg text-neutral-700 max-w-2xl mb-4 leading-relaxed">
        You&rsquo;ve spent decades building expertise. The world still needs it.
        Indomitable Unity connects experienced professionals with communities and
        organisations that value what you actually know &mdash; not what year you
        were born.
      </p>

      <p className="text-base text-neutral-600 max-w-2xl mb-10 leading-relaxed">
        No patronising &ldquo;keeping busy&rdquo; schemes. No unpaid
        &ldquo;volunteering&rdquo; dressed up as purpose. Real challenges, real
        impact, real income.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link to={ROUTES.REGISTER}>
          <Button variant="primary" size="lg">
            Upload your CV and start contributing
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-base text-neutral-600">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="text-primary-800 font-medium hover:text-primary-700 underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "react-router";
import { Card } from "../components/ui/Card.js";
import { useAuth } from "../hooks/useAuth.js";
import { useWellbeingDue } from "../hooks/useWellbeing.js";

export function Dashboard() {
  const { contributor } = useAuth();
  const wellbeingDue = useWellbeingDue();

  useEffect(() => {
    document.title = "Dashboard — Indomitable Unity";
  }, []);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">
        Welcome, {contributor?.name}
      </h1>

      {/* Wellbeing check-in nudge banner */}
      {wellbeingDue.data?.due === true && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-primary-200 bg-primary-50 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-primary-900">
              Your wellbeing check-in is due
            </p>
            <p className="text-sm text-primary-700 mt-0.5">
              It takes about 3 minutes and helps us track the positive impact of your contributions.
            </p>
          </div>
          <Link
            to="/wellbeing/checkin"
            className="shrink-0 inline-flex items-center justify-center min-h-[2.5rem] px-5 py-2 rounded-[var(--radius-md)] bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Complete now
          </Link>
        </div>
      )}

      <Card>
        <Link
          to="/challenges"
          className="text-base font-medium text-primary-800 hover:text-primary-700 underline"
        >
          Browse Challenges
        </Link>
      </Card>
    </div>
  );
}

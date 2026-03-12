import { useEffect } from "react";
import { Link } from "react-router";
import { Card } from "../components/ui/Card.js";
import { useAuth } from "../hooks/useAuth.js";

export function Dashboard() {
  const { contributor } = useAuth();

  useEffect(() => {
    document.title = "Dashboard — Age No Concern";
  }, []);

  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">
        Welcome, {contributor?.name}
      </h1>

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

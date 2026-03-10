import { useEffect } from "react";
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
        <p className="text-base text-neutral-700 leading-relaxed">
          Your profile and challenges will appear here.
        </p>
      </Card>
    </div>
  );
}

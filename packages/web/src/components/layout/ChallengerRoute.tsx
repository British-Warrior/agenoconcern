import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { RouteChangeSync } from "../a11y/RouteChangeSync.js";

export function ChallengerRoute() {
  const { isAuthenticated, isLoading, contributor } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <svg
          className="animate-spin h-8 w-8 text-primary-800"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/challenger/register" replace />;
  }

  if (
    contributor?.role !== "challenger" &&
    contributor?.role !== "admin"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <><RouteChangeSync /><Outlet /></>;
}

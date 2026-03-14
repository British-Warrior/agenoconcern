import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, contributor } = useAuth();
  const location = useLocation();

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
    const returnUrl = encodeURIComponent(
      location.pathname + location.search,
    );
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }

  // Redirect onboarding users to CV upload unless already on an onboarding page
  if (contributor?.status === "onboarding" && !location.pathname.startsWith("/onboarding")) {
    return <Navigate to="/onboarding/upload" replace />;
  }

  return <Outlet />;
}

import { Link, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../lib/constants.js";
import { Button } from "../ui/Button.js";
import { useCallback, useState } from "react";
import { NotificationBell } from "./NotificationBell.js";

export function Navbar() {
  const { contributor, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.LANDING);
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate]);

  return (
    <nav className="flex items-center justify-between px-4 sm:px-8 py-4" aria-label="Main navigation">
      <Link
        to={ROUTES.LANDING}
        className="text-xl font-bold text-primary-900 hover:text-primary-700 transition-colors no-underline"
      >
        Age No Concern
      </Link>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Link
              to="/circles"
              className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
            >
              My Circles
            </Link>
            <Link
              to="/impact"
              className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
            >
              My Impact
            </Link>
            <NotificationBell />
            <span className="text-base text-neutral-700">
              {contributor?.name}
            </span>
            <Button
              variant="ghost"
              size="default"
              onClick={handleLogout}
              loading={loggingOut}
            >
              Logout
            </Button>
          </>
        ) : (
          <Link
            to={ROUTES.LOGIN}
            className="text-base font-medium text-primary-800 hover:text-primary-700 transition-colors min-h-[3rem] inline-flex items-center no-underline"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}

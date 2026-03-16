import { Link, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../lib/constants.js";
import { Button } from "../ui/Button.js";
import { useCallback, useState } from "react";
import { NotificationBell } from "./NotificationBell.js";
import { usePushSubscription } from "../../hooks/usePushSubscription.js";
import { useInstallPrompt } from "../../hooks/useInstallPrompt.js";

export function Navbar() {
  const { contributor, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { subscribe, isSubscribed, isSupported } = usePushSubscription();
  const { canInstall, triggerInstall } = useInstallPrompt();

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
        Indomitable Unity
      </Link>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Link
              to={ROUTES.DASHBOARD}
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors no-underline"
            >
              Dashboard
            </Link>
            <Link
              to={ROUTES.CHALLENGES}
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors no-underline"
            >
              Challenges
            </Link>
            <Link
              to={ROUTES.CIRCLES}
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors no-underline"
            >
              My Circles
            </Link>
            <Link
              to={ROUTES.IMPACT}
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors no-underline"
            >
              My Impact
            </Link>
            <Link
              to={ROUTES.WELLBEING_CHECKIN}
              className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors no-underline"
            >
              Wellbeing
            </Link>
            <NotificationBell />
            {isSupported && !isSubscribed && typeof Notification !== "undefined" && Notification.permission !== "denied" && (
              <button
                onClick={subscribe}
                className="text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
              >
                Enable Notifications
              </button>
            )}
            {canInstall && (
              <button
                onClick={triggerInstall}
                className="text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
              >
                Install App
              </button>
            )}
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

import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { ROUTES } from "../../lib/constants.js";
import { Button } from "../ui/Button.js";
import { useCallback, useState } from "react";
import { NotificationBell } from "./NotificationBell.js";
import { usePushSubscription } from "../../hooks/usePushSubscription.js";
import { useInstallPrompt } from "../../hooks/useInstallPrompt.js";
import { useKiosk } from "../../contexts/KioskContext.js";
import { useKioskTimer } from "../../hooks/useKioskTimer.js";
import { KioskWarningOverlay } from "./KioskWarningOverlay.js";

export function Navbar() {
  const { contributor, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const { subscribe, isSubscribed, isSupported } = usePushSubscription();
  const { canInstall, triggerInstall } = useInstallPrompt();
  const { isKiosk } = useKiosk();
  const { showWarning, secondsLeft, dismissWarning, performLogout } =
    useKioskTimer(isKiosk);

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
    <>
      {showWarning && (
        <KioskWarningOverlay
          secondsLeft={secondsLeft}
          onContinue={dismissWarning}
          onEndNow={() => void performLogout()}
        />
      )}
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
              <NavLink
                end
                to={ROUTES.DASHBOARD}
                className={({ isActive }) =>
                  `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                end
                to={ROUTES.CHALLENGES}
                className={({ isActive }) =>
                  `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                }
              >
                Challenges
              </NavLink>
              <NavLink
                end
                to={ROUTES.CIRCLES}
                className={({ isActive }) =>
                  `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                }
              >
                My Circles
              </NavLink>
              <NavLink
                end
                to={ROUTES.IMPACT}
                className={({ isActive }) =>
                  `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                }
              >
                My Impact
              </NavLink>
              <NavLink
                end
                to={ROUTES.WELLBEING_CHECKIN}
                className={({ isActive }) =>
                  `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                }
              >
                Wellbeing
              </NavLink>
              {(contributor?.role === "community_manager" || contributor?.role === "admin") && (
                <NavLink
                  end
                  to="/admin/institutions"
                  className={({ isActive }) =>
                    `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                  }
                >
                  Admin
                </NavLink>
              )}
              {(contributor?.role === "community_manager" || contributor?.role === "admin") && (
                <NavLink
                  end
                  to="/admin/attention"
                  className={({ isActive }) =>
                    `${isKiosk ? "text-base" : "text-sm"} font-medium transition-colors no-underline ${isActive ? "text-primary-900 font-semibold" : "text-neutral-700 hover:text-primary-600"}`
                  }
                >
                  Attention
                </NavLink>
              )}
              <NotificationBell />
              {!isKiosk && isSupported && !isSubscribed && typeof Notification !== "undefined" && Notification.permission !== "denied" && (
                <button
                  type="button"
                  onClick={subscribe}
                  className="text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
                >
                  Enable Notifications
                </button>
              )}
              {!isKiosk && canInstall && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors"
                >
                  Install App
                </button>
              )}
              {isKiosk && (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => void performLogout()}
                  className="text-red-600 hover:text-red-800 font-semibold text-base min-h-[3rem]"
                >
                  End Session
                </Button>
              )}
              <span className="text-base text-neutral-700">
                {contributor?.name}
              </span>
              {!isKiosk && (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={handleLogout}
                  loading={loggingOut}
                >
                  Logout
                </Button>
              )}
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
    </>
  );
}

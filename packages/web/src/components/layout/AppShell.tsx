import { Outlet } from "react-router";
import { Link } from "react-router";
import { Navbar } from "./Navbar.js";
import { ConsentBanner, openCookieSettings } from "../ui/ConsentBanner.js";
import { DevRoleSwitcher } from "../dev/DevRoleSwitcher.js";
import { ROUTES } from "../../lib/constants.js";
import { useKiosk } from "../../contexts/KioskContext.js";
import { RouteChangeSync } from "../a11y/RouteChangeSync.js";

export function AppShell() {
  const { isKiosk } = useKiosk();

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header role="banner" className="border-b border-neutral-200 bg-white">
        <Navbar />
      </header>

      <main
        id="main-content"
        role="main"
        className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8"
      >
        <RouteChangeSync />
        <Outlet />
      </main>

      {!isKiosk && (
        <footer
          role="contentinfo"
          className="border-t border-neutral-200 bg-white px-4 sm:px-8 py-6"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            <Link
              to={ROUTES.PRIVACY}
              className="hover:text-primary-800 transition-colors no-underline"
            >
              Privacy Policy
            </Link>
            <Link
              to={ROUTES.COOKIES}
              className="hover:text-primary-800 transition-colors no-underline"
            >
              Cookie Policy
            </Link>
            <button
              type="button"
              onClick={openCookieSettings}
              className="hover:text-primary-800 transition-colors cursor-pointer bg-transparent border-none text-sm text-neutral-600 p-0"
            >
              Manage Cookies
            </button>
            <span className="ml-auto text-neutral-500">
              &copy; {new Date().getFullYear()} Indomitable Unity
            </span>
          </div>
        </footer>
      )}

      {!isKiosk && <ConsentBanner />}
      {!isKiosk && import.meta.env.DEV && <DevRoleSwitcher />}
    </div>
  );
}

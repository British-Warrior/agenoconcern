import { useEffect } from "react";
import { useLocation } from "react-router";

/**
 * Syncs focus to the main content heading on every SPA route change.
 * Screen readers announce the new page name when focus lands on the <h1>.
 * Returns null — no DOM output.
 */
export function RouteChangeSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: false });
    }
  }, [pathname]);

  return null;
}

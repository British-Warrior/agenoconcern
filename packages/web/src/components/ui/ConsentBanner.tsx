import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEYS } from "../../lib/constants.js";
import { Button } from "./Button.js";

type ConsentChoice = "accepted" | "rejected" | null;

interface ConsentState {
  choice: ConsentChoice;
  analytics: boolean;
  timestamp: string;
}

function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

function storeConsent(choice: "accepted" | "rejected", analytics: boolean) {
  const state: ConsentState = {
    choice,
    analytics,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, JSON.stringify(state));
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    storeConsent("accepted", true);
    setVisible(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    storeConsent("rejected", false);
    setVisible(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    storeConsent(analyticsEnabled ? "accepted" : "rejected", analyticsEnabled);
    setVisible(false);
    setShowPreferences(false);
  }, [analyticsEnabled]);

  // Exposed globally so footer link can reopen
  useEffect(() => {
    const handler = () => {
      const stored = getStoredConsent();
      if (stored) {
        setAnalyticsEnabled(stored.analytics);
      }
      setVisible(true);
    };
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-neutral-200 shadow-lg p-4 sm:p-6"
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-base text-neutral-800 mb-4">
          We use cookies to keep you logged in (essential) and to understand how
          the site is used (analytics, optional). You can change your preferences
          at any time.
        </p>

        {showPreferences && (
          <div className="mb-4 p-4 bg-neutral-50 rounded-[var(--radius-md)] border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-neutral-900">
                  Essential Cookies
                </p>
                <p className="text-sm text-neutral-600">
                  Required for login and security. Cannot be disabled.
                </p>
              </div>
              <span className="text-sm font-medium text-neutral-500">
                Always on
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-900">
                  Analytics Cookies
                </p>
                <p className="text-sm text-neutral-600">
                  Help us understand how the site is used. Off by default.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Enable analytics cookies"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:ring-2 peer-focus:ring-accent-500 rounded-full peer peer-checked:bg-primary-800 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                size="default"
                onClick={handleSavePreferences}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={handleAcceptAll}>
            Accept All
          </Button>
          <Button variant="outline" onClick={handleRejectAll}>
            Reject All
          </Button>
          <button
            type="button"
            onClick={() => setShowPreferences(v => !v)}
            aria-expanded={showPreferences}
            className="text-base text-primary-800 underline hover:text-primary-700 min-h-[3rem] px-2 cursor-pointer"
          >
            {showPreferences ? "Hide Preferences" : "Manage Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helper to open cookie settings from anywhere */
export function openCookieSettings() {
  window.dispatchEvent(new Event("open-cookie-settings"));
}

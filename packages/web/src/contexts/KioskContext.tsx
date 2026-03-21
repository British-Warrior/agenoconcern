import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import React from "react";

// Module-level flag persists across navigations (survives re-renders and route changes)
let _kioskActivated = false;

interface KioskContextValue {
  isKiosk: boolean;
}

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();

  // Read URL param and permanently activate kiosk mode for this session
  useEffect(() => {
    if (searchParams.get("kiosk") === "true") {
      _kioskActivated = true;
    }
  }, [searchParams]);

  // Also check synchronously on first render
  if (searchParams.get("kiosk") === "true") {
    _kioskActivated = true;
  }

  const value: KioskContextValue = {
    isKiosk: _kioskActivated,
  };

  return React.createElement(KioskContext.Provider, { value }, children);
}

export function useKiosk(): KioskContextValue {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error("useKiosk must be used within a KioskProvider");
  }
  return context;
}

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const AnnounceContext = createContext<(msg: string) => void>(() => {});

/**
 * Mounts a single aria-live="polite" region at app root and exposes
 * useAnnounce() to queue messages for screen readers.
 *
 * Uses the clear-then-set pattern (50ms timeout) to force re-announcement
 * when the same message fires twice in a row.
 */
export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((msg: string) => {
    // Clear first to force screen readers to re-read duplicate messages
    setMessage("");
    setTimeout(() => setMessage(msg), 50);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);

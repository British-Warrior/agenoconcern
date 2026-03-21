import { useState, useRef, useEffect, useCallback } from "react";
import { useIdleTimer } from "react-idle-timer";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth.js";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const PROMPT_BEFORE_MS = 60 * 1000; // 60 seconds

interface KioskTimerResult {
  showWarning: boolean;
  secondsLeft: number;
  dismissWarning: () => void;
  performLogout: () => Promise<void>;
}

export function useKioskTimer(enabled: boolean): KioskTimerResult {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    clearCountdown();
    try {
      await logout();
    } catch {
      // Swallow errors — session may already be invalid
    }
    queryClient.clear();
    window.location.href = "/";
  }, [queryClient, clearCountdown]);

  const { reset } = useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: PROMPT_BEFORE_MS,
    disabled: !enabled,
    onPrompt: () => {
      setSecondsLeft(60);
      setShowWarning(true);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onIdle: () => {
      void performLogout();
    },
    throttle: 500,
  });

  const dismissWarning = useCallback(() => {
    clearCountdown();
    setShowWarning(false);
    reset();
  }, [clearCountdown, reset]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      clearCountdown();
    };
  }, [clearCountdown]);

  return { showWarning, secondsLeft, dismissWarning, performLogout };
}

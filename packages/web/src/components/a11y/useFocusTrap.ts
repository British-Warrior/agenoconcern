import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Constrains Tab/Shift-Tab keyboard navigation inside a container when active.
 * Restores focus to the element that was focused when the trap was activated.
 *
 * @param active - When true, tab is trapped inside the container. When false, focus is restored.
 * @returns containerRef - Attach to the container element that should trap focus.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Capture the element that had focus when the trap was activated
    triggerRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (!container) return;

    // Move focus to first focusable child
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      // Re-query on each keydown in case DOM changed (e.g., async content)
      const els = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (els.length === 0) return;

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        // Shift-Tab from first — wrap to last
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        // Tab from last — wrap to first
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the trigger element on deactivation
      triggerRef.current?.focus();
    };
  }, [active]);

  return containerRef;
}

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { useFocusTrap } from "../a11y/useFocusTrap.js";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Shared accessible modal wrapper.
 *
 * Provides: role="dialog", aria-modal, aria-labelledby, Escape-close,
 * backdrop click-close, focus trap (Tab/Shift-Tab containment), and
 * focus restoration to the opening trigger on close.
 *
 * Rendered via createPortal to document.body for correct stacking context.
 */
export function Modal({
  isOpen,
  onClose,
  titleId,
  children,
  className = "",
}: ModalProps) {
  const trapRef = useFocusTrap(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={trapRef as React.RefObject<HTMLDivElement>}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={`relative bg-white rounded-[var(--radius-lg)] shadow-xl w-full max-w-md p-6 ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

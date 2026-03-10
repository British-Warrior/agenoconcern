import type { ReactNode } from "react";

type AlertVariant = "success" | "warning" | "error" | "info";

interface AlertProps {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { bg: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-success-bg border-success",
    text: "text-success",
    icon: "\u2713", // checkmark
  },
  warning: {
    bg: "bg-warning-bg border-warning",
    text: "text-warning",
    icon: "\u26A0", // warning triangle
  },
  error: {
    bg: "bg-error-bg border-error",
    text: "text-error",
    icon: "\u2717", // cross
  },
  info: {
    bg: "bg-info-bg border-info",
    text: "text-info",
    icon: "\u2139", // info circle
  },
};

export function Alert({ variant, children, className = "" }: AlertProps) {
  const styles = variantStyles[variant];
  const role = variant === "error" || variant === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`
        flex items-start gap-3
        border rounded-[var(--radius-md)]
        p-4
        ${styles.bg}
        ${className}
      `.trim()}
    >
      <span
        className={`text-lg font-bold ${styles.text} shrink-0 mt-0.5`}
        aria-hidden="true"
      >
        {styles.icon}
      </span>
      <div className={`text-base ${styles.text}`}>{children}</div>
    </div>
  );
}

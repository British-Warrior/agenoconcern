import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "default" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-800 text-white hover:bg-primary-700 active:bg-primary-900 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
  secondary:
    "bg-neutral-200 text-neutral-900 hover:bg-neutral-300 active:bg-neutral-400 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
  outline:
    "border-2 border-primary-800 text-primary-800 bg-transparent hover:bg-primary-800 hover:text-white active:bg-primary-900 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
  ghost:
    "text-primary-800 bg-transparent hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-[3rem] px-6 py-3 text-base",
  lg: "min-h-[3.5rem] px-8 py-4 text-lg",
};

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-[var(--radius-md)]
        transition-colors duration-150
        cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {loading ? "Loading..." : children}
    </button>
  );
}

import { type InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  id: providedId,
  required,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const describedBy = [
    error ? errorId : null,
    helperText && !error ? helperId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-base font-medium text-neutral-800"
      >
        {label}
        {required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`
          min-h-[3rem] px-4 py-3
          text-base text-neutral-900
          bg-white
          border-2 rounded-[var(--radius-md)]
          transition-colors duration-150
          placeholder:text-neutral-400
          focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
          ${error ? "border-error" : "border-neutral-300 hover:border-neutral-400"}
        `.trim()}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-error font-medium" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

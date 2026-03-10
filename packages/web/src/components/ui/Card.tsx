import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <section
      className={`
        bg-white
        border border-neutral-200
        rounded-[var(--radius-lg)]
        p-6 sm:p-8
        ${className}
      `.trim()}
    >
      {title && (
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

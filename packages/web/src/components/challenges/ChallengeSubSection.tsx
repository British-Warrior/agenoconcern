import * as Collapsible from "@radix-ui/react-collapsible";
import type { ReactNode } from "react";

interface ChallengeSubSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ChallengeSubSection({
  label,
  defaultOpen = true,
  children,
}: ChallengeSubSectionProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger
        className="
          w-full flex items-center justify-between
          py-2 px-0
          text-sm font-semibold text-neutral-700
          hover:text-neutral-900
          transition-colors duration-150
          cursor-pointer bg-transparent border-none text-left
          group
        "
        aria-label={label}
      >
        <span>{label}</span>
        {/* Chevron */}
        <svg
          className="h-4 w-4 text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Collapsible.Trigger>

      <Collapsible.Content className="border-t border-neutral-100 pt-3 pb-2">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

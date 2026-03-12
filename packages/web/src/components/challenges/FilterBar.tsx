import { DOMAIN_TAXONOMY } from "@agenoconcern/shared";
import type { ChallengeType } from "@agenoconcern/shared";

type TimelineFilter = "any" | "this-week" | "this-month";

export interface FilterState {
  domain: string;
  type: "" | ChallengeType;
  timeline: TimelineFilter;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const TYPE_OPTIONS: { label: string; value: "" | ChallengeType }[] = [
  { label: "All", value: "" },
  { label: "Paid", value: "paid" },
  { label: "Free", value: "free" },
];

const TIMELINE_OPTIONS: { label: string; value: TimelineFilter }[] = [
  { label: "Any", value: "any" },
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActive =
    filters.domain !== "" ||
    filters.type !== "" ||
    filters.timeline !== "any";

  const clearAll = () =>
    onChange({ domain: "", type: "", timeline: "any" });

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Row 1: Domain select + clear */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Domain dropdown */}
        <div className="relative">
          <select
            value={filters.domain}
            onChange={(e) => onChange({ ...filters, domain: e.target.value })}
            className="
              appearance-none
              pl-3 pr-8 py-2
              text-sm text-neutral-700
              border border-neutral-300 rounded-[var(--radius-sm)]
              bg-white
              focus:outline-none focus:ring-2 focus:ring-accent-500
              min-h-[2.5rem]
              cursor-pointer
            "
            aria-label="Filter by domain"
          >
            <option value="">All Domains</option>
            {DOMAIN_TAXONOMY.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          {/* Custom chevron */}
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
              className="h-3.5 w-3.5 text-neutral-400"
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
          </div>
        </div>

        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-accent-600 hover:text-accent-500 transition-colors duration-150 ml-auto"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Row 2: Type and Timeline pill chips — horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 flex-nowrap min-w-max">
          {/* Type chips */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter by type">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, type: opt.value })}
                className={`
                  px-3 py-1.5 text-sm rounded-full border transition-colors duration-150 whitespace-nowrap
                  ${
                    filters.type === opt.value
                      ? "bg-accent-600 text-white border-accent-600 font-semibold"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                  }
                `}
                aria-pressed={filters.type === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-neutral-200 self-stretch" aria-hidden="true" />

          {/* Timeline chips */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter by timeline">
            {TIMELINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, timeline: opt.value })}
                className={`
                  px-3 py-1.5 text-sm rounded-full border transition-colors duration-150 whitespace-nowrap
                  ${
                    filters.timeline === opt.value
                      ? "bg-accent-600 text-white border-accent-600 font-semibold"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                  }
                `}
                aria-pressed={filters.timeline === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

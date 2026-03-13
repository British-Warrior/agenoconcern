import { useState } from "react";
import type { TeamComposition } from "@agenoconcern/shared";
import { CircleFormationModal } from "../circles/CircleFormationModal.js";

interface TeamCompositionCardProps {
  composition: TeamComposition;
  index: number;
  challengeId: string;
}

const LABELS: Record<number, { title: string; subtitle: string }> = {
  0: { title: "Composition 1", subtitle: "Best Match" },
  1: { title: "Composition 2", subtitle: "Most Diverse" },
  2: { title: "Composition 3", subtitle: "Balanced" },
};

function ScorePill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-xs font-semibold ${color}`}>{pct}%</span>
      <span className="text-[10px] text-neutral-500">{label}</span>
    </div>
  );
}

export function TeamCompositionCard({ composition, index, challengeId }: TeamCompositionCardProps) {
  const [selected, setSelected] = useState(false);
  const [showFormationModal, setShowFormationModal] = useState(false);

  const label = LABELS[index] ?? {
    title: `Composition ${index + 1}`,
    subtitle: "",
  };

  return (
    <div
      className={`rounded-[var(--radius-lg)] border p-4 transition-all duration-150 ${
        selected
          ? "border-primary-500 bg-primary-50 shadow-sm"
          : "border-neutral-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <span className="text-sm font-semibold text-neutral-900">
            {label.title}
          </span>
          {label.subtitle && (
            <span className="ml-2 text-xs text-neutral-500 font-normal">
              {label.subtitle}
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <ScorePill
            label="Coverage"
            value={composition.coverageScore}
            color="text-green-600"
          />
          <ScorePill
            label="Diversity"
            value={composition.diversityScore}
            color="text-blue-600"
          />
          <ScorePill
            label="Balance"
            value={composition.balanceScore}
            color="text-violet-600"
          />
        </div>
      </div>

      {/* Contributors */}
      <ul className="space-y-2 mb-3">
        {composition.contributors.map((contributor) => (
          <li
            key={contributor.id}
            className="flex items-start gap-2"
          >
            <div className="mt-0.5 w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-neutral-600">
                {contributor.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {contributor.name}
              </p>
              {contributor.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {contributor.skills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="inline-block px-1.5 py-0.5 rounded-full bg-neutral-100 text-[10px] text-neutral-600"
                    >
                      {skill}
                    </span>
                  ))}
                  {contributor.skills.length > 5 && (
                    <span className="inline-block px-1.5 py-0.5 text-[10px] text-neutral-400">
                      +{contributor.skills.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Select button */}
      <button
        type="button"
        onClick={() => setSelected((v) => !v)}
        className={`w-full py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors duration-150 ${
          selected
            ? "bg-primary-600 text-white hover:bg-primary-500"
            : "border border-primary-300 text-primary-700 hover:bg-primary-50"
        }`}
      >
        {selected ? "Selected" : "Select this team"}
      </button>

      {/* Form Circle button — visible only after team is selected */}
      {selected && (
        <button
          type="button"
          onClick={() => setShowFormationModal(true)}
          className="w-full mt-2 py-2 rounded-[var(--radius-md)] text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 transition-colors duration-150"
        >
          Form Circle
        </button>
      )}

      {/* Circle Formation Modal */}
      <CircleFormationModal
        isOpen={showFormationModal}
        onClose={() => setShowFormationModal(false)}
        challengeId={challengeId}
        memberIds={composition.contributors.map((c) => c.id)}
        memberNames={composition.contributors.map((c) => c.name)}
      />
    </div>
  );
}

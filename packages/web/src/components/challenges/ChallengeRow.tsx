import * as Accordion from "@radix-ui/react-accordion";
import type { Challenge } from "@agenoconcern/shared";
import { ChallengeSubSection } from "./ChallengeSubSection.js";
import { InterestButton } from "./InterestButton.js";

interface ChallengeWithInterest extends Challenge {
  myInterest: "active" | "withdrawn" | null;
}

interface ChallengeRowProps {
  challenge: ChallengeWithInterest;
}

export function ChallengeRow({ challenge }: ChallengeRowProps) {
  const isPaid = challenge.type === "paid";

  return (
    <Accordion.Item
      value={challenge.id}
      className="
        bg-white border border-neutral-200
        rounded-[var(--radius-md)]
        overflow-hidden
      "
    >
      {/* Collapsed header */}
      <Accordion.Header>
        <Accordion.Trigger
          className="
            w-full flex items-center justify-between
            px-4 py-4
            text-left
            hover:bg-neutral-50 transition-colors duration-150
            cursor-pointer
            group
          "
        >
          <span className="font-semibold text-base text-neutral-900 pr-4 leading-snug">
            {challenge.title}
          </span>

          <div className="flex items-center gap-3 shrink-0">
            {/* Type badge */}
            <span
              className={`
                inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold
                ${
                  isPaid
                    ? "bg-accent-400 text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                }
              `}
            >
              {isPaid ? "Paid" : "Free"}
            </span>

            {/* Expand chevron */}
            <svg
              className="h-4 w-4 text-neutral-400 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
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
        </Accordion.Trigger>
      </Accordion.Header>

      {/* Expanded content */}
      <Accordion.Content
        className="
          overflow-hidden
          data-[state=open]:animate-slideDown
          data-[state=closed]:animate-slideUp
        "
      >
        <div className="px-4 pb-4 pt-1 space-y-1 border-t border-neutral-100">
          {/* Description */}
          <ChallengeSubSection label="Description" defaultOpen={true}>
            {challenge.brief && (
              <p className="text-sm font-medium text-neutral-800 mb-2">
                {challenge.brief}
              </p>
            )}
            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {challenge.description}
            </p>
          </ChallengeSubSection>

          {/* Skills & Domain */}
          <ChallengeSubSection label="Skills & Domain" defaultOpen={false}>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Domain
                </span>
                <p className="text-sm text-neutral-700 mt-1">{challenge.domain}</p>
              </div>
              {challenge.skillsNeeded.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Skills Needed
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {challenge.skillsNeeded.map((skill) => (
                      <span
                        key={skill}
                        className="
                          inline-block px-2 py-0.5
                          bg-neutral-100 text-neutral-700
                          text-xs rounded-full border border-neutral-200
                        "
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ChallengeSubSection>

          {/* Deadline & Timeline */}
          <ChallengeSubSection label="Deadline & Timeline" defaultOpen={false}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="font-medium">Deadline:</span>
                {challenge.deadline ? (
                  <span>
                    {new Date(challenge.deadline).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-neutral-400">Not set</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="font-medium">Circle size:</span>
                <span>{challenge.circleSize} contributors</span>
              </div>
            </div>
          </ChallengeSubSection>

          {/* Interest */}
          <ChallengeSubSection label="Interest" defaultOpen={true}>
            <InterestButton
              challengeId={challenge.id}
              myInterest={
                challenge.myInterest
                  ? { status: challenge.myInterest, note: null }
                  : null
              }
              interestCount={challenge.interestCount}
            />
          </ChallengeSubSection>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

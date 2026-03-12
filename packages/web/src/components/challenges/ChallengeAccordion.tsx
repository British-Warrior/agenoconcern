import * as Accordion from "@radix-ui/react-accordion";
import type { Challenge } from "@agenoconcern/shared";
import { ChallengeRow } from "./ChallengeRow.js";

interface ChallengeWithInterest extends Challenge {
  myInterest: "active" | "withdrawn" | null;
}

interface ChallengeAccordionProps {
  challenges: ChallengeWithInterest[];
}

export function ChallengeAccordion({ challenges }: ChallengeAccordionProps) {
  return (
    <Accordion.Root
      type="multiple"
      className="flex flex-col gap-2"
    >
      {challenges.map((challenge) => (
        <ChallengeRow key={challenge.id} challenge={challenge} />
      ))}
    </Accordion.Root>
  );
}

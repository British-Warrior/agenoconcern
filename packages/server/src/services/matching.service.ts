import type { TeamComposition } from "@agenoconcern/shared";

type Candidate = {
  id: string;
  name: string;
  skills: string[];
  score: number;
};

/**
 * Score a contributor against a challenge based on skill overlap and domain match.
 * Returns a value 0–100. Match score is internal only — never expose to contributors in feed.
 *
 * Scoring:
 *   - Skill component: (intersecting skills / challenge skills) × 70 (0 if no challenge skills)
 *   - Domain component: 30 if contributor domain preferences include challenge domain, else 0
 */
export function scoreContributorForChallenge(
  contributorSkills: string[],
  contributorDomains: string[],
  challengeSkills: string[],
  challengeDomains: string[],
): number {
  const skillSet = new Set(contributorSkills.map((s) => s.toLowerCase()));
  const skillMatches = challengeSkills.filter((s) => skillSet.has(s.toLowerCase())).length;
  const skillScore =
    challengeSkills.length > 0 ? Math.round((skillMatches / challengeSkills.length) * 70) : 0;

  const contribDomainSet = new Set(contributorDomains.map((d) => d.toLowerCase()));
  const domainMatch = challengeDomains.some((d) => contribDomainSet.has(d.toLowerCase()))
    ? 30
    : 0;

  return Math.min(100, skillScore + domainMatch);
}

/**
 * Generate up to 3 team compositions for a challenge.
 * Compositions:
 *   (a) Top-scoring — highest individual match scores
 *   (b) Coverage-maximising — greedy algorithm to cover the most challenge skills
 *   (c) Balanced — mix of high-score and high-coverage
 *
 * Deduplicates compositions that are completely identical.
 */
export function suggestTeamCompositions(
  candidates: Candidate[],
  challengeSkills: string[],
  circleSize: number,
): TeamComposition[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const topTeam = sorted.slice(0, circleSize);
  const diverseTeam = greedyCoverageTeam(candidates, challengeSkills, circleSize);
  const balancedTeam = balancedMix(sorted, diverseTeam, circleSize);

  const compositions = [
    scoreComposition(topTeam, challengeSkills),
    scoreComposition(diverseTeam, challengeSkills),
    scoreComposition(balancedTeam, challengeSkills),
  ];

  // Deduplicate completely identical compositions
  return compositions.filter(
    (comp, i, arr) => i === 0 || !compositionsMatch(comp, arr[i - 1]!),
  );
}

function greedyCoverageTeam(
  candidates: Candidate[],
  required: string[],
  size: number,
): Candidate[] {
  const covered = new Set<string>();
  const team: Candidate[] = [];
  const remaining = [...candidates];

  while (team.length < size && remaining.length > 0) {
    remaining.sort((a, b) => {
      const aNew = a.skills.filter((s) => !covered.has(s.toLowerCase())).length;
      const bNew = b.skills.filter((s) => !covered.has(s.toLowerCase())).length;
      return bNew - aNew || b.score - a.score;
    });
    const pick = remaining.shift()!;
    team.push(pick);
    pick.skills.forEach((s) => covered.add(s.toLowerCase()));
  }
  return team;
}

function balancedMix(sorted: Candidate[], diverse: Candidate[], size: number): Candidate[] {
  const half = Math.ceil(size / 2);
  const topHalf = sorted.slice(0, half);
  const topIds = new Set(topHalf.map((c) => c.id));
  const diverseFill = diverse.filter((c) => !topIds.has(c.id)).slice(0, size - half);
  return [...topHalf, ...diverseFill];
}

function scoreComposition(team: Candidate[], required: string[]): TeamComposition {
  const allSkills = new Set(team.flatMap((m) => m.skills.map((s) => s.toLowerCase())));
  const requiredLower = required.map((s) => s.toLowerCase());
  const covered = requiredLower.filter((s) => allSkills.has(s)).length;
  const coverageScore =
    required.length > 0 ? Math.round((covered / required.length) * 100) : 100;
  const diversityScore = Math.round(
    (allSkills.size / Math.max(allSkills.size, required.length)) * 100,
  );
  const avgMatchScore = team.length > 0 ? team.reduce((s, m) => s + m.score, 0) / team.length : 0;
  const balanceScore = Math.round(
    coverageScore * 0.5 + diversityScore * 0.3 + avgMatchScore * 0.2,
  );

  return {
    contributors: team,
    diversityScore,
    coverageScore,
    balanceScore,
  };
}

function compositionsMatch(a: TeamComposition, b: TeamComposition): boolean {
  const aIds = new Set(a.contributors.map((c) => c.id));
  const bIds = new Set(b.contributors.map((c) => c.id));
  if (aIds.size !== bIds.size) return false;
  return [...aIds].every((id) => bIds.has(id));
}

export type ChallengeType = "paid" | "free";
export type ChallengeStatus = "draft" | "open" | "closed" | "archived";
export type ChallengeInterestStatus = "active" | "withdrawn";

export interface Challenge {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  brief: string;
  domain: string;
  skillsNeeded: string[];
  type: ChallengeType;
  deadline: string | null;
  circleSize: number;
  status: ChallengeStatus;
  interestCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeInterest {
  id: string;
  challengeId: string;
  contributorId: string;
  status: ChallengeInterestStatus;
  note: string | null;
  matchScore: number | null;
  lastWithdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeFilters {
  domain?: string;
  type?: ChallengeType;
  page?: number;
  limit?: number;
}

export interface TeamComposition {
  contributors: Array<{
    id: string;
    name: string;
    skills: string[];
    score: number;
  }>;
  diversityScore: number;
  coverageScore: number;
  balanceScore: number;
}

export interface ChallengeInterestResponse {
  status: ChallengeInterestStatus;
  activeInterestCount?: number;
  maxCircles?: number;
  cooldownRemainingHours?: number;
}

export interface ChallengeFeedResponse {
  challenges: Array<Challenge & { myInterest: ChallengeInterestStatus | null }>;
  page: number;
  hasMore: boolean;
}

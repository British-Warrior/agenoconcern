import { apiClient } from "./client.js";
import type {
  Challenge,
  ChallengeFeedResponse,
  ChallengeInterestResponse,
  ChallengeFilters,
} from "@agenoconcern/shared";

export interface ChallengeWithInterest extends Challenge {
  myInterest: "active" | "withdrawn" | null;
}

export interface ChallengeDetail extends ChallengeWithInterest {
  myInterestNote?: string | null;
}

export interface ChallengeInterestDetail {
  contributorId: string;
  name: string | null;
  status: "active" | "withdrawn";
  note: string | null;
  matchScore: number | null;
}

export interface ChallengeInterestsResponse {
  interests: ChallengeInterestDetail[];
  total: number;
}

export function getFeed(params: ChallengeFilters): Promise<ChallengeFeedResponse> {
  const query = new URLSearchParams();
  if (params.domain) query.set("domain", params.domain);
  if (params.type) query.set("type", params.type);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiClient<ChallengeFeedResponse>(`/api/challenges${qs ? `?${qs}` : ""}`);
}

export function getChallenge(id: string): Promise<ChallengeDetail> {
  return apiClient<ChallengeDetail>(`/api/challenges/${id}`);
}

export function toggleInterest(
  challengeId: string,
  note?: string,
): Promise<ChallengeInterestResponse> {
  return apiClient<ChallengeInterestResponse>(
    `/api/challenges/${challengeId}/interest`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    },
  );
}

export function getInterests(challengeId: string): Promise<ChallengeInterestsResponse> {
  return apiClient<ChallengeInterestsResponse>(
    `/api/challenges/${challengeId}/interests`,
  );
}

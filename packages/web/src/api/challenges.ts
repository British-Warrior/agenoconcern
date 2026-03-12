import { apiClient } from "./client.js";
import type {
  Challenge,
  ChallengeFeedResponse,
  ChallengeInterestResponse,
  ChallengeFilters,
  TeamComposition,
  CreateChallengeInput,
  UpdateChallengeInput,
} from "@agenoconcern/shared";

export interface ChallengeWithInterest extends Challenge {
  myInterest: "active" | "withdrawn" | null;
}

export interface ChallengeDetail extends ChallengeWithInterest {
  myInterestNote?: string | null;
}

export interface ChallengeInterestDetail {
  id: string;
  name: string | null;
  note: string | null;
  isYou: boolean;
  createdAt: string;
}

export interface ChallengeInterestsResponse {
  interests: ChallengeInterestDetail[];
  count: number;
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

export function createChallenge(data: CreateChallengeInput): Promise<Challenge> {
  return apiClient<Challenge>("/api/challenges", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateChallenge(
  id: string,
  data: UpdateChallengeInput,
): Promise<Challenge> {
  return apiClient<Challenge>(`/api/challenges/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface TeamSuggestionsResponse {
  compositions: TeamComposition[];
}

export function getTeamSuggestions(challengeId: string): Promise<TeamSuggestionsResponse> {
  return apiClient<TeamSuggestionsResponse>(
    `/api/challenges/${challengeId}/team-suggestions`,
  );
}

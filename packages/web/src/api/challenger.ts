import { apiClient } from "./client.js";
import type {
  ChallengerOrg,
  ChallengerPortalChallenge,
  ChallengerPortalChallengeDetail,
  RegisterChallengerInput,
  SubmitChallengerChallengeInput,
} from "@indomitable-unity/shared";

export interface RegisterChallengerResponse {
  contributor: { id: string; name: string; email: string; role: string };
  organisation: { id: string; name: string; organisationType: string };
}

export const challengerApi = {
  register(data: RegisterChallengerInput): Promise<RegisterChallengerResponse> {
    return apiClient<RegisterChallengerResponse>("/api/challenger/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getOrg(): Promise<ChallengerOrg> {
    const res = await apiClient<{ organisation: ChallengerOrg }>("/api/challenger/me");
    return res.organisation;
  },

  async getMyChallenges(): Promise<ChallengerPortalChallenge[]> {
    const res = await apiClient<{ challenges: ChallengerPortalChallenge[] }>("/api/challenger/challenges");
    return res.challenges;
  },

  async getChallengeDetail(id: string): Promise<ChallengerPortalChallengeDetail> {
    const res = await apiClient<{ challenge: ChallengerPortalChallengeDetail }>(
      `/api/challenger/challenges/${id}`,
    );
    return res.challenge;
  },

  async submitChallenge(
    data: SubmitChallengerChallengeInput,
  ): Promise<ChallengerPortalChallenge> {
    const res = await apiClient<{ challenge: ChallengerPortalChallenge }>("/api/challenger/challenges", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.challenge;
  },
};

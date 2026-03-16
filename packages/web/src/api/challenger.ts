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
  org: ChallengerOrg;
}

export const challengerApi = {
  register(data: RegisterChallengerInput): Promise<RegisterChallengerResponse> {
    return apiClient<RegisterChallengerResponse>("/api/challenger/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getOrg(): Promise<ChallengerOrg> {
    return apiClient<ChallengerOrg>("/api/challenger/me");
  },

  getMyChallenges(): Promise<ChallengerPortalChallenge[]> {
    return apiClient<ChallengerPortalChallenge[]>("/api/challenger/challenges");
  },

  getChallengeDetail(id: string): Promise<ChallengerPortalChallengeDetail> {
    return apiClient<ChallengerPortalChallengeDetail>(
      `/api/challenger/challenges/${id}`,
    );
  },

  submitChallenge(
    data: SubmitChallengerChallengeInput,
  ): Promise<ChallengerPortalChallenge> {
    return apiClient<ChallengerPortalChallenge>("/api/challenger/challenges", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

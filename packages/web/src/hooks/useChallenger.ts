import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SubmitChallengerChallengeInput,
  RegisterChallengerInput,
} from "@indomitable-unity/shared";
import { challengerApi } from "../api/challenger.js";

export function useRegisterChallenger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterChallengerInput) =>
      challengerApi.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], { contributor: data.contributor });
    },
  });
}

export function useChallengerOrg() {
  return useQuery({
    queryKey: ["challenger", "org"],
    queryFn: () => challengerApi.getOrg(),
  });
}

export function useMyChallengerChallenges() {
  return useQuery({
    queryKey: ["challenger", "challenges"],
    queryFn: () => challengerApi.getMyChallenges(),
  });
}

export function useChallengeDetail(id: string) {
  return useQuery({
    queryKey: ["challenger", "challenges", id],
    queryFn: () => challengerApi.getChallengeDetail(id),
    enabled: !!id,
  });
}

export function useSubmitChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitChallengerChallengeInput) =>
      challengerApi.submitChallenge(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["challenger", "challenges"] });
    },
  });
}

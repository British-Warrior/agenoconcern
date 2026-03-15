import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ChallengeFilters, CreateChallengeInput, UpdateChallengeInput } from "@indomitable-unity/shared";
import * as challengesApi from "../api/challenges.js";

export function useChallengeFeed(filters: Omit<ChallengeFilters, "page">) {
  return useInfiniteQuery({
    queryKey: ["challenges", "feed", filters],
    queryFn: ({ pageParam }) =>
      challengesApi.getFeed({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useInterestToggle(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => challengesApi.toggleInterest(challengeId, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["challenges", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["challenges", challengeId, "interests"],
      });
    },
  });
}

export function useChallengeInterests(challengeId: string | null) {
  return useQuery({
    queryKey: ["challenges", challengeId, "interests"],
    queryFn: () => challengesApi.getInterests(challengeId!),
    enabled: !!challengeId,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChallengeInput) => challengesApi.createChallenge(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["challenges", "feed"] });
    },
  });
}

export function useUpdateChallenge(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateChallengeInput) =>
      challengesApi.updateChallenge(challengeId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["challenges", "feed"] });
      void queryClient.invalidateQueries({
        queryKey: ["challenges", challengeId],
      });
    },
  });
}

export function useTeamSuggestions(challengeId: string | null) {
  return useQuery({
    queryKey: ["challenges", challengeId, "team-suggestions"],
    queryFn: () => challengesApi.getTeamSuggestions(challengeId!),
    enabled: !!challengeId,
  });
}

/**
 * Returns all feed challenges for the current CM, filtered client-side by createdBy.
 * The server feed does not support a mine= filter, so we fetch all open challenges
 * and filter by contributor id.
 */
export function useMyChallenges(contributorId: string | null) {
  const result = useInfiniteQuery({
    queryKey: ["challenges", "feed", {}],
    queryFn: ({ pageParam }) =>
      challengesApi.getFeed({ page: pageParam as number, limit: 100 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!contributorId,
  });

  const allChallenges = result.data?.pages.flatMap((p) => p.challenges) ?? [];
  const myChallenges = allChallenges.filter(
    (c) => c.createdBy === contributorId,
  );

  return { ...result, myChallenges };
}

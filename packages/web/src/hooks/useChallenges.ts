import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ChallengeFilters } from "@agenoconcern/shared";
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

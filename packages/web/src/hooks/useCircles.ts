import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateCircleInput,
  PostNoteInput,
  SubmitResolutionInput,
  RateResolutionInput,
  SetSocialChannelInput,
} from "@agenoconcern/shared";
import * as circlesApi from "../api/circles.js";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMyCircles() {
  return useQuery({
    queryKey: ["circles"],
    queryFn: () => circlesApi.getMyCircles(),
  });
}

export function useCircleWorkspace(circleId: string | null) {
  return useQuery({
    queryKey: ["circles", circleId],
    queryFn: () => circlesApi.getCircleWorkspace(circleId!),
    enabled: !!circleId,
  });
}

export function useCircleNotes(circleId: string) {
  return useInfiniteQuery({
    queryKey: ["circles", circleId, "notes"],
    queryFn: ({ pageParam }) =>
      circlesApi.getNotes(circleId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useResolution(circleId: string) {
  return useQuery({
    queryKey: ["circles", circleId, "resolution"],
    queryFn: () => circlesApi.getResolution(circleId),
    // 404 means no resolution yet — treat as null data rather than error
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("404")) return false;
      return failureCount < 3;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCircle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCircleInput) => circlesApi.createCircle(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["circles"] });
    },
  });
}

export function usePostNote(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostNoteInput) => circlesApi.postNote(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["circles", circleId, "notes"],
      });
    },
  });
}

export function useAddMember(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributorId: string) =>
      circlesApi.addMember(circleId, contributorId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["circles", circleId] });
    },
  });
}

export function useSetSocialChannel(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SetSocialChannelInput) =>
      circlesApi.setSocialChannel(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["circles", circleId] });
    },
  });
}

export function useSubmitResolution(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitResolutionInput) =>
      circlesApi.submitResolution(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["circles", circleId, "resolution"],
      });
    },
  });
}

export function useUpdateResolution(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitResolutionInput) =>
      circlesApi.updateResolution(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["circles", circleId, "resolution"],
      });
    },
  });
}

export function useRateResolution(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RateResolutionInput) =>
      circlesApi.rateResolution(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["circles", circleId, "resolution"],
      });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as attentionApi from "../api/attention.js";

const ATTENTION_KEY = ["admin", "attention"] as const;
const HISTORY_KEY = ["admin", "attention", "history"] as const;
const TREND_KEY = ["admin", "attention", "trend"] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAttentionFlags() {
  return useQuery({
    queryKey: ATTENTION_KEY,
    queryFn: () => attentionApi.getAttentionFlags(),
  });
}

export function useAttentionHistory() {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => attentionApi.getAttentionHistory(),
  });
}

export function useAttentionTrend() {
  return useQuery({
    queryKey: TREND_KEY,
    queryFn: () => attentionApi.getAttentionTrend(),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useResolveFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, followUpNotes }: { flagId: string; followUpNotes: string }) =>
      attentionApi.resolveFlag(flagId, followUpNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ATTENTION_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

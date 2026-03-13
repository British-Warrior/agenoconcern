import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as paymentsApi from "../api/payments.js";
import type { LogHoursData } from "../api/payments.js";

// ─── Queries ───────────────────────────────────────────────────────────────────

export function useImpactSummary() {
  return useQuery({
    queryKey: ["impact", "summary"],
    queryFn: () => paymentsApi.getImpactSummary(),
  });
}

export function useChallengerImpact() {
  return useQuery({
    queryKey: ["impact", "challenger"],
    queryFn: () => paymentsApi.getChallengerImpact(),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useLogHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LogHoursData) => paymentsApi.logHours(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["impact", "summary"] });
    },
  });
}

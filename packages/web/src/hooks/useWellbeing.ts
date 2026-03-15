import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submitCheckin, getWellbeingDue, getWellbeingHistory } from "../api/wellbeing.js";
import type { WellbeingCheckinInput } from "@agenoconcern/shared";
import { useAuth } from "./useAuth.js";

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Check whether the authenticated contributor is due a wellbeing check-in.
 * Only enabled for active contributors.
 */
export function useWellbeingDue() {
  const { contributor } = useAuth();

  return useQuery({
    queryKey: ["wellbeing-due"],
    queryFn: () => getWellbeingDue(),
    enabled: contributor?.status === "active",
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch the contributor's wellbeing score history (for trajectory charts).
 */
export function useWellbeingHistory() {
  return useQuery({
    queryKey: ["wellbeing-history"],
    queryFn: () => getWellbeingHistory(),
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Submit a wellbeing check-in.
 * Invalidates the wellbeing-due query on success so Dashboard banner clears.
 */
export function useSubmitCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WellbeingCheckinInput) => submitCheckin(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-due"] });
      void queryClient.invalidateQueries({ queryKey: ["wellbeing-history"] });
    },
  });
}

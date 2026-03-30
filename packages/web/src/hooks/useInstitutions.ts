import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateInstitutionInput, UpdateInstitutionInput } from "@indomitable-unity/shared";
import * as adminApi from "../api/admin.js";
import { ApiResponseError } from "../api/client.js";

const INSTITUTIONS_KEY = ["admin", "institutions"] as const;
const CONTRIBUTORS_KEY = ["admin", "contributors"] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useInstitutions() {
  return useQuery({
    queryKey: INSTITUTIONS_KEY,
    queryFn: () => adminApi.getInstitutions(),
  });
}

export function useInstitutionContributors(institutionId: string | null) {
  return useQuery({
    queryKey: ["admin", "institutions", institutionId, "contributors"],
    queryFn: () => adminApi.getInstitutionContributors(institutionId!),
    enabled: !!institutionId,
  });
}

export function useAllContributors() {
  return useQuery({
    queryKey: CONTRIBUTORS_KEY,
    queryFn: () => adminApi.getAllContributors(),
  });
}

export function useDeliveryLogs(institutionId: string | null) {
  return useQuery({
    queryKey: ["admin", "institutions", institutionId, "delivery-logs"],
    queryFn: () => adminApi.fetchDeliveryLogs(institutionId!),
    enabled: !!institutionId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInstitutionInput) => adminApi.createInstitution(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTITUTIONS_KEY });
    },
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInstitutionInput }) =>
      adminApi.updateInstitution(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTITUTIONS_KEY });
    },
  });
}

export function useToggleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.toggleInstitutionActive(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTITUTIONS_KEY });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { reportDeliveryEnabled: boolean; reportCadence: "weekly" | "monthly" | null };
    }) => adminApi.updateSchedule(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTITUTIONS_KEY });
    },
  });
}

// ─── Portal account hooks ──────────────────────────────────────────────────

export function usePortalAccount(institutionId: string | null) {
  return useQuery({
    queryKey: ["admin", "portal-account", institutionId],
    queryFn: () => adminApi.getPortalAccount(institutionId!),
    enabled: !!institutionId,
    retry: (failureCount, error) => {
      // Don't retry on 404 (no account exists)
      if (error instanceof ApiResponseError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useCreatePortalAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ institutionId, email }: { institutionId: string; email: string }) =>
      adminApi.createPortalAccount(institutionId, email),
    onSuccess: (_data, { institutionId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "portal-account", institutionId],
      });
    },
  });
}

export function useSetPortalAccountActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, isActive, institutionId }: { accountId: string; isActive: boolean; institutionId: string }) =>
      adminApi.setPortalAccountActive(accountId, isActive),
    onSuccess: (_data, { institutionId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "portal-account", institutionId],
      });
    },
  });
}

export function useResetPortalPassword() {
  return useMutation({
    mutationFn: (accountId: string) => adminApi.resetPortalPassword(accountId),
  });
}

export function useSetContributorInstitutions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contributorId,
      institutionIds,
    }: {
      contributorId: string;
      institutionIds: string[];
    }) => adminApi.setContributorInstitutions(contributorId, institutionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSTITUTIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: CONTRIBUTORS_KEY });
    },
  });
}

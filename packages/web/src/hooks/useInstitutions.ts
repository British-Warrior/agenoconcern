import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateInstitutionInput, UpdateInstitutionInput } from "@indomitable-unity/shared";
import * as adminApi from "../api/admin.js";

const INSTITUTIONS_KEY = ["admin", "institutions"] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useInstitutions() {
  return useQuery({
    queryKey: INSTITUTIONS_KEY,
    queryFn: () => adminApi.getInstitutions(),
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

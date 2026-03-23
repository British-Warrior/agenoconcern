import { apiClient } from "./client.js";
import type {
  CreateInstitutionInput,
  UpdateInstitutionInput,
} from "@indomitable-unity/shared";

export interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
}

export function getInstitutions(): Promise<Institution[]> {
  return apiClient<Institution[]>("/api/admin/institutions");
}

export function createInstitution(data: CreateInstitutionInput): Promise<Institution> {
  return apiClient<Institution>("/api/admin/institutions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateInstitution(
  id: string,
  data: UpdateInstitutionInput,
): Promise<Institution> {
  return apiClient<Institution>(`/api/admin/institutions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleInstitutionActive(
  id: string,
  isActive: boolean,
): Promise<Institution> {
  return apiClient<Institution>(`/api/admin/institutions/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

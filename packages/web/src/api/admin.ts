import { apiClient } from "./client.js";
import type {
  CreateInstitutionInput,
  UpdateInstitutionInput,
} from "@indomitable-unity/shared";

export interface InstitutionStats {
  contributors: number;
  challenges: number;
  hours: number;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  stats: InstitutionStats | null;
}

export interface InstitutionContributor {
  id: string;
  name: string;
  role: string;
  status: string;
  lastActivity: string | null;
}

export interface ContributorWithInstitutions {
  id: string;
  name: string;
  role: string;
  status: string;
  institutions: { id: string; name: string }[];
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

export function getInstitutionContributors(id: string): Promise<InstitutionContributor[]> {
  return apiClient<InstitutionContributor[]>(`/api/admin/institutions/${id}/contributors`);
}

export function setContributorInstitutions(
  contributorId: string,
  institutionIds: string[],
): Promise<{ contributorId: string; institutions: { id: string; name: string }[] }> {
  return apiClient(`/api/admin/contributors/${contributorId}/institutions`, {
    method: "PUT",
    body: JSON.stringify({ institutionIds }),
  });
}

export function getAllContributors(): Promise<ContributorWithInstitutions[]> {
  return apiClient<ContributorWithInstitutions[]>("/api/admin/contributors");
}

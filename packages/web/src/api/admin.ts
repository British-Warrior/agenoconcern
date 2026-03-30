import { apiClient } from "./client.js";
import { API_BASE_URL } from "../lib/constants.js";
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
  contactEmail: string | null;
  reportDeliveryEnabled: boolean;
  reportCadence: "weekly" | "monthly" | null;
  reportNextRunAt: string | null;
}

export interface DeliveryLog {
  id: string;
  attemptedAt: string;
  status: "sent" | "failed";
  recipientEmail: string;
  errorMessage: string | null;
  attemptNumber: number;
  nextRetryAt: string | null;
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

export function updateSchedule(
  id: string,
  data: { reportDeliveryEnabled: boolean; reportCadence: "weekly" | "monthly" | null },
): Promise<Institution> {
  return apiClient<Institution>(`/api/admin/institutions/${id}/schedule`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryLogs(id: string): Promise<DeliveryLog[]> {
  return apiClient<DeliveryLog[]>(`/api/admin/institutions/${id}/delivery-logs`);
}

// ---------------------------------------------------------------------------
// Portal account management
// ---------------------------------------------------------------------------

export interface PortalAccountInfo {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePortalAccountResult {
  id: string;
  email: string;
  password: string;
}

export async function createPortalAccount(
  institutionId: string,
  email: string,
): Promise<CreatePortalAccountResult> {
  return apiClient<CreatePortalAccountResult>("/api/portal/admin/create-portal-account", {
    method: "POST",
    body: JSON.stringify({ institutionId, email }),
  });
}

export async function getPortalAccount(institutionId: string): Promise<PortalAccountInfo> {
  return apiClient<PortalAccountInfo>(
    `/api/portal/admin/account?institutionId=${encodeURIComponent(institutionId)}`,
  );
}

export async function setPortalAccountActive(
  accountId: string,
  isActive: boolean,
): Promise<PortalAccountInfo> {
  return apiClient<PortalAccountInfo>(`/api/portal/admin/${accountId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function resetPortalPassword(accountId: string): Promise<{ password: string }> {
  return apiClient<{ password: string }>(`/api/portal/admin/${accountId}/reset-password`, {
    method: "POST",
  });
}

export async function downloadInstitutionReport(
  slug: string,
  from?: string,
  to?: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? "?" + params.toString() : "";

  const res = await fetch(
    API_BASE_URL + "/api/admin/institutions/" + slug + "/report.pdf" + query,
    { credentials: "include" },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Report generation failed" }));
    throw new Error((err as { error: string }).error);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "impact-report-" + slug + ".pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

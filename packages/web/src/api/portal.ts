import { API_BASE_URL } from "../lib/constants.js";
import { ApiResponseError } from "./client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortalUser {
  id: string;
  email: string;
  institutionId: string;
  institutionName: string;
}

export interface PortalDashboardData {
  institutionName: string;
  stats: {
    contributors: number;
    challenges: number;
    hours: number;
  };
}

export interface PortalAttentionFlag {
  id: string;
  contributorId: string;
  contributorName: string;
  signalType: string;
  cohortSize: number | null;
  flaggedCount: number | null;
  createdAt: string;
}

interface ApiError {
  error: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Portal-specific refresh (uses /api/portal/refresh, not /api/auth/refresh)
// ---------------------------------------------------------------------------

let isPortalRefreshing = false;
let portalRefreshPromise: Promise<boolean> | null = null;

async function attemptPortalRefresh(): Promise<boolean> {
  if (isPortalRefreshing && portalRefreshPromise) {
    return portalRefreshPromise;
  }

  isPortalRefreshing = true;
  portalRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/portal/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isPortalRefreshing = false;
      portalRefreshPromise = null;
    }
  })();

  return portalRefreshPromise;
}

async function portalApiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  let res = await fetch(url, config);

  // On 401, try to refresh the portal token and retry
  if (res.status === 401 && !path.includes("/portal/refresh")) {
    const refreshed = await attemptPortalRefresh();
    if (refreshed) {
      res = await fetch(url, config);
    }
  }

  if (!res.ok) {
    let errorData: ApiError;
    try {
      errorData = (await res.json()) as ApiError;
    } catch {
      errorData = { error: `Request failed with status ${res.status}` };
    }
    throw new ApiResponseError(res.status, errorData);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Exported API functions
// ---------------------------------------------------------------------------

export async function portalLogin(email: string, password: string): Promise<void> {
  await portalApiClient<{ ok: boolean }>("/api/portal/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function portalLogout(): Promise<void> {
  await portalApiClient<{ ok: boolean }>("/api/portal/logout", {
    method: "POST",
  });
}

export async function getPortalMe(): Promise<PortalUser> {
  return portalApiClient<PortalUser>("/api/portal/me");
}

export async function getPortalDashboard(): Promise<PortalDashboardData> {
  return portalApiClient<PortalDashboardData>("/api/portal/dashboard");
}

export async function downloadPortalReport(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/portal/report.pdf`, {
    credentials: "include",
  });

  if (!res.ok) {
    let errorMsg = "Report generation failed";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "impact-report.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getPortalAttentionFlags(): Promise<PortalAttentionFlag[]> {
  return portalApiClient<PortalAttentionFlag[]>("/api/portal/attention");
}

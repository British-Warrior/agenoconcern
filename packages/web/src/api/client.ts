import { API_BASE_URL } from "../lib/constants.js";

interface ApiError {
  error: string;
  details?: unknown;
}

class ApiResponseError extends Error {
  status: number;
  data: ApiError;

  constructor(status: number, data: ApiError) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : `Request failed with status ${status}`;
    super(msg);
    this.name = "ApiResponseError";
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(
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

  // On 401, try to refresh the token and retry the original request
  if (res.status === 401 && !path.includes("/auth/refresh")) {
    const refreshed = await attemptRefresh();
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

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export { ApiResponseError };

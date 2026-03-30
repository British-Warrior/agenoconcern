import React, {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import * as portalApi from "../api/portal.js";
import type { PortalUser } from "../api/portal.js";
import { ApiResponseError } from "../api/client.js";

export interface PortalAuthContextValue {
  portalUser: PortalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: portalUser,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["portal-me"],
    queryFn: portalApi.getPortalMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      portalApi.portalLogin(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: portalApi.portalLogout,
    onSuccess: () => {
      queryClient.setQueryData(["portal-me"], null);
      queryClient.invalidateQueries({ queryKey: ["portal-me"] });
    },
  });

  const loginFn = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  const logoutFn = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Determine error message (from mutations, not query — 401 from /me is expected)
  let error: string | null = null;
  if (loginMutation.error) {
    error =
      loginMutation.error instanceof ApiResponseError
        ? loginMutation.error.data.error
        : loginMutation.error.message;
  }

  // Suppress 401 query errors (expected when not logged in)
  const hasNonAuthError =
    queryError &&
    !(queryError instanceof ApiResponseError && queryError.status === 401);

  if (hasNonAuthError) {
    error = queryError.message;
  }

  const resolvedPortalUser = portalUser ?? null;
  const isAuthenticated = resolvedPortalUser !== null;

  const value: PortalAuthContextValue = {
    portalUser: resolvedPortalUser,
    isAuthenticated,
    isLoading,
    error,
    login: loginFn,
    logout: logoutFn,
  };

  return React.createElement(PortalAuthContext.Provider, { value }, children);
}

export function usePortalAuthContext(): PortalAuthContextValue {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error("usePortalAuthContext must be used within a PortalAuthProvider");
  }
  return context;
}

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import type { Contributor } from "@agenoconcern/shared";
import * as authApi from "../api/auth.js";
import { ApiResponseError } from "../api/client.js";
import React from "react";

interface AuthContextValue {
  contributor: Contributor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => authApi.register(name, email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const loginFn = useCallback(
    async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    [loginMutation],
  );

  const registerFn = useCallback(
    async (name: string, email: string, password: string) => {
      await registerMutation.mutateAsync({ name, email, password });
    },
    [registerMutation],
  );

  const logoutFn = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Determine error message
  let error: string | null = null;
  if (loginMutation.error) {
    error =
      loginMutation.error instanceof ApiResponseError
        ? loginMutation.error.data.error
        : loginMutation.error.message;
  } else if (registerMutation.error) {
    error =
      registerMutation.error instanceof ApiResponseError
        ? registerMutation.error.data.error
        : registerMutation.error.message;
  }

  // Don't treat 401 from /me as an error — just means not logged in
  const contributor = data?.contributor ?? null;
  const isAuthenticated = contributor !== null;

  // Suppress 401 query errors (expected when not logged in)
  const hasNonAuthError =
    queryError &&
    !(queryError instanceof ApiResponseError && queryError.status === 401);

  if (hasNonAuthError) {
    error = queryError.message;
  }

  const value: AuthContextValue = {
    contributor,
    isAuthenticated,
    isLoading,
    error,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

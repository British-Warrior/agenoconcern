import type { Contributor } from "@agenoconcern/shared";
import { apiClient } from "./client.js";

interface AuthResponse {
  contributor: Contributor;
}

interface MessageResponse {
  message: string;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/me");
}

export async function refreshToken(): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>("/api/auth/refresh", {
    method: "POST",
  });
}

export async function forgotPassword(
  email: string,
): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function sendPhoneCode(
  phoneNumber: string,
): Promise<MessageResponse> {
  return apiClient<MessageResponse>("/api/auth/phone/send", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export async function verifyPhoneCode(
  phoneNumber: string,
  code: string,
): Promise<AuthResponse> {
  return apiClient<AuthResponse>("/api/auth/phone/verify", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, code }),
  });
}

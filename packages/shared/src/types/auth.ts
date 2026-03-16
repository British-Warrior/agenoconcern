export type AuthProvider = "email" | "google" | "linkedin" | "phone" | "cm_created";

export type ContributorRole = "contributor" | "community_manager" | "admin" | "challenger";

export type ContributorStatus = "onboarding" | "active" | "paused" | "inactive";

export interface TokenPayload {
  sub: string;
  role: ContributorRole;
  type?: "access" | "refresh";
}

export interface OAuthProfile {
  provider: AuthProvider;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  rawProfile?: Record<string, unknown>;
}

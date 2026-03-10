import type { AuthProvider, ContributorRole, ContributorStatus } from "./auth.js";

export interface Contributor {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  phoneNumber: string | null;
  authProvider: AuthProvider;
  role: ContributorRole;
  status: ContributorStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

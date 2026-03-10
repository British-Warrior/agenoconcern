// Types
export type {
  AuthProvider,
  ContributorRole,
  ContributorStatus,
  TokenPayload,
  OAuthProfile,
} from "./types/auth.js";

export type { Contributor } from "./types/contributor.js";

// Schemas
export {
  registerInputSchema,
  loginInputSchema,
  phoneInputSchema,
  resetPasswordInputSchema,
} from "./schemas/auth.schemas.js";
export type { RegisterInput, LoginInput, PhoneInput, ResetPasswordInput } from "./schemas/auth.schemas.js";

export {
  contributorSchema,
  updateContributorSchema,
} from "./schemas/contributor.schemas.js";
export type { ContributorSchema, UpdateContributorInput } from "./schemas/contributor.schemas.js";

// Constants
export {
  AUTH_PROVIDERS,
  CONTRIBUTOR_ROLES,
  CONTRIBUTOR_STATUSES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  E164_REGEX,
} from "./constants.js";

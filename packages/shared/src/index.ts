// Types
export type {
  AuthProvider,
  ContributorRole,
  ContributorStatus,
  TokenPayload,
  OAuthProfile,
} from "./types/auth.js";

export type { Contributor } from "./types/contributor.js";

export type {
  ContributorProfile,
  CvParseJob,
  ParsedCvData,
  Availability,
  CommChannel,
  CommFrequency,
  StripeStatus,
  CvParseStatus,
} from "./types/profile.js";

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

export {
  updateProfileSchema,
  preferencesSchema,
} from "./schemas/profile.schemas.js";
export type { UpdateProfileInput, PreferencesInput } from "./schemas/profile.schemas.js";

// Constants
export {
  AUTH_PROVIDERS,
  CONTRIBUTOR_ROLES,
  CONTRIBUTOR_STATUSES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  E164_REGEX,
  DOMAIN_TAXONOMY,
} from "./constants.js";

// Challenge types
export type {
  ChallengeType,
  ChallengeStatus,
  ChallengeInterestStatus,
  Challenge,
  ChallengeInterest,
  ChallengeFilters,
  TeamComposition,
  ChallengeInterestResponse,
  ChallengeFeedResponse,
} from "./types/challenge.js";

// Challenge schemas
export {
  createChallengeSchema,
  updateChallengeSchema,
  interestNoteSchema,
} from "./schemas/challenge.js";
export type {
  CreateChallengeInput,
  UpdateChallengeInput,
  InterestNoteInput,
} from "./schemas/challenge.js";

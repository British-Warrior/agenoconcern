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

// Circle types
export type {
  CircleStatus,
  SocialChannel,
  Circle,
  CircleMember,
  CircleNote,
  NoteAttachment,
  CircleResolution,
  ResolutionRating,
  CircleMemberWithName,
  CircleNoteWithAuthorAndAttachments,
  CircleWorkspaceResponse,
  CircleListItem,
  CreateCircleInput,
  PostNoteInput,
  SubmitResolutionInput,
  RateResolutionInput,
  SetSocialChannelInput,
} from "./types/circle.js";

// Circle schemas
export {
  attachmentSchema,
  attachmentUrlSchema,
  createCircleSchema,
  postNoteSchema,
  submitResolutionSchema,
  rateResolutionSchema,
  setSocialChannelSchema,
} from "./schemas/circle.js";
export type {
  AttachmentInput,
  AttachmentUrlInput,
  CreateCircleInput as CreateCircleSchemaInput,
  PostNoteInput as PostNoteSchemaInput,
  SubmitResolutionInput as SubmitResolutionSchemaInput,
  RateResolutionInput as RateResolutionSchemaInput,
  SetSocialChannelInput as SetSocialChannelSchemaInput,
} from "./schemas/circle.js";

// Payment types
export type {
  PaymentType,
  PaymentStatus,
  PaymentTransaction,
  ContributorHours,
} from "./types/payments.js";

// Payment schemas
export {
  createRetainerSchema,
  chargeStipendSchema,
  createSmeSubscriptionSchema,
  logHoursSchema,
  releaseStipendSchema,
} from "./schemas/payments.js";
export type {
  CreateRetainerInput,
  ChargeStipendInput,
  CreateSmeSubscriptionInput,
  LogHoursInput,
  ReleaseStipendInput,
} from "./schemas/payments.js";

// Impact types
export type {
  ImpactChallenge,
  ImpactEarning,
  ImpactSummary,
  ChallengerChallenge,
  ChallengerImpact,
} from "./types/impact.js";

// Wellbeing types
export type {
  WellbeingCheckinInput,
  WellbeingCheckin,
  WellbeingDueResponse,
  WellbeingTrajectoryPoint,
} from "./types/wellbeing.js";

// Wellbeing schemas
export { wellbeingCheckinSchema } from "./schemas/wellbeing.js";
export type { WellbeingCheckinSchemaInput } from "./schemas/wellbeing.js";

// Notification types
export type {
  NotificationType,
  NotifyCircleActivity,
  Notification,
  NotificationPreferences,
  PushSubscriptionInput,
} from "./types/notifications.js";

// Notification schemas
export {
  pushSubscriptionSchema,
  notificationPreferencesSchema,
} from "./schemas/notifications.js";
export type {
  PushSubscriptionSchemaInput,
  NotificationPreferencesInput,
} from "./schemas/notifications.js";

// Challenger portal types
export type {
  ChallengerOrg,
  ChallengerPortalChallenge,
  ChallengerPortalChallengeDetail,
} from "./types/challenger.js";

// Challenger portal schemas
export {
  registerChallengerSchema,
  submitChallengerChallengeSchema,
} from "./schemas/challenger.js";
export type {
  RegisterChallengerInput,
  SubmitChallengerChallengeInput,
} from "./schemas/challenger.js";

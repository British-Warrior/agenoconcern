import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  smallint,
} from "drizzle-orm/pg-core";

// Enums
export const authProviderEnum = pgEnum("auth_provider", [
  "email",
  "google",
  "linkedin",
  "phone",
  "cm_created",
]);

export const contributorRoleEnum = pgEnum("contributor_role", [
  "contributor",
  "community_manager",
  "admin",
]);

export const contributorStatusEnum = pgEnum("contributor_status", [
  "onboarding",
  "active",
  "paused",
  "inactive",
]);

// Contributors
export const contributors = pgTable("contributors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).unique(),
  username: varchar("username", { length: 100 }).unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).unique(),
  passwordHash: text("password_hash"),
  authProvider: authProviderEnum("auth_provider").notNull(),
  authProviderId: varchar("auth_provider_id", { length: 255 }),
  role: contributorRoleEnum("role").default("contributor").notNull(),
  status: contributorStatusEnum("status").default("onboarding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by"),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// OAuth accounts
export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  profileSnapshot: jsonb("profile_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Onboarding enums
export const availabilityEnum = pgEnum("availability", [
  "full_time",
  "part_time",
  "occasional",
  "project_only",
]);

export const commFrequencyEnum = pgEnum("comm_frequency", [
  "immediate",
  "daily",
  "weekly",
]);

export const commChannelEnum = pgEnum("comm_channel", ["email", "phone", "both"]);

export const stripeStatusEnum = pgEnum("stripe_status", [
  "not_started",
  "pending",
  "complete",
]);

export const cvParseStatusEnum = pgEnum("cv_parse_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

// Contributor profiles
export const contributorProfiles = pgTable("contributor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .unique()
    .references(() => contributors.id, { onDelete: "cascade" }),
  cvS3Key: text("cv_s3_key"),
  cvParseStatus: cvParseStatusEnum("cv_parse_status").default("pending"),
  rolesAndTitles: jsonb("roles_and_titles").$type<string[]>(),
  skills: jsonb("skills").$type<string[]>(),
  qualifications: jsonb("qualifications").$type<string[]>(),
  sectors: jsonb("sectors").$type<string[]>(),
  yearsOfExperience: smallint("years_of_experience"),
  professionalSummary: text("professional_summary"),
  affirmationMessage: text("affirmation_message"),
  availability: availabilityEnum("availability"),
  maxCircles: smallint("max_circles").default(3),
  domainPreferences: jsonb("domain_preferences").$type<string[]>(),
  domainOther: text("domain_other"),
  willingToMentor: boolean("willing_to_mentor").default(false),
  commChannel: commChannelEnum("comm_channel"),
  commFrequency: commFrequencyEnum("comm_frequency"),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeStatus: stripeStatusEnum("stripe_status").default("not_started"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// CV parse jobs
export const cvParseJobs = pgTable("cv_parse_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  status: cvParseStatusEnum("status").default("pending"),
  errorMessage: text("error_message"),
  rawText: text("raw_text"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Consent records
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id, {
    onDelete: "set null",
  }),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  granted: boolean("granted").notNull(),
  policyVersion: varchar("policy_version", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
});

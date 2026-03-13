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
  integer,
  date,
  unique,
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

// Challenge enums
export const challengeTypeEnum = pgEnum("challenge_type", ["paid", "free"]);

export const challengeStatusEnum = pgEnum("challenge_status", [
  "draft",
  "open",
  "closed",
  "archived",
]);

export const challengeInterestStatusEnum = pgEnum("challenge_interest_status", [
  "active",
  "withdrawn",
]);

// Challenges
export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  brief: text("brief").notNull(),
  domain: jsonb("domain").$type<string[]>().notNull().default([]),
  skillsNeeded: jsonb("skills_needed").$type<string[]>().notNull().default([]),
  type: challengeTypeEnum("type").notNull(),
  deadline: date("deadline"),
  circleSize: smallint("circle_size").notNull().default(4),
  status: challengeStatusEnum("status").notNull().default("open"),
  interestCount: integer("interest_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Challenge interests
export const challengeInterests = pgTable(
  "challenge_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "cascade" }),
    status: challengeInterestStatusEnum("status").notNull().default("active"),
    note: text("note"),
    matchScore: smallint("match_score"),
    lastWithdrawnAt: timestamp("last_withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("challenge_interests_unique").on(table.challengeId, table.contributorId)],
);

// Circle enums
export const circleStatusEnum = pgEnum("circle_status", [
  "forming",
  "active",
  "submitted",
  "completed",
  "dissolved",
]);

export const socialChannelEnum = pgEnum("social_channel", [
  "whatsapp",
  "slack",
  "discord",
  "teams",
  "signal",
]);

// Circles
export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  status: circleStatusEnum("status").notNull().default("forming"),
  socialChannel: socialChannelEnum("social_channel"),
  socialChannelUrl: text("social_channel_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Circle members
export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "restrict" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("circle_members_unique").on(table.circleId, table.contributorId)],
);

// Circle notes
export const circleNotes = pgTable("circle_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id")
    .notNull()
    .references(() => circles.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Note attachments
export const noteAttachments = pgTable("note_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  noteId: uuid("note_id")
    .notNull()
    .references(() => circleNotes.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Circle resolutions
export const circleResolutions = pgTable(
  "circle_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "cascade" }),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => contributors.id, { onDelete: "restrict" }),
    problemSummary: text("problem_summary").notNull(),
    recommendations: text("recommendations").notNull(),
    evidence: text("evidence").notNull(),
    dissentingViews: text("dissenting_views"),
    implementationNotes: text("implementation_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("circle_resolutions_unique_circle").on(table.circleId)],
);

// Resolution ratings
export const resolutionRatings = pgTable(
  "resolution_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resolutionId: uuid("resolution_id")
      .notNull()
      .references(() => circleResolutions.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "restrict" }),
    rating: smallint("rating").notNull(),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("resolution_ratings_unique_resolution").on(table.resolutionId)],
);

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

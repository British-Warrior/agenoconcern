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
  "challenger",
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

// Notification preference enum (declared early — used in contributorProfiles)
export const notifyCircleActivityEnum = pgEnum("notify_circle_activity", [
  "immediate",
  "daily_digest",
  "off",
]);

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
  notifyCircleActivity: notifyCircleActivityEnum("notify_circle_activity").default("immediate"),
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
export const challengeTypeEnum = pgEnum("challenge_type", [
  "paid",
  "free",
  "community",
  "premium",
  "knowledge_transition",
]);

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
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
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

// Payment enums
export const paymentTypeEnum = pgEnum("payment_type", [
  "retainer",
  "stipend",
  "sme_subscription",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "held",
  "transferred",
  "failed",
  "refunded",
]);

// Payment transactions
export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  challengeId: uuid("challenge_id")
    .references(() => challenges.id, { onDelete: "restrict" }),
  circleId: uuid("circle_id")
    .references(() => circles.id, { onDelete: "restrict" }),
  paymentType: paymentTypeEnum("payment_type").notNull(),
  status: paymentStatusEnum("status").notNull().default("held"),
  amountPence: integer("amount_pence").notNull(),
  totalAmountPence: integer("total_amount_pence").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("gbp"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).unique(),
  transferredAt: timestamp("transferred_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "challenge_match",
  "circle_formed",
  "circle_activity",
  "wellbeing_reminder",
  "resolution_feedback",
  "payment_received",
]);

// Push subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Wellbeing check-ins
export const wellbeingCheckins = pgTable("wellbeing_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  consentRecordId: uuid("consent_record_id")
    .notNull()
    .references(() => consentRecords.id),
  // UCLA Loneliness Scale 3-item (each 1-4: never/rarely/sometimes/often)
  uclaItem1: smallint("ucla_item1").notNull(),
  uclaItem2: smallint("ucla_item2").notNull(),
  uclaItem3: smallint("ucla_item3").notNull(),
  uclaScore: smallint("ucla_score").notNull(),
  // SWEMWBS 7-item (each 1-5: none/rarely/some/often/all)
  wemwbsItem1: smallint("wemwbs_item1").notNull(),
  wemwbsItem2: smallint("wemwbs_item2").notNull(),
  wemwbsItem3: smallint("wemwbs_item3").notNull(),
  wemwbsItem4: smallint("wemwbs_item4").notNull(),
  wemwbsItem5: smallint("wemwbs_item5").notNull(),
  wemwbsItem6: smallint("wemwbs_item6").notNull(),
  wemwbsItem7: smallint("wemwbs_item7").notNull(),
  wemwbsScore: smallint("wemwbs_score").notNull(),
  institutionalReporting: boolean("institutional_reporting"),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// API keys (VANTAGE authentication)
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => contributors.id, { onDelete: "set null" }),
});

// Challenger organisations
export const challengerOrganisations = pgTable("challenger_organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  contributorId: uuid("contributor_id").references(() => contributors.id, { onDelete: "cascade" }),
  organisationType: varchar("organisation_type", { length: 100 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Institutions (library, community centre kiosk landing pages)
export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description").notNull().default(""),
  city: varchar("city", { length: 100 }),
  statsJson: jsonb("stats_json").$type<{ contributors: number; challenges: number; hours: number }>().default({ contributors: 0, challenges: 0, hours: 0 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Contributor institutions (many-to-many junction)
export const contributorInstitutions = pgTable(
  "contributor_institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => contributors.id, { onDelete: "set null" }),
  },
  (table) => [unique("contributor_institutions_unique").on(table.contributorId, table.institutionId)],
);

// iThink webhook enum
export const ithinkSignalTypeEnum = pgEnum("ithink_signal_type", ["attention_flag"]);

// Webhook deliveries (idempotency log for all incoming webhook events)
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: varchar("delivery_id", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 50 }).notNull().default("ithink"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// iThink attention flags (one row per processed signal)
export const ithinkAttentionFlags = pgTable("ithink_attention_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  deliveryId: varchar("delivery_id", { length: 255 }).notNull().unique(),
  signalType: ithinkSignalTypeEnum("signal_type").notNull(),
  cohortSize: integer("cohort_size"),
  flaggedCount: integer("flagged_count"),
  clearedBy: uuid("cleared_by").references(() => contributors.id, { onDelete: "set null" }),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  followUpNotes: text("follow_up_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Contributor hours
export const contributorHours = pgTable(
  "contributor_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "restrict" }),
    circleId: uuid("circle_id")
      .notNull()
      .references(() => circles.id, { onDelete: "restrict" }),
    hoursLogged: smallint("hours_logged").notNull(),
    description: text("description"),
    isPaid: boolean("is_paid").notNull().default(false),
    loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("contributor_hours_unique").on(table.contributorId, table.circleId, table.loggedAt),
  ],
);

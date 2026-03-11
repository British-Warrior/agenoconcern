// Auth providers
export const AUTH_PROVIDERS = ["email", "google", "linkedin", "phone", "cm_created"] as const;

// Contributor roles
export const CONTRIBUTOR_ROLES = ["contributor", "community_manager", "admin"] as const;

// Contributor statuses
export const CONTRIBUTOR_STATUSES = ["onboarding", "active", "paused", "inactive"] as const;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Phone number E.164 pattern
export const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// Domain taxonomy (fixed list; free-text "Other" handled in UI)
export const DOMAIN_TAXONOMY = [
  "Education",
  "Healthcare",
  "Technology",
  "Engineering",
  "Finance",
  "Legal",
  "Arts & Culture",
  "Social Care",
  "Environment",
  "Business Strategy",
  "Public Sector",
  "Charity & Non-Profit",
  "Manufacturing",
  "Construction",
  "Transport & Logistics",
  "Media & Communications",
] as const;

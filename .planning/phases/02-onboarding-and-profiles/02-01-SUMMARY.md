---
phase: 02-onboarding-and-profiles
plan: 01
subsystem: api
tags: [drizzle, postgres, s3, openai, stripe, multer, tesseract, pdf-parse, mammoth, zod]

# Dependency graph
requires:
  - phase: 01-foundation-and-auth
    provides: contributors table, authMiddleware, getDb, getEnv, shared types pattern

provides:
  - contributorProfiles and cvParseJobs DB tables with enums
  - S3 presigned upload URL generation and object download
  - CV text extraction from PDF, DOCX, TXT and OCR from images
  - OpenAI structured output CV parsing (gpt-4o-mini)
  - Stripe Connect Express account creation and onboarding links
  - Full /api/onboarding/* route surface (10 endpoints)
  - Shared profile types and Zod schemas
  - DOMAIN_TAXONOMY constant (16 domains)

affects:
  - 02-02-onboarding-frontend
  - 02-03-profile-management
  - 05-matching
  - 06-wellbeing

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-s3 + @aws-sdk/s3-request-presigner (S3 presigned URLs)"
    - "multer (multipart form data for image upload)"
    - "pdf-parse v2 (PDFParse class API)"
    - "mammoth (DOCX text extraction)"
    - "tesseract.js (OCR)"
    - "openai (structured output via chat.completions.parse + zodResponseFormat)"
    - "stripe (Connect Express)"
  patterns:
    - "Lazy external client instantiation (throw 'X not configured' when env vars absent)"
    - "Fire-and-forget async job processing with DB status polling"
    - "ensureProfile upsert-once helper for profile creation"
    - "Zod schemas in shared package for API contract validation"

key-files:
  created:
    - packages/server/src/services/s3.service.ts
    - packages/server/src/services/cv.service.ts
    - packages/server/src/services/llm.service.ts
    - packages/server/src/services/stripe.service.ts
    - packages/server/src/routes/onboarding.ts
    - packages/shared/src/types/profile.ts
    - packages/shared/src/schemas/profile.schemas.ts
    - packages/server/drizzle/0000_early_living_lightning.sql
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/config/env.ts
    - packages/server/src/express-app.ts
    - packages/shared/src/constants.ts
    - packages/shared/src/index.ts

key-decisions:
  - "pdf-parse v2 uses PDFParse class with { data: buffer } (not old default function)"
  - "OpenAI structured output uses client.chat.completions.parse (not client.beta.chat)"
  - "CV parsing is fire-and-forget; frontend polls /parse-status/:jobId"
  - "Stripe Connect skippable; both /stripe/skip and /preferences completion set status to active"
  - "DOMAIN_TAXONOMY fixed array in shared constants; free-text Other in UI only"
  - "Image OCR goes through server (multer); direct file uploads go via S3 presigned URLs"

patterns-established:
  - "External service pattern: lazy client, throw 'X not configured' when missing, return 501 at route level"
  - "Async job pattern: insert job row -> fire-and-forget async -> update status -> client polls"

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 2 Plan 1: Onboarding Backend Summary

**S3 presigned upload, async LLM CV parsing pipeline, and Stripe Connect with 10 /api/onboarding endpoints backed by contributorProfiles and cvParseJobs tables**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T10:41:25Z
- **Completed:** 2026-03-11T10:46:34Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added contributorProfiles and cvParseJobs tables with 5 new enums (availability, commFrequency, commChannel, stripeStatus, cvParseStatus) and generated Drizzle migration
- Built complete CV processing pipeline: S3 presigned PUT -> browser upload -> start-parse -> fire-and-forget extraction (PDF/DOCX/TXT) + LLM parse -> poll status
- Implemented all 10 onboarding endpoints including profile CRUD, preferences (transitions to active), and Stripe Connect with skip option

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema, shared types, env config, and domain taxonomy** - `dc5f425` (feat)
2. **Task 2: Backend services and onboarding API routes** - `126cf13` (feat)

## Files Created/Modified

- `packages/server/src/db/schema.ts` - Added availabilityEnum, commFrequencyEnum, commChannelEnum, stripeStatusEnum, cvParseStatusEnum, contributorProfiles table, cvParseJobs table
- `packages/server/src/config/env.ts` - Added AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, OPENAI_API_KEY, STRIPE_SECRET_KEY
- `packages/shared/src/types/profile.ts` - ContributorProfile, CvParseJob, ParsedCvData, and union type exports
- `packages/shared/src/schemas/profile.schemas.ts` - updateProfileSchema, preferencesSchema
- `packages/shared/src/constants.ts` - DOMAIN_TAXONOMY (16 domains)
- `packages/shared/src/index.ts` - Re-exports for new types, schemas, constants
- `packages/server/src/services/s3.service.ts` - generateUploadUrl (presigned PUT, 5 min expiry), getObjectBuffer
- `packages/server/src/services/cv.service.ts` - extractText (PDF/DOCX/TXT, 15s timeout), ocrImage (Tesseract), 8000 char truncation
- `packages/server/src/services/llm.service.ts` - parseCvText via OpenAI gpt-4o-mini structured output
- `packages/server/src/services/stripe.service.ts` - createConnectAccount, createAccountLink, getAccountStatus
- `packages/server/src/routes/onboarding.ts` - 10 endpoints: upload-url, upload-image, start-parse, parse-status/:jobId, GET/PUT profile, PUT preferences, stripe/connect, stripe/return, stripe/skip
- `packages/server/src/express-app.ts` - Mounted onboardingRoutes at /api/onboarding
- `packages/server/drizzle/0000_early_living_lightning.sql` - Migration for all 6 tables

## Decisions Made

- pdf-parse v2 has a class-based API (`new PDFParse({ data: buffer }).getText()`) rather than the old default-export function - updated accordingly
- OpenAI structured output uses `client.chat.completions.parse` (available on base completions, not beta.chat as I first assumed)
- CV parse job runs fire-and-forget with DB-backed status polling; client polls `/parse-status/:jobId` every few seconds
- Stripe Connect is skippable via `/stripe/skip`; both this endpoint and `/preferences` transition contributor status to `active`
- DOMAIN_TAXONOMY is a fixed `as const` array; "Other" is a free-text field at the UI/DB level only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pdf-parse v2 API incompatibility**
- **Found during:** Task 2 (CV service implementation)
- **Issue:** Plan referenced old pdf-parse API (`pdfParse(buffer)`) but installed version is v2 which uses `new PDFParse({ data: buffer }).getText()`
- **Fix:** Updated cv.service.ts to use PDFParse class API with `{ data: buffer }` constructor parameter
- **Files modified:** packages/server/src/services/cv.service.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 126cf13 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed OpenAI structured output API path**
- **Found during:** Task 2 (LLM service implementation)
- **Issue:** Plan specified `client.beta.chat.completions.parse` but beta namespace only contains assistants/realtime in this version; structured output parse is on `client.chat.completions.parse`
- **Fix:** Changed to `client.chat.completions.parse`
- **Files modified:** packages/server/src/services/llm.service.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** 126cf13 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 x Rule 1 - library API mismatch)
**Impact on plan:** Both fixes were necessary for compilation correctness. No scope creep.

## Issues Encountered

- pnpm workspace must be used instead of npm for installing packages (workspace:* protocol)

## User Setup Required

External services require manual configuration before the API endpoints become functional:

**AWS S3 (CV file storage):**
- `AWS_REGION` - AWS region (e.g. eu-west-2)
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key
- `S3_BUCKET` - S3 bucket name (create with CORS allowing PUT from localhost:5173)

**OpenAI (CV parsing):**
- `OPENAI_API_KEY` - OpenAI API key

**Stripe (Connect):**
- `STRIPE_SECRET_KEY` - Stripe secret key (test key for development)

All endpoints degrade gracefully with HTTP 501 when env vars are missing, consistent with the existing auth service pattern.

## Next Phase Readiness

- All backend API endpoints are in place for Plans 02 and 03 (frontend onboarding flow)
- DB migration file generated and ready to apply with `pnpm db:migrate`
- Shared types and Zod schemas published from shared package for use in web frontend

## Self-Check: PASSED

All created files verified present on disk. Both task commits (dc5f425, 126cf13) confirmed in git log.

---
*Phase: 02-onboarding-and-profiles*
*Completed: 2026-03-11*

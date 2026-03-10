---
phase: 01-foundation-and-auth
plan: 03
subsystem: auth
tags: [argon2, jose, jwt, arctic, oauth, google, linkedin, twilio, sms, resend, express, cookies]

requires:
  - phase: 01-01
    provides: "Drizzle schema (contributors, passwordResetTokens, oauthAccounts), env config, shared Zod schemas"
  - phase: 01-02
    provides: "Express app, auth middleware, error handler"
provides:
  - Complete auth service with email/password, OAuth, SMS, password reset, CM account creation
  - JWT session management with httpOnly cookies (15min access, 7day refresh)
  - Auth routes mounted at /api/auth/*
  - Database seed script for admin bootstrapping
affects: [01-04, 02-onboarding, 03-circles]

tech-stack:
  added: []
  patterns: [argon2id-password-hashing, jose-jwt-hs256, arctic-v3-oauth, httponly-cookie-sessions, graceful-service-degradation, uk-phone-normalisation]

key-files:
  created:
    - packages/server/src/services/auth.service.ts
    - packages/server/src/routes/auth.ts
    - packages/server/src/db/seed.ts
  modified:
    - packages/server/src/express-app.ts
    - packages/server/package.json

key-decisions:
  - "OAuth redirect URIs use http://localhost:PORT pattern, not CLIENT_URL manipulation"
  - "All external services (OAuth, Twilio, Resend) degrade gracefully with 501 responses"
  - "Combined all auth code into single service and routes file rather than splitting by auth type"

patterns-established:
  - "Graceful degradation: check env vars at request time, return 501 with helpful message if unconfigured"
  - "AuthError class with statusCode for structured error handling in routes"
  - "OAuth state stored in httpOnly cookies (10min TTL) for callback validation"
  - "UK phone normalisation: 07... -> +447... before E.164 validation"
  - "CM account creation returns plaintext password once for printing"

duration: 11min
completed: 2026-03-10
---

# Phase 1 Plan 3: Auth Backend Summary

**Three-path auth system (email/password, Google/LinkedIn OAuth, phone/SMS) with JWT httpOnly cookie sessions, password reset, CM account creation, and graceful service degradation**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-10T13:08:22Z
- **Completed:** 2026-03-10T13:19:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Complete auth service with argon2 password hashing, jose JWT tokens (HS256), and httpOnly cookie session management
- Google OAuth with PKCE and LinkedIn OAuth without PKCE using Arctic v3, with graceful 501 when unconfigured
- Phone/SMS auth via Twilio Verify, password reset via Resend email, and CM-assisted account creation with printable credentials
- Idempotent admin seed script for bootstrapping Kirk's account

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth service, email/password, JWT sessions, OAuth, SMS, password reset, CM creation** - `1517456` (feat)
2. **Task 3: Database seed script** - `a09932e` (feat)
3. **Fix: OAuth redirect URIs** - `d79b0f0` (fix)

## Files Created/Modified
- `packages/server/src/services/auth.service.ts` - Auth business logic: register, login, createTokens, verifyToken, setAuthCookies, clearAuthCookies, findOrCreateOAuthContributor, findOrCreatePhoneContributor, createPasswordResetToken, resetPassword, createAccountForContributor, normaliseUKPhone
- `packages/server/src/routes/auth.ts` - All auth endpoints: register, login, refresh, logout, /me, Google/LinkedIn OAuth initiation + callbacks, phone send/verify, forgot-password, reset-password, create-account
- `packages/server/src/db/seed.ts` - Idempotent admin seed script
- `packages/server/src/express-app.ts` - Added auth route mounting
- `packages/server/package.json` - Added db:seed script and @types/express-serve-static-core

## Decisions Made
- Used auth middleware from 01-02 (already created) rather than creating a duplicate
- OAuth redirect URIs constructed from `http://localhost:${PORT}` rather than manipulating CLIENT_URL
- All three auth path implementations in a single service/routes pair for simplicity at this scale
- Twilio and Resend imported dynamically (lazy) so missing packages don't crash startup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed OAuth redirect URI construction**
- **Found during:** Task 2 verification
- **Issue:** Redirect URIs used fragile `CLIENT_URL.replace(":5173", ":3000")` pattern which would break with non-default ports
- **Fix:** Changed to `http://localhost:${env.PORT}/api/auth/callback/*`
- **Files modified:** packages/server/src/routes/auth.ts
- **Committed in:** d79b0f0

**2. [Rule 3 - Blocking] Added @types/express-serve-static-core dependency**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** pnpm strict mode caused TS2742 error - inferred types couldn't be named without the transitive type dependency
- **Fix:** Added @types/express-serve-static-core as dev dependency
- **Files modified:** packages/server/package.json, pnpm-lock.yaml
- **Committed in:** 1517456 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed TypeScript circular reference in username generation**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `candidate` variable had implicit `any` type due to circular reference with `username`
- **Fix:** Added explicit `: string` type annotation
- **Files modified:** packages/server/src/services/auth.service.ts
- **Committed in:** 1517456 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for correctness and compilation. No scope creep.

## Issues Encountered
None

## User Setup Required

External services require manual configuration before the auth endpoints will work fully:

- **Google OAuth:** Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (Google Cloud Console)
- **LinkedIn OAuth:** Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET (LinkedIn Developer Portal)
- **Twilio SMS:** Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
- **Resend Email:** Set RESEND_API_KEY

Without these, endpoints return 501 with helpful messages. Email/password auth works without any external config.

## Next Phase Readiness
- All AUTH-01 through AUTH-06 backend requirements satisfied
- Ready for Plan 01-04 (web UI auth pages)
- Database migration needed before runtime testing (drizzle-kit push)
- External service env vars needed for OAuth/SMS/email features

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-10*

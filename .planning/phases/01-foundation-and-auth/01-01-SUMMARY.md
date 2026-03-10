---
phase: 01-foundation-and-auth
plan: 01
subsystem: database, infra
tags: [pnpm, monorepo, drizzle, postgresql, zod, typescript, react, vite, tailwind]

requires: []
provides:
  - pnpm monorepo with shared/server/web packages
  - Shared TypeScript types (Contributor, AuthProvider, ContributorRole, ContributorStatus)
  - Zod validation schemas for auth inputs and contributor data
  - Drizzle ORM schema (contributors, passwordResetTokens, oauthAccounts, consentRecords)
  - Lazy PostgreSQL connection pool
  - Zod-validated environment config
affects: [01-02, 01-03, 01-04]

tech-stack:
  added: [pnpm, typescript, zod, drizzle-orm, postgres, express, arctic, argon2, jose, twilio, resend, react, react-dom, react-router, tanstack-react-query, vite, tailwindcss]
  patterns: [pnpm-workspace, shared-source-ts-no-build, zod-validated-env, lazy-db-connection, drizzle-pgEnum]

key-files:
  created:
    - pnpm-workspace.yaml
    - tsconfig.base.json
    - packages/shared/src/index.ts
    - packages/shared/src/types/auth.ts
    - packages/shared/src/types/contributor.ts
    - packages/shared/src/schemas/auth.schemas.ts
    - packages/shared/src/schemas/contributor.schemas.ts
    - packages/shared/src/constants.ts
    - packages/server/src/db/schema.ts
    - packages/server/src/db/index.ts
    - packages/server/src/config/env.ts
    - packages/server/drizzle.config.ts
    - packages/web/vite.config.ts
    - packages/web/index.html
  modified: []

key-decisions:
  - "Shared package consumed as TS source (no build step) via main/types pointing to src/index.ts"
  - "Lazy database connection - does not crash on startup if DB unavailable"
  - "E.164 phone number validation in Zod schemas"

patterns-established:
  - "Workspace dependency: workspace:* in package.json for cross-package imports"
  - "Zod-validated env: all environment variables parsed through Zod schema with dev defaults"
  - "Drizzle pgEnum: enums defined as pgEnum for type-safe database columns"
  - "Shared types re-exported from single index.ts barrel file"

duration: 2min
completed: 2026-03-10
---

# Phase 1 Plan 1: Monorepo Scaffold Summary

**pnpm monorepo with 3 packages, shared Zod/TS types for auth and contributors, and Drizzle schema for 4 PostgreSQL tables**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-10T13:00:35Z
- **Completed:** 2026-03-10T13:03:01Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments
- Working pnpm monorepo with shared, server, and web packages all resolving workspace dependencies
- Shared types and Zod schemas for contributor identity, auth inputs, and validation
- Drizzle schema defining contributors, passwordResetTokens, oauthAccounts, and consentRecords tables with proper enums
- Zod-validated environment config with sensible dev defaults for all 14 env vars

## Task Commits

Each task was committed atomically:

1. **Task 1: Monorepo scaffold, shared types, and environment config** - `692676c` (feat)
2. **Task 2: Drizzle database schema and connection** - `b644737` (feat)

## Files Created/Modified
- `package.json` - Root workspace config with dev/build/db scripts
- `pnpm-workspace.yaml` - Workspace package resolution
- `tsconfig.base.json` - Base TS config with ES2022/Node16/strict
- `.gitignore` - Standard ignores for node_modules, dist, env, drizzle meta
- `.env.example` - All 14 environment variables documented
- `packages/shared/src/types/auth.ts` - AuthProvider, ContributorRole, ContributorStatus, TokenPayload, OAuthProfile
- `packages/shared/src/types/contributor.ts` - Contributor interface
- `packages/shared/src/schemas/auth.schemas.ts` - Zod schemas for register, login, phone, resetPassword
- `packages/shared/src/schemas/contributor.schemas.ts` - Zod schemas for contributor validation
- `packages/shared/src/constants.ts` - Enum arrays, password constraints, E.164 regex
- `packages/shared/src/index.ts` - Barrel re-exports for all types, schemas, constants
- `packages/server/src/db/schema.ts` - Drizzle schema with 4 tables and 3 enums
- `packages/server/src/db/index.ts` - Lazy PostgreSQL connection pool
- `packages/server/src/config/env.ts` - Zod-validated env loading
- `packages/server/drizzle.config.ts` - Drizzle kit config for migrations
- `packages/web/vite.config.ts` - Vite with React + Tailwind plugins and API proxy
- `packages/web/index.html` - Root HTML with Inter font
- `packages/web/src/main.tsx` - Minimal React entry point

## Decisions Made
- Shared package uses source TypeScript directly (no build step) -- simpler DX for monorepo
- Lazy database connection pattern -- server starts even without DB, enabling gradual setup
- `cm_created` auth provider for community-manager-created accounts (per locked decision)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added minimal web entry point for TypeScript compilation**
- **Found during:** Task 2 (verification step)
- **Issue:** Web package had no source files, causing `tsc --noEmit` to error with TS18003
- **Fix:** Created `packages/web/src/main.tsx` with minimal React root mount
- **Files modified:** packages/web/src/main.tsx
- **Verification:** `tsc --noEmit` passes in web package
- **Committed in:** b644737 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for TypeScript compilation verification. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo foundation complete, all packages compile and resolve
- Ready for Plan 01-02 (Express server skeleton + auth endpoints)
- Database migration can be generated once PostgreSQL is available

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-10*

---
phase: 12-institution-data-foundation
verified: 2026-03-23T11:10:53Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: CM institution management end-to-end flow
    expected: Card grid renders, create/edit/toggle active all work, route guard blocks non-CM
    why_human: Visual layout correctness and interactive state transitions cannot be verified programmatically
  - test: Contributor assignment workflow
    expected: Assign contributor, navigate back, contributor appears in correct institution card
    why_human: Requires live React Query cache invalidation and cross-page state verification
  - test: Public landing page live stats vs no-stats behavior
    expected: Stats grid visible for institution with assigned contributors; stats section entirely absent for institution with zero contributors
    why_human: Conditional rendering depends on runtime API response content
---

# Phase 12: Institution Data Foundation -- Verification Report

**Phase Goal:** The CM can manage institution records and contributor assignments, and institution landing pages display live aggregated stats derived from real contributor data.
**Verified:** 2026-03-23T11:10:53Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | contributor_institutions junction table migration script exists with composite unique constraint and FK indexes | VERIFIED | packages/server/scripts/create-contributor-institutions.mjs -- 73 lines, creates table with CONSTRAINT contributor_institutions_unique UNIQUE and both FK indexes using IF NOT EXISTS |
| 2 | Drizzle schema exports contributorInstitutions with proper FK references | VERIFIED | packages/server/src/db/schema.ts lines 502-516 -- pgTable with contributorId FK cascade, institutionId FK cascade, assignedBy FK set null, unique constraint in third arg array |
| 3 | Zod schemas for institution CRUD and contributor assignment exist in shared package | VERIFIED | packages/shared/src/schemas/institution.ts -- four schemas: createInstitutionSchema, updateInstitutionSchema, toggleActiveSchema, setContributorInstitutionsSchema. All re-exported from index.ts lines 204-207 |
| 4 | CM can view, create, edit, activate/deactivate institutions via admin UI protected by CM role | VERIFIED | admin.ts 458 lines, 7 endpoints, router.use(authMiddleware, requireRole) at top. InstitutionManagement.tsx 530 lines, card grid with all CRUD hooks, inline edit state, confirmation dialog. CMRoute.tsx checks role, redirects to /dashboard. Route in App.tsx under CMRoute. Navbar Admin link conditional on role |
| 5 | Institution landing page displays live contributor count, challenge count, and hours from real queries; stats hidden when no contributors assigned | VERIFIED | institutions.ts fetches contributor IDs from junction table, batch-queries challengeInterests and contributorHours, returns stats as null when memberIds.length===0. statsJson not returned to client. InstitutionLanding.tsx renders stats grid only when data.stats is truthy |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/scripts/create-contributor-institutions.mjs | Junction table migration script | VERIFIED | 73 lines, substantive SQL migration, idempotent IF NOT EXISTS, marks drizzle journal |
| packages/server/src/db/schema.ts | contributorInstitutions Drizzle table definition | VERIFIED | Lines 502-516, proper FK references, unique constraint, exported |
| packages/shared/src/schemas/institution.ts | Zod validation schemas for institution CRUD | VERIFIED | 30 lines, four schemas with correct rules (name min 2 max 200, no slug field) |
| packages/server/src/routes/admin.ts | Institution CRUD and assignment endpoints, all CM-protected | VERIFIED | 458 lines, 7 endpoints, router.use at top, exports adminRouter |
| packages/server/src/routes/institutions.ts | Public endpoint returning live stats | VERIFIED | 88 lines, live aggregation via junction table, null stats when no contributors |
| packages/web/src/components/layout/CMRoute.tsx | Route guard for CM-only pages | VERIFIED | 48 lines, checks community_manager OR admin, redirects to /dashboard |
| packages/web/src/api/admin.ts | Typed API client for admin routes | VERIFIED | 87 lines, 7 typed functions covering all CRUD and assignment operations |
| packages/web/src/hooks/useInstitutions.ts | React Query hooks for institution CRUD | VERIFIED | 81 lines, exports all 7 required hooks with correct query keys and cache invalidation |
| packages/web/src/pages/admin/InstitutionManagement.tsx | CM institution management page | VERIFIED | 530 lines, card grid 1/2/3 cols, inline create/edit via editingId state, toggle confirmation dialog, Unassigned section with View links |
| packages/web/src/pages/admin/ContributorDetail.tsx | Contributor detail with multi-select institution picker | VERIFIED | 174 lines, useParams, checkbox picker pre-populated from current assignments, useSetContributorInstitutions mutation, navigates back on save |
| packages/web/src/pages/institution/InstitutionLanding.tsx | Landing page using live stats | VERIFIED | 144 lines, fetches from /api/institutions/:slug, renders stats grid only when data.stats non-null |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| InstitutionManagement.tsx | useInstitutions.ts | React Query hooks | WIRED | Imports all 6 hooks |
| useInstitutions.ts | api/admin.ts | API client calls | WIRED | import * as adminApi -- all hooks delegate to adminApi functions |
| api/admin.ts | server routes/admin.ts | HTTP fetch to /api/admin/institutions | WIRED | apiClient calls /api/admin/institutions and related paths |
| ContributorDetail.tsx | useInstitutions.ts | useSetContributorInstitutions | WIRED | Imports and calls mutateAsync before navigation |
| InstitutionManagement.tsx | ContributorDetail.tsx | Link to /admin/contributors/:id | WIRED | UnassignedContributors renders Link with contributor id path |
| App.tsx | CMRoute.tsx | Route guard wrapping admin routes | WIRED | CMRoute imported and wraps both admin routes |
| InstitutionLanding.tsx | server routes/institutions.ts | fetch /api/institutions/:slug | WIRED | fetchInstitution calls /api/institutions/slug, response typed with stats field |
| server routes/admin.ts | db/schema.ts | contributorInstitutions junction queries | WIRED | Imports and queries contributorInstitutions in batch stat and assignment endpoints |
| express-app.ts | routes/admin.ts | app.use /api/admin adminRouter | WIRED | Line 77 |
| express-app.ts | routes/institutions.ts | app.use /api/institutions institutionRoutes | WIRED | Line 74 |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| INST-01: CM can view list with name, city, active status | SATISFIED | Card grid renders name, city, active status badge from GET /api/admin/institutions |
| INST-02: CM can create institution with name, description, city | SATISFIED | POST endpoint validated by createInstitutionSchema; inline card form in InstitutionManagement |
| INST-03: CM can edit institution name, description, city | SATISFIED | PUT endpoint validated by updateInstitutionSchema; editingId state enables inline editing |
| INST-04: CM can activate or deactivate institution | SATISFIED | PATCH endpoint with toggleActiveSchema; toggle switch plus confirmation dialog |
| INST-05: CM can assign contributor to institution | SATISFIED | PUT /contributors/:id/institutions transactional; checkbox picker on ContributorDetail |
| INST-06: CM can remove contributor assignment | SATISFIED | Same PUT endpoint with reduced or empty institutionIds removes assignments in transaction |
| INST-07: CM can view contributors for a specific institution | SATISFIED | GET /institutions/:id/contributors; expandable contributor list in institution card |
| INST-08: Landing page displays live aggregated stats not static JSONB | SATISFIED | Live stats from junction table; statsJson preserved in DB but not returned to client |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| packages/web/src/pages/admin/ContributorDetail.tsx | 20, 145, 151 | saved state never set true; success message at line 145 is dead UI | Info | No functional impact -- save works correctly, mutateAsync awaited, navigation back confirms success |

### Human Verification Required

#### 1. CM Institution Management Visual and Interaction Flow

**Test:** Log in as community_manager, navigate to /admin/institutions, verify card grid layout at various viewport widths, create a new institution, edit an existing institution, toggle active/inactive with confirmation dialog.
**Expected:** 1/2/3 column responsive grid; new card appears at top in edit mode; confirmation dialog shows institution name; badge changes after confirmation.
**Why human:** Visual layout correctness, CSS grid behaviour at breakpoints, and interactive state transitions cannot be verified programmatically.

#### 2. Contributor Assignment Round-Trip

**Test:** Navigate to Unassigned section, click View on an unassigned contributor, check two institution checkboxes, click Save Assignments. Navigate back to /admin/institutions, expand both institution cards.
**Expected:** Contributor absent from Unassigned section; contributor name present in both expanded cards; institution card stats show updated contributor count.
**Why human:** Requires live React Query cache invalidation across multiple query keys and cross-page UI consistency.

#### 3. Public Landing Page Live Stats Conditional Display

**Test:** Navigate to /i/{slug} for institution with assigned contributors; then navigate to /i/{slug} for institution with no contributors.
**Expected:** First: stats grid (3 StatCards) visible with real numbers. Second: stats section entirely absent, no zero values shown.
**Why human:** Conditional rendering depends on runtime API response value (stats null vs populated object).

### Gaps Summary

No gaps found. All five phase success criteria are verified in the codebase:

1. The contributor_institutions junction table migration is substantive, idempotent, and the Drizzle schema export matches the SQL schema exactly.
2. All four shared Zod schemas are present, correctly constrained (no slug on create/update), and exported from the shared package.
3. The admin API has all CRUD endpoints protected by requireRole("community_manager") at the router level, mounted at /api/admin.
4. The CM UI is fully wired -- card grid, inline create/edit, toggle confirmation dialog, CMRoute guard, Navbar conditional link, and App.tsx route registration all verified.
5. Contributor assignment is complete end-to-end: server endpoints use the junction table with transaction semantics and empty inArray guards; ContributorDetail.tsx renders a checkbox picker pre-populated from current assignments and calls the PUT endpoint; InstitutionLanding.tsx consumes live stats and hides the stats section when null.

The only notable finding is dead UI in ContributorDetail.tsx -- setSaved(true) is never called so the inline success message is unreachable. Info-level only; the save operation works correctly.

---

_Verified: 2026-03-23T11:10:53Z_
_Verifier: Claude (gsd-verifier)_

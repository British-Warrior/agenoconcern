---
phase: 18-institution-portal
verified: 2026-03-30T09:57:59Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Full portal login flow in browser"
    expected: "Navigate to /portal/login, submit CM-created credentials, redirect to /portal/dashboard showing institution name, stats, PDF button, and attention flags"
    why_human: "End-to-end cookie-based session cannot be verified by static analysis"
  - test: "PDF download triggers file save"
    expected: "Clicking Download PDF causes a file to download without a new tab or error"
    why_human: "Binary blob fetch plus synthetic anchor click requires a live browser"
  - test: "Auth isolation across sessions"
    expected: "Contributor at /portal/dashboard redirects to /portal/login; portal user at /dashboard redirects to /login"
    why_human: "Two-session cookie isolation requires live browser with cookie inspection"
  - test: "No resolve button visible on attention flags"
    expected: "Flags appear in read-only table with no resolve/dismiss control anywhere on the page"
    why_human: "Absence of a UI element requires visual confirmation"
---

# Phase 18: Institution Portal Verification Report

**Phase Goal:** Institution contacts can log in with their own credentials and self-serve their institution stats, PDF, and attention flags without CM involvement.
**Verified:** 2026-03-30T09:57:59Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Institution contact can log in at /portal/login using CM-created credentials | VERIFIED | PortalLogin.tsx calls login() from usePortalAuth; server POST /login validates zod schema, calls portalLogin(), sets cookies |
| 2 | Contributor JWT cannot grant access to portal routes | VERIFIED | portal-auth.ts middleware checks payload.type !== portal — contributor JWTs carry no type field (undefined !== portal rejects them) |
| 3 | Portal JWT cannot grant access to contributor/admin routes | VERIFIED | Contributor authMiddleware reads access_token cookie; portal tokens live in portal_access_token — different cookie names, never overlap |
| 4 | CM can create a portal account via POST /admin/create-portal-account | VERIFIED | Route protected by authMiddleware + requireRole(community_manager), zod-validated, argon2-hashed, unique active-account check with 409, returns plaintext password once |
| 5 | Only one active portal account per institution | VERIFIED | Migration has CREATE UNIQUE INDEX ON institution_portal_accounts (institution_id) WHERE is_active = true; server also enforces 409 in code |
| 6 | Portal user sees read-only dashboard with contributor count, active challenges, and hours | VERIFIED | GET /portal/dashboard queries institution name, contributor IDs, unique challenge count, total hours; PortalDashboard.tsx renders three StatCard components from useQuery(portal-dashboard) |
| 7 | Portal user can download their institution PDF impact report | VERIFIED | GET /portal/report.pdf scoped to req.portalUser.institutionId, calls buildInstitutionReport(reportData), pipes with Content-Type application/pdf; downloadPortalReport() fetches blob, triggers synthetic anchor click |
| 8 | Portal user can view attention flags read-only (no resolve action) | VERIFIED | GET /portal/attention queries ithinkAttentionFlags WHERE institutionId=? AND clearedAt IS NULL; AttentionFlagsCard renders Contributor/Signal Type/Date — no resolve mutation, no resolve endpoint in portal routes |
| 9 | CM can create portal accounts from institution management page | VERIFIED | PortalAccessSection in InstitutionManagement.tsx uses usePortalAccount (shows 404 as create form), useCreatePortalAccount mutation, amber password-once box on success |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Status | L1 Exists | L2 Substantive | L3 Wired |
|----------|--------|-----------|----------------|----------|
| packages/server/migrations/0006_institution_portal_accounts.sql | VERIFIED | YES | 14 lines, CREATE TABLE + partial unique index | Applied; referenced in summary |
| packages/server/src/db/schema.ts (institutionPortalAccounts table) | VERIFIED | YES | Defined at line 571, matches migration | Imported in portal-auth.service.ts and portal-auth.ts routes |
| packages/server/src/services/portal-auth.service.ts | VERIFIED | YES | 133 lines | Imported in portal-auth.ts routes; exports portalLogin createPortalTokens setPortalAuthCookies clearPortalAuthCookies PortalAuthError |
| packages/server/src/middleware/portal-auth.ts | VERIFIED | YES | 55 lines | Imported in portal-dashboard.ts and portal-auth.ts; applied via router.use(portalAuthMiddleware) |
| packages/server/src/routes/portal/portal-auth.ts | VERIFIED | YES | 344 lines | Mounted at /api/portal in express-app.ts; exports portalAuthRoutes |
| packages/server/src/routes/portal/portal-dashboard.ts | VERIFIED | YES | 240 lines | Mounted at /api/portal in express-app.ts; exports portalDashboardRoutes |
| packages/web/src/api/portal.ts | VERIFIED | YES | 167 lines | Imported in PortalAuthContext.tsx and PortalDashboard.tsx |
| packages/web/src/contexts/PortalAuthContext.tsx | VERIFIED | YES | 103 lines | Imported in App.tsx as PortalAuthProvider and in usePortalAuth.ts |
| packages/web/src/hooks/usePortalAuth.ts | VERIFIED | YES | 9 lines (thin re-export) | Imported in InstitutionPortalRoute.tsx PortalLogin.tsx PortalDashboard.tsx |
| packages/web/src/components/layout/InstitutionPortalRoute.tsx | VERIFIED | YES | 41 lines | Used in App.tsx as element for /portal/* route |
| packages/web/src/pages/portal/PortalLogin.tsx | VERIFIED | YES | 88 lines | Used in App.tsx for /portal/login route |
| packages/web/src/pages/portal/PortalDashboard.tsx | VERIFIED | YES | 228 lines | Child route of /portal/* in App.tsx |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| PortalAuthContext.tsx | /api/portal/me | useQuery([portal-me], getPortalMe) | WIRED | queryFn: portalApi.getPortalMe calls /api/portal/me |
| portal.ts | /api/portal/refresh | attemptPortalRefresh() on 401 | WIRED | fetch .../api/portal/refresh POST credentials include with dedup guard |
| portal-auth.ts middleware | req.portalUser | JWT verify + type===portal check | WIRED | payload.type !== portal returns 401; attaches id + institutionId |
| portal-auth.ts routes | portal-auth.service.ts | login handler calls portalLogin() | WIRED | await portalLogin(email, password) + setPortalAuthCookies(res, result.tokens) |
| PortalDashboard.tsx | /api/portal/dashboard | useQuery([portal-dashboard], getPortalDashboard) | WIRED | getPortalDashboard() -> portalApiClient(/api/portal/dashboard) |
| PortalDashboard.tsx | /api/portal/report.pdf | downloadPortalReport() on button click | WIRED | fetch .../api/portal/report.pdf credentials include -> blob -> object URL -> synthetic anchor |
| PortalDashboard.tsx | /api/portal/attention | useQuery([portal-attention], getPortalAttentionFlags) | WIRED | getPortalAttentionFlags() -> portalApiClient(/api/portal/attention) |
| portal-dashboard.ts | buildInstitutionReport | PDF endpoint calls report builder | WIRED | buildInstitutionReport(reportData); doc.pipe(res); doc.end() |
| InstitutionManagement.tsx | PortalAccessSection | Rendered at line 717 | WIRED | PortalAccessSection institutionId={institution.id} inside institution detail panel |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PORTAL-01 | SATISFIED | /portal/login route, PortalLogin form, CM create-portal-account endpoint, PortalAccessSection CM UI |
| PORTAL-02 | SATISFIED | GET /portal/dashboard + three stat cards in PortalDashboard.tsx |
| PORTAL-03 | SATISFIED | GET /portal/report.pdf scoped to portal JWT institutionId; downloadPortalReport() blob fetch |
| PORTAL-04 | SATISFIED | GET /portal/attention returns active flags; AttentionFlagsCard has no resolve button; no resolve endpoint in portal routes |

---

### Anti-Patterns Found

None. Grep across all phase 18 artifacts found no TODO, FIXME, placeholder, or empty-implementation stub patterns.

---

### Human Verification Required

#### 1. Full portal login flow in browser

**Test:** Navigate to /portal/login as an unauthenticated user. Enter credentials created by a CM via Institution Management. Submit.
**Expected:** Redirect to /portal/dashboard showing institution name in header, three stat cards (contributors, challenges, hours), a Download PDF button, and an Attention Flags section.
**Why human:** End-to-end cookie-based session and navigation cannot be verified by static analysis.

#### 2. PDF download triggers file save

**Test:** On the portal dashboard, click Download PDF.
**Expected:** Browser saves a file named impact-report.pdf. No new tab opens. No error appears.
**Why human:** Binary blob fetch and synthetic anchor click require a live browser.

#### 3. Auth isolation across sessions

**Test:** In one browser session, log in as a contributor. In an incognito window, log in as an institution contact. Navigate each to the other protected route.
**Expected:** Contributor navigating to /portal/dashboard is redirected to /portal/login. Institution contact navigating to /dashboard is redirected to /login.
**Why human:** Two-session cookie isolation requires live browser with cookie inspection.

#### 4. No resolve button on attention flags

**Test:** View the Attention Flags section on the portal dashboard for an institution that has active attention flags.
**Expected:** Flags appear in the read-only table with no resolve, dismiss, or clear button anywhere on the page.
**Why human:** Absence of a UI control requires visual confirmation.

---

### Gaps Summary

No gaps found. All 9 observable truths verified against the actual codebase. All 12 artifacts exist, are substantive (well above minimum line counts), and are fully wired. Auth isolation holds through both cookie-name separation (portal tokens in portal_access_token never arrive at contributor middleware reading access_token) and type discriminant (portal-auth.ts middleware rejects any token whose payload.type is not portal). Four items require human browser verification to confirm end-to-end behavior.

---

_Verified: 2026-03-30T09:57:59Z_
_Verifier: Claude (gsd-verifier)_

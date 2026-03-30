---
phase: 18
plan: "02"
subsystem: institution-portal
tags: [portal, dashboard, pdf, attention-flags, admin-ui, react-query]
dependency_graph:
  requires:
    - "packages/server/src/routes/portal/portal-auth.ts (portalAuthMiddleware, admin routes)"
    - "packages/server/src/pdf/institution-report.ts (buildInstitutionReport, ReportData)"
    - "packages/server/src/lib/swemwbs-rasch.ts (rawToMetric, metricToBand)"
    - "packages/web/src/api/portal.ts (portalApiClient — extended)"
    - "packages/web/src/hooks/usePortalAuth.ts (usePortalAuth)"
    - "packages/web/src/components/layout/InstitutionPortalRoute.tsx (Outlet-based guard)"
  provides:
    - "GET /api/portal/dashboard — institution stats for portal user"
    - "GET /api/portal/report.pdf — branded PDF download for portal user"
    - "GET /api/portal/attention — read-only active flags for portal user"
    - "GET /api/portal/admin/account — CM lookup for active portal account by institutionId"
    - "PortalDashboard page at /portal/dashboard"
    - "PortalAccessSection in InstitutionManagement (CM creates/manages portal accounts)"
  affects:
    - "packages/server/src/express-app.ts (portalDashboardRoutes mounted)"
    - "packages/web/src/App.tsx (dashboard route added to portal route tree)"
tech_stack:
  added: []
  patterns:
    - "Binary fetch with credentials for PDF download (raw fetch, not portalApiClient)"
    - "useQuery retry: false on 404 for portal account lookup (no account = expected 404)"
    - "k=5 anonymity wellbeing band check reused in portal PDF endpoint"
    - "PortalAccessSection reads from usePortalAccount — shows create form if 404"
key_files:
  created:
    - packages/server/src/routes/portal/portal-dashboard.ts
    - packages/web/src/pages/portal/PortalDashboard.tsx
  modified:
    - packages/server/src/routes/portal/portal-auth.ts
    - packages/server/src/express-app.ts
    - packages/web/src/api/portal.ts
    - packages/web/src/api/admin.ts
    - packages/web/src/hooks/useInstitutions.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/App.tsx
decisions:
  - "Portal PDF endpoint uses all-time data (no date filtering) — institution portal is simpler than admin view"
  - "Portal account lookup uses 404 to signal no account (not a null response) — hook disables retry on 404"
  - "PortalAccessSection shows create form when 404 returned, switches to management UI once account exists"
  - "PDF download uses raw fetch (not portalApiClient) because response is binary blob, not JSON"
metrics:
  duration: "~30 min"
  completed: "2026-03-30"
  commits: 2
---

# Phase 18 Plan 02: Portal Dashboard & CM Account Management Summary

Portal dashboard built end-to-end: three server endpoints (stats, PDF, attention flags) scoped via portal JWT, a full-page PortalDashboard React component with stat cards/PDF download/read-only flag table, and a PortalAccessSection in InstitutionManagement for CM-side portal account creation/deactivation/password reset.

## What Was Built

### Server Side

**`portal-dashboard.ts`** — Router with `portalAuthMiddleware` applied to all routes:
- `GET /dashboard` — looks up institution name, sums contributors/unique challenges/hours, returns zeros when no assignments (no 422)
- `GET /report.pdf` — returns 422 when no contributors assigned; otherwise runs full wellbeing band query (k=5, consent-filtered, Rasch-scored, modal band with Typical tie-break) and streams PDF via `buildInstitutionReport`
- `GET /attention` — queries `ithinkAttentionFlags` where `institutionId = req.portalUser.institutionId AND clearedAt IS NULL`, joined with contributors for name, ordered by `createdAt DESC`

**`portal-auth.ts` addition** — `GET /admin/account` CM-only endpoint: looks up active portal account by `institutionId` query param, returns 404 if none (frontend uses this to decide whether to show create form or management UI).

**`express-app.ts`** — `portalDashboardRoutes` mounted at `/api/portal` alongside existing `portalAuthRoutes`.

### Frontend

**`api/portal.ts` additions:**
- `PortalDashboardData` and `PortalAttentionFlag` types
- `getPortalDashboard()` — GET /api/portal/dashboard via portalApiClient
- `downloadPortalReport()` — raw fetch with credentials (binary blob), creates object URL, clicks synthetic anchor, revokes URL
- `getPortalAttentionFlags()` — GET /api/portal/attention via portalApiClient

**`PortalDashboard.tsx`** — Full-page layout with navy header (institution name + "Institution Portal" label + logout button):
- Three stat cards in responsive grid (Contributors, Active Challenges, Hours Contributed) with large number + label
- Impact Report card with "Download PDF" button, loading spinner during fetch, error display
- Attention Flags card: table with Contributor, Signal Type, Date columns; "No active attention flags" message when empty; no resolve buttons

**`App.tsx`** — `<Route path="dashboard" element={<PortalDashboard />} />` added as child of the `/portal/*` route (renders via `InstitutionPortalRoute`'s `<Outlet />`).

**`api/admin.ts` additions:** `PortalAccountInfo`, `CreatePortalAccountResult` types; `createPortalAccount`, `getPortalAccount`, `setPortalAccountActive`, `resetPortalPassword` functions.

**`useInstitutions.ts` additions:** `usePortalAccount` (retry: false on 404), `useCreatePortalAccount`, `useSetPortalAccountActive`, `useResetPortalPassword`.

**`InstitutionManagement.tsx` addition — `PortalAccessSection` component:**
- When `usePortalAccount` returns 404: shows "No portal account" message + email input + "Create" button
- On create success: shows generated password in amber highlighted box with copy button and "save this now" warning
- When account exists: shows email + active badge + "Reset Password" + "Deactivate/Activate" inline buttons
- Password reset also shows the new password in the same amber box

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 61be84a | feat(18-02): portal dashboard, PDF, and attention flag endpoints |
| 05b8d17 | feat(18-02): portal dashboard page, CM portal account UI, and App routing |

## Self-Check: PASSED

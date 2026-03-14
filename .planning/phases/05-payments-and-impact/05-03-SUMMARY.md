---
phase: 05-payments-and-impact
plan: "03"
subsystem: impact-dashboard
tags: [react, impact, dashboard, frontend]
dependency_graph:
  requires: ["05-02"]
  provides: ["impact-dashboard", "challenger-view", "nav-integration"]
  affects: ["App.tsx", "Navbar.tsx", "ProtectedRoute.tsx"]
tech_stack:
  added: []
  patterns:
    - "Intl.NumberFormat for GBP currency formatting"
    - "Inline form toggle for hours logging"
    - "Onboarding guard in ProtectedRoute covers all protected routes"
key_files:
  created:
    - packages/web/src/api/payments.ts
    - packages/web/src/hooks/useImpact.ts
    - packages/web/src/pages/impact/ImpactDashboard.tsx
    - packages/web/src/pages/impact/ChallengerView.tsx
  modified:
    - packages/web/src/App.tsx
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/components/layout/ProtectedRoute.tsx
decisions:
  - id: "05-03-A"
    decision: "Onboarding guard moved from DashboardOrOnboarding wrapper into ProtectedRoute"
    rationale: "All protected routes (not just dashboard) should redirect onboarding users to /onboarding/upload — prevents empty-state pages for users who haven't completed setup"
    alternatives: ["per-route wrapper components"]
metrics:
  duration: "~12 min"
  completed: "2026-03-14"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 5 Plan 3: Impact Dashboard Frontend Summary

**One-liner:** Contributor impact dashboard (5 sections), challenger view, API hooks, nav link, and onboarding guard for all protected routes.

## What Was Built

### Impact Dashboard (`packages/web/src/pages/impact/ImpactDashboard.tsx`)

Five sections matching IMPT-01 through IMPT-05:

| Section | Requirement | Content |
|---------|-------------|---------|
| Challenges Participated | IMPT-01 | List with domain badges and status indicators |
| Hours Contributed | IMPT-02 | Total with paid/unpaid breakdown, inline Log Hours form |
| Earnings | IMPT-03 | GBP formatted via Intl.NumberFormat, recent earnings list with type badges |
| Unpaid Contribution Recognised | IMPT-04 | Prominent hours display with affirming language |
| Wellbeing Trajectory | IMPT-05 | Coming Soon placeholder with muted styling |

### Challenger View (`packages/web/src/pages/impact/ChallengerView.tsx`)

Cards per challenge showing resolution summary (truncated to 200 chars) and rating display.

### API & Hooks

- `packages/web/src/api/payments.ts` — getImpactSummary, getChallengerImpact, logHours
- `packages/web/src/hooks/useImpact.ts` — useImpactSummary, useChallengerImpact, useLogHours

### Navigation & Routing

- Routes `/impact` and `/impact/challenger` added to App.tsx
- "My Impact" nav link added to Navbar after "My Circles"

### Onboarding Guard Fix

- Moved onboarding redirect from `DashboardOrOnboarding` wrapper into `ProtectedRoute`
- All protected routes now redirect onboarding users to `/onboarding/upload`
- Onboarding pages excluded from redirect

## Commits

| Hash | Message |
|------|---------|
| `2c9dc39` | feat(05-03): add impact API client and React Query hooks |
| `133e6fe` | feat(05-03): add impact dashboard pages, routing, and navigation |
| `7d45a2c` | fix(05-03): redirect onboarding users from all protected routes |

## Deviations from Plan

### Human Verification Feedback

**Onboarding guard was too narrow:** User navigated to /impact while status was "onboarding" and saw empty dashboard instead of being redirected. Fixed by moving the onboarding check into ProtectedRoute so it covers all protected routes uniformly.

## Self-Check: PASSED

All created files present. All commits verified. Human verification approved.

---
*Phase: 05-payments-and-impact*
*Completed: 2026-03-14*

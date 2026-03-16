# Roadmap: Indomitable Unity

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-15)
- 🚧 **v1.1 Pilot-Ready** — Phases 7-11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-15</summary>

- [x] Phase 1: Foundation and Auth (4/4 plans) — completed 2026-03-10
- [x] Phase 2: Onboarding and Profiles (3/3 plans) — completed 2026-03-11
- [x] Phase 3: Challenges and Matching (3/3 plans) — completed 2026-03-12
- [x] Phase 4: Circles and Collaboration (3/3 plans) — completed 2026-03-13
- [x] Phase 5: Payments and Impact (3/3 plans) — completed 2026-03-14
- [x] Phase 6: Wellbeing, Notifications, and PWA (3/3 plans) — completed 2026-03-15

</details>

### 🚧 v1.1 Pilot-Ready (In Progress)

**Milestone Goal:** Make the platform usable for real pilot deployment — fix critical UX issues, enable VANTAGE AI overlay, add kiosk mode for institutional embedding, and give challengers their own portal.

- [x] **Phase 7: UX Fixes** (3/3 plans) — completed 2026-03-16
- [x] **Phase 8: Wellbeing Visualisation** (1/1 plans) — completed 2026-03-16
- [x] **Phase 9: Server Foundation and VANTAGE** (2/2 plans) — completed 2026-03-16
- [ ] **Phase 10: Challenger Portal** (0/2 plans) — Organisation accounts, challenge submission, status tracking, resolution rating
- [ ] **Phase 11: Kiosk Mode and Institutional Pages** — Institutional embedding with auto-logout and per-institution landing pages

## Phase Details

### Phase 7: UX Fixes

**Goal:** The platform is navigable, readable, and credible for institutional demos — no stranded users, no empty screens, no broken affordances.
**Depends on:** Nothing (all fixes use existing APIs and components)
**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11
**Success Criteria** (what must be TRUE):
  1. User can reach dashboard, challenges, circles, impact, and logout from every authenticated page without typing a URL
  2. Dashboard shows active circles, open challenge matches, earnings summary, hours contributed, and wellbeing check-in status on first load
  3. CM sees their created circles on the circles page with role-appropriate actions (no contributor-specific copy)
  4. All interactive cards, buttons, and links respond visually to hover and show pointer cursor
  5. Error messages, circle formation member names, and resolution edit button states are accurate and human-readable
**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md — Navigation links + route constants + hover affordances
- [x] 07-02-PLAN.md — Dashboard summary cards + wellbeing score interpretation
- [x] 07-03-PLAN.md — CM role-conditional circles + error sanitisation + isolated bugs

### Phase 8: Wellbeing Visualisation

**Goal:** Wellbeing data is interpretable and funder-ready — contributors see trend, context, and UK benchmarks rather than raw numbers.
**Depends on:** Phase 7 (stable impact dashboard as baseline)
**Requirements:** WELL-01, WELL-02, WELL-03
**Success Criteria** (what must be TRUE):
  1. Impact dashboard shows SWEMWBS and UCLA scores as a multi-series line chart across all historical check-ins
  2. Chart includes a visible UK population benchmark line for SWEMWBS
  3. Each score displays its band label (low / average / high per UK norms) alongside the numeric value
  4. An accessible data table of the same wellbeing scores is present for screen reader users
**Plans:** 1 plan

Plans:
- [x] 08-01-PLAN.md — Install recharts, build WellbeingChart component, integrate into ImpactDashboard

### Phase 9: Server Foundation and VANTAGE

**Goal:** VANTAGE can call the platform's REST API with a secure API key, and the codebase has the type and schema foundation needed to build the challenger portal.
**Depends on:** Phase 7 (clean codebase baseline)
**Requirements:** VANT-01, VANT-02, VANT-03, VANT-04
**Success Criteria** (what must be TRUE):
  1. VANTAGE can authenticate requests using an X-API-Key header without touching the cookie auth path
  2. API keys are stored as SHA-256 hashes; the raw key is shown exactly once at creation
  3. Requests to VANTAGE endpoints beyond the configured rate limit receive a 429 response
  4. A VANTAGE-CONTRACT.md document lists every consumed endpoint with request and response shapes
  5. The `challenger_organisations` table and `challenger` role enum value exist in the database via a named Drizzle migration
**Plans:** 2 plans

Plans:
- [x] 09-01-PLAN.md — Schema changes (challenger enum, api_keys table, challenger_organisations table) + Drizzle migration
- [x] 09-02-PLAN.md — API key middleware + rate limiter + VANTAGE routes + contract document

### Phase 10: Challenger Portal

**Goal:** Organisations can self-service submit challenges, track their progress, and rate completed resolutions — without requiring CM manual intake.
**Depends on:** Phase 9 (challenger role enum and organisations table must exist)
**Requirements:** CHAL-01, CHAL-02, CHAL-03, CHAL-04, CHAL-05, CHAL-06
**Success Criteria** (what must be TRUE):
  1. An organisation can register an account with name, email, and organisation type and receive a challenger session
  2. A logged-in challenger can submit a challenge brief and see it appear in CM review queue with "draft" status
  3. A challenger can view the current status of each of their submitted challenges (draft, open, closed, archived)
  4. A challenger can view the circle formed on their challenge, including member count and circle status
  5. A challenger can submit a rating and feedback on a completed resolution
**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md — Schema migration + shared types + challenger server routes
- [ ] 10-02-PLAN.md — React challenger portal pages, hooks, API client, and routing

### Phase 11: Kiosk Mode and Institutional Pages

**Goal:** The platform is safely embeddable in libraries and community centres — shared computers auto-clean sessions, and each institution has a public entry point.
**Depends on:** Phase 9 (challenger_organisations table provides pattern for Institution entity; Phase 10 not required), Phase 7 (clean AppShell baseline)
**Requirements:** KIOSK-01, KIOSK-02, KIOSK-03, KIOSK-04, INST-01, INST-02, INST-03
**Success Criteria** (what must be TRUE):
  1. Visiting `?kiosk=true` activates simplified UI with larger buttons and no install or notification prompts
  2. After 10 minutes of inactivity a 60-second countdown appears, then the session ends — server cookies and React Query cache are both cleared
  3. An "End Session" button is visible in the kiosk navigation at all times
  4. Each institution has a public page at `/i/[slug]` showing its name, description, and local impact stats
  5. Navigating from an institutional landing page auto-activates kiosk mode
**Plans:** TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Auth | v1.0 | 4/4 | Complete | 2026-03-10 |
| 2. Onboarding and Profiles | v1.0 | 3/3 | Complete | 2026-03-11 |
| 3. Challenges and Matching | v1.0 | 3/3 | Complete | 2026-03-12 |
| 4. Circles and Collaboration | v1.0 | 3/3 | Complete | 2026-03-13 |
| 5. Payments and Impact | v1.0 | 3/3 | Complete | 2026-03-14 |
| 6. Wellbeing, Notifications, and PWA | v1.0 | 3/3 | Complete | 2026-03-15 |
| 7. UX Fixes | v1.1 | 3/3 | Complete | 2026-03-16 |
| 8. Wellbeing Visualisation | v1.1 | 1/1 | Complete | 2026-03-16 |
| 9. Server Foundation and VANTAGE | v1.1 | 2/2 | Complete | 2026-03-16 |
| 10. Challenger Portal | v1.1 | 0/2 | Not started | - |
| 11. Kiosk Mode and Institutional Pages | v1.1 | 0/TBD | Not started | - |

---
*Full v1.0 details archived in milestones/v1.0-ROADMAP.md*
*v1.1 roadmap created: 2026-03-16*

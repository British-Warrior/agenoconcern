# Roadmap: Indomitable Unity

## Milestones

- [x] **v1.0 MVP** — Phases 1-6 (shipped 2026-03-15)
- [x] **v1.1 Pilot-Ready** — Phases 7-11 (shipped 2026-03-21)
- [x] **v1.2 Institution Management & iThink Integration** — Phases 12-15 (shipped 2026-03-24)
- **v1.3 Enhanced Reporting & Institution Portal** — Phases 16-18 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-15</summary>

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Pilot-Ready (Phases 7-11) — SHIPPED 2026-03-21</summary>

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Institution Management & iThink Integration (Phases 12-15) — SHIPPED 2026-03-24</summary>

See: `.planning/milestones/v1.2-ROADMAP.md`

</details>

---

### v1.3 Enhanced Reporting & Institution Portal (In Progress)

**Milestone Goal:** CM sees richer analytics in the dashboard and PDF; reports deliver themselves on a schedule; institution contacts have their own read-only portal.

#### Phase 16: Wellbeing & Attention Analytics

**Goal:** The CM dashboard and PDF impact report surface anonymised wellbeing bands and attention trend data derived from real contributor metrics.
**Depends on:** Phase 15 (PDF infrastructure, attention dashboard)
**Requirements:** WELL-01, WELL-02, WELL-03, WELL-04, ATTN-05, ATTN-06
**Success Criteria** (what must be TRUE):
  1. The PDF impact report displays a wellbeing band (low/typical/high) when the institution has at least k opted-in contributors with check-ins, and shows no band when below threshold
  2. The wellbeing band is derived from Rasch-transformed SWEMWBS scores, not raw sums
  3. Only contributors who have consented to the `institutional_reporting` purpose are counted toward the wellbeing band
  4. The attention dashboard shows a trend direction indicator (increasing/stable/decreasing) beside each institution's flag count
  5. The CM can open a weekly trend chart of attention flag counts for any institution
**Plans:** 2 plans

Plans:
- [ ] 16-01-PLAN.md — Wellbeing aggregation service: DB migration, Rasch utility, consent checkbox, wellbeing band query, PDF extension
- [ ] 16-02-PLAN.md — Attention trend API endpoint, trend chart component, dashboard integration with indicator and Trends tab

#### Phase 17: Scheduled Report Delivery

**Goal:** PDF impact reports are emailed automatically on a CM-configured schedule, with every attempt logged and failures retried.
**Depends on:** Phase 16 (complete PDF content)
**Requirements:** SCHED-01, SCHED-02, SCHED-03, SCHED-04
**Success Criteria** (what must be TRUE):
  1. A CM can toggle automatic PDF delivery on or off for any institution and choose weekly or monthly cadence
  2. When delivery is enabled, the PDF is automatically emailed to the institution's contact on the configured schedule without CM action
  3. Every delivery attempt (sent or failed) appears in a log with timestamp, status, and recipient email
  4. A failed delivery is retried automatically using exponential backoff until it succeeds or exhausts retries
**Plans:** 2 plans

Plans:
- [x] 17-01-PLAN.md — Schema migration, cron job with advisory lock, PDF email delivery, CM toggle UI with cadence selector
- [x] 17-02-PLAN.md — Delivery log viewer UI, end-to-end verification checkpoint

#### Phase 18: Institution Portal

**Goal:** Institution contacts can log in with their own credentials and self-serve their institution's stats, PDF, and attention flags — without CM involvement.
**Depends on:** Phase 17 (scheduled delivery makes portal download independently useful)
**Requirements:** PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04
**Success Criteria** (what must be TRUE):
  1. An institution contact can log in at a separate URL using credentials created by a CM (contributor login does not grant portal access)
  2. After login, the contact sees a read-only dashboard showing their institution's contributor count, active challenges, and hours contributed
  3. The contact can download their institution's current PDF impact report without contacting the CM
  4. The contact can view the list of attention flags at their institution (read-only; they cannot resolve or dismiss flags)
**Plans:** 2 plans

Plans:
- [ ] 18-01-PLAN.md — Portal auth: DB table, JWT middleware, server routes (login/refresh/me), frontend auth context + route guard + login page
- [ ] 18-02-PLAN.md — Portal dashboard (stats, PDF download, attention flags read-only), CM account creation UI

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 (Foundation -> Payments) | v1.0 | 19/19 | Complete | 2026-03-15 |
| 7-11 (UX -> Kiosk) | v1.1 | 11/11 | Complete | 2026-03-21 |
| 12-15 (Institutions -> PDF) | v1.2 | 10/10 | Complete | 2026-03-24 |
| 16. Wellbeing & Attention Analytics | v1.3 | 2/2 | Complete | 2026-03-27 |
| 17. Scheduled Report Delivery | v1.3 | 2/2 | Complete | 2026-03-30 |
| 18. Institution Portal | v1.3 | 0/2 | Not started | - |

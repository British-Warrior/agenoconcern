# Roadmap: Indomitable Unity

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-15)
- ✅ **v1.1 Pilot-Ready** — Phases 7-11 (shipped 2026-03-21)
- 🚧 **v1.2 Institution Management & iThink Integration** — Phases 12-15 (in progress)

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

<details>
<summary>✅ v1.1 Pilot-Ready (Phases 7-11) — SHIPPED 2026-03-21</summary>

- [x] Phase 7: UX Fixes (3/3 plans) — completed 2026-03-16
- [x] Phase 8: Wellbeing Visualisation (1/1 plans) — completed 2026-03-16
- [x] Phase 9: Server Foundation and VANTAGE (2/2 plans) — completed 2026-03-16
- [x] Phase 10: Challenger Portal (2/2 plans) — completed 2026-03-21
- [x] Phase 11: Kiosk Mode and Institutional Pages (3/3 plans) — completed 2026-03-21

</details>

### 🚧 v1.2 Institution Management & iThink Integration (In Progress)

**Milestone Goal:** Give the CM operational tools to manage institution-contributor relationships with live impact data and PDF reports, and integrate iThink so contributors flagged as needing attention surface in a CM attention dashboard.

- [x] **Phase 12: Institution Data Foundation** — contributor-institution junction table, CM institution CRUD, live stats (completed 2026-03-23)
- [x] **Phase 13: iThink Webhook Integration** — signed webhook receiver with full security stack, iThink dispatch, attention flag storage (completed 2026-03-23)
- [ ] **Phase 14: CM Attention Dashboard** — flagged contributor view filtered by institution, resolve with notes
- [ ] **Phase 15: PDF Impact Report** — on-demand branded PDF streamed to browser

---

#### Phase 12: Institution Data Foundation

**Goal:** The CM can manage institution records and contributor assignments, and institution landing pages display live aggregated stats derived from real contributor data.

**Depends on:** Phase 11 (institutions table and statsJson JSONB exist; this phase adds the FK and replaces static data with live queries)

**Requirements:** INST-01, INST-02, INST-03, INST-04, INST-05, INST-06, INST-07, INST-08

**Success Criteria** (what must be TRUE):
1. CM can view a paginated institution list with name, city, and active status visible for each row
2. CM can create, edit, activate, and deactivate an institution through the CM admin interface without touching the database directly
3. CM can assign a contributor to an institution and remove that assignment, and the change is reflected immediately in the contributor list for that institution
4. Institution landing page (/i/:slug) displays contributor count, active challenge count, and total hours derived from live queries — not from a manually-seeded JSON field
5. The contributor_institutions junction table migration completes successfully (many-to-many model per user decision, replacing the single FK approach)

**Plans:** 3 plans

Plans:
- [ ] 12-01: Junction table migration (contributor_institutions many-to-many), Drizzle schema, shared Zod schemas
- [ ] 12-02: Institution CRUD API endpoints, CM route guard, and CM institution management page with inline editing
- [ ] 12-03: Contributor-institution assignment endpoints, CM assignment UI, live stats aggregation, and landing page update

---

#### Phase 13: iThink Webhook Integration

**Goal:** iThink can dispatch signed webhooks when a screening flags a contributor as needing attention, and IU receives, validates, and stores those signals with a complete security stack in place before any flag is written to the database.

**Depends on:** Phase 12 (institution_id FK must exist on contributors; WHOOK-06 relationship check requires it)

**Requirements:** WHOOK-01, WHOOK-02, WHOOK-03, WHOOK-04, WHOOK-05, WHOOK-06, WHOOK-07, WHOOK-08, ATTN-01

**Success Criteria** (what must be TRUE):
1. POST /api/webhooks/ithink rejects any request with an invalid HMAC-SHA256 signature (tested with a tampered payload — 401 returned)
2. POST /api/webhooks/ithink rejects any request with a timestamp older than 5 minutes (tested with a replayed curl call — 401 returned)
3. A duplicate delivery with the same delivery ID is accepted with a 200 but writes no second flag (idempotency verified via webhook_deliveries table)
4. A webhook payload referencing a contributor not assigned to the sending institution is rejected — no flag is written (cross-institution spoofing check)
5. iThink dispatches a signed webhook to IU when a screening completes with a concern flag, and the flag appears in the ithink_attention_flags table (end-to-end integration test)
6. The webhook shared secret can be rotated by the admin without dropping valid in-flight requests (dual-secret transition window verified)

**Plans:** 3 plans

Plans:
- [ ] 13-01: DB schema (ithink_attention_flags table, webhook_deliveries idempotency table) and ITHINK_WEBHOOK_SECRET env var (no fallback)
- [ ] 13-02: IU webhook receiver (POST /api/webhooks/ithink) with full security stack (raw body, timingSafeEqual, timestamp window, idempotency, Zod validation, relationship check, flag insertion)
- [ ] 13-03: iThink-side webhook dispatch (webhook.service.ts, HMAC signing via react-native-quick-crypto, fire-and-forget from screening handler) and secret rotation (WHOOK-08)

---

#### Phase 14: CM Attention Dashboard

**Goal:** The CM can see which contributors at their institution have been flagged by iThink, view the signal history, and clear flags with follow-up notes recorded — all scoped strictly to the CM's own institution.

**Depends on:** Phase 13 (ithink_attention_flags table must exist and contain data before the dashboard has anything to display)

**Requirements:** ATTN-02, ATTN-03, ATTN-04

**Success Criteria** (what must be TRUE):
1. CM attention page lists only contributors from the CM's own institution who have unresolved flags — contributors from other institutions never appear regardless of query manipulation
2. CM can clear an attention flag by submitting follow-up notes; the flag disappears from the active list and the notes are recorded with a timestamp and the CM's identity
3. CM can view the attention signal history for their institution ordered by date, showing all signals including resolved ones

**Plans:** 2 plans

Plans:
- [ ] 14-01: Attention API routes (GET /api/attention and POST /api/attention/:flagId/resolve) with institution scope enforced from DB (not JWT)
- [ ] 14-02: CM attention dashboard page (AttentionDashboard.tsx), TanStack Query hooks, institution filter UI, confirm-before-resolve action, and signal history view

---

#### Phase 15: PDF Impact Report

**Goal:** The CM can generate a branded PDF impact report for any institution on demand, and the report is streamed directly to the browser without being stored anywhere.

**Depends on:** Phase 12 (institution-contributor data and live aggregation queries must exist; PDF aggregates the same data)

**Requirements:** PDF-01, PDF-02, PDF-03, PDF-04

**Success Criteria** (what must be TRUE):
1. CM can trigger a PDF download from the institution management page; the file arrives in the browser within a reasonable time (tested with 50+ contributors)
2. Downloaded PDF contains institution name, date range, contributor count, active challenge count, and total hours logged
3. PDF is streamed to the browser — no file appears in S3; a second download generates a fresh document
4. PDF uses Indomitable Unity brand styles (typography, colour, and logo consistent with platform identity)

**Plans:** 2 plans

Plans:
- [ ] 15-01: pdfkit dependency setup, packages/server/src/pdf/institution-report.ts document component, GET /api/institutions/:slug/report.pdf route (CM auth, streaming, correct headers, empty-state guard)
- [ ] 15-02: CM UI — "Generate Report" button with loading state, disabled during generation, and date range input

---

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
| 10. Challenger Portal | v1.1 | 2/2 | Complete | 2026-03-21 |
| 11. Kiosk Mode and Institutional Pages | v1.1 | 3/3 | Complete | 2026-03-21 |
| 12. Institution Data Foundation | v1.2 | 3/3 | Complete | 2026-03-23 |
| 13. iThink Webhook Integration | v1.2 | 3/3 | Complete | 2026-03-23 |
| 14. CM Attention Dashboard | v1.2 | 0/2 | Not started | - |
| 15. PDF Impact Report | v1.2 | 0/2 | Not started | - |

---
*Full v1.0 details archived in milestones/v1.0-ROADMAP.md*
*Full v1.1 details archived in milestones/v1.1-ROADMAP.md*

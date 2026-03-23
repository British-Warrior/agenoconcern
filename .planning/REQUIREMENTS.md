# Requirements: Indomitable Unity

**Defined:** 2026-03-21
**Core Value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.

## v1.2 Requirements

Requirements for v1.2 Institution Management & iThink Integration. Each maps to roadmap phases.

### Institution Management

- [ ] **INST-01**: CM can view a list of all institutions with name, city, and active status
- [ ] **INST-02**: CM can create a new institution with name, description, and city
- [ ] **INST-03**: CM can edit an existing institution's name, description, and city
- [ ] **INST-04**: CM can activate or deactivate an institution
- [ ] **INST-05**: CM can assign a contributor to an institution
- [ ] **INST-06**: CM can remove a contributor's institution assignment
- [ ] **INST-07**: CM can view all contributors assigned to a specific institution
- [ ] **INST-08**: Institution landing page displays live aggregated stats (contributor count, challenges, hours) instead of static JSONB

### Webhook Integration

- [ ] **WHOOK-01**: IU exposes a POST /api/webhooks/ithink endpoint that accepts signed payloads from iThink
- [ ] **WHOOK-02**: Webhook receiver verifies HMAC-SHA256 signature using timingSafeEqual
- [ ] **WHOOK-03**: Webhook receiver rejects requests with timestamps older than 5 minutes (replay protection)
- [ ] **WHOOK-04**: Webhook receiver deduplicates deliveries via webhook_deliveries table (idempotent)
- [ ] **WHOOK-05**: Webhook receiver validates payload schema with Zod before processing
- [ ] **WHOOK-06**: Webhook receiver verifies contributor-institution relationship before writing any flag
- [ ] **WHOOK-07**: iThink dispatches signed webhooks when a screening flags a contributor as needing attention
- [ ] **WHOOK-08**: Admin can rotate the webhook shared secret without downtime (dual-secret transition window)

### Attention

- [ ] **ATTN-01**: Webhook receiver stores per-contributor attention flags with audit fields (cleared_by, follow_up_notes)
- [ ] **ATTN-02**: CM can view a list of flagged contributors filtered by their institution
- [ ] **ATTN-03**: CM can clear an attention flag with follow-up notes recorded
- [ ] **ATTN-04**: CM can view attention signal history per institution ordered by date

### Reporting

- [ ] **PDF-01**: CM can generate a PDF impact report for an institution on demand
- [ ] **PDF-02**: PDF report includes institution name, date range, contributor count, challenge count, and total hours
- [ ] **PDF-03**: PDF report is streamed to the browser (not stored in S3)
- [ ] **PDF-04**: PDF report is styled with platform branding

## Future Requirements

### v1.2.x

- **WELL-01**: PDF impact report includes anonymous wellbeing aggregate band (min 5 contributors threshold)
- **ATTN-05**: CM can view attention signal trend (frequency increasing/decreasing) per institution

### v2+

- **PRIV-01**: Contributor-level wellbeing data visible to CM (requires GDPR impact assessment)
- **PDF-05**: PDF report scheduling and auto-delivery to institution contact email
- **PORTAL-01**: Institution portal login (institutions access own data without CM mediation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-contributor iThink screening details in CM view | GDPR special-category risk; undermines contributor trust; iThink sends only email + signal type |
| Real-time WebSocket push for webhook events | Signals are low-frequency (weekly); polling on page load is sufficient |
| Automated CM email alerts on each webhook | Alert fatigue; CM pulls on demand via badge/count |
| Institution hierarchy / sub-institutions | Scope creep; flat model with city field is sufficient for pilot |
| Stored PDFs in S3 | Reports must reflect current data; cached PDFs go stale immediately |
| Full circle resolution text in PDF | Unwieldy for funder reports; summary metrics only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-01 | Phase 12 | Complete |
| INST-02 | Phase 12 | Complete |
| INST-03 | Phase 12 | Complete |
| INST-04 | Phase 12 | Complete |
| INST-05 | Phase 12 | Complete |
| INST-06 | Phase 12 | Complete |
| INST-07 | Phase 12 | Complete |
| INST-08 | Phase 12 | Complete |
| WHOOK-01 | Phase 13 | Complete |
| WHOOK-02 | Phase 13 | Complete |
| WHOOK-03 | Phase 13 | Complete |
| WHOOK-04 | Phase 13 | Complete |
| WHOOK-05 | Phase 13 | Complete |
| WHOOK-06 | Phase 13 | Complete |
| WHOOK-07 | Phase 13 | Complete |
| WHOOK-08 | Phase 13 | Complete |
| ATTN-01 | Phase 13 | Complete |
| ATTN-02 | Phase 14 | Pending |
| ATTN-03 | Phase 14 | Pending |
| ATTN-04 | Phase 14 | Pending |
| PDF-01 | Phase 15 | Pending |
| PDF-02 | Phase 15 | Pending |
| PDF-03 | Phase 15 | Pending |
| PDF-04 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability complete after roadmap creation*

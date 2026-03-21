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
| INST-01 | — | Pending |
| INST-02 | — | Pending |
| INST-03 | — | Pending |
| INST-04 | — | Pending |
| INST-05 | — | Pending |
| INST-06 | — | Pending |
| INST-07 | — | Pending |
| INST-08 | — | Pending |
| WHOOK-01 | — | Pending |
| WHOOK-02 | — | Pending |
| WHOOK-03 | — | Pending |
| WHOOK-04 | — | Pending |
| WHOOK-05 | — | Pending |
| WHOOK-06 | — | Pending |
| WHOOK-07 | — | Pending |
| WHOOK-08 | — | Pending |
| ATTN-01 | — | Pending |
| ATTN-02 | — | Pending |
| ATTN-03 | — | Pending |
| ATTN-04 | — | Pending |
| PDF-01 | — | Pending |
| PDF-02 | — | Pending |
| PDF-03 | — | Pending |
| PDF-04 | — | Pending |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*

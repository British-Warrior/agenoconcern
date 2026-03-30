# Requirements: Indomitable Unity

**Defined:** 2026-03-25
**Core Value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.

## v1.3 Requirements

Requirements for v1.3 Enhanced Reporting & Institution Portal. Each maps to roadmap phases.

### Wellbeing Reporting

- [ ] **WELL-01**: PDF impact report includes an anonymous wellbeing band (low/typical/high) when the institution has enough opted-in contributors
- [ ] **WELL-02**: Wellbeing band is derived from Rasch-transformed SWEMWBS metric scores, not raw sums
- [ ] **WELL-03**: Wellbeing data is suppressed (band hidden) when fewer than k contributors have completed a check-in at the institution
- [ ] **WELL-04**: Only contributors who have consented to the institutional_reporting purpose are included in wellbeing aggregation

### Attention Analytics

- [ ] **ATTN-05**: CM can see a trend direction indicator (increasing/stable/decreasing) for attention flags per institution on the dashboard
- [ ] **ATTN-06**: CM can view a weekly trend chart of attention flag counts per institution over time

### Scheduled Delivery

- [ ] **SCHED-01**: CM can enable or disable automatic PDF report delivery per institution
- [ ] **SCHED-02**: When enabled, the PDF impact report is automatically emailed to the institution's contact email on the configured schedule (weekly or monthly)
- [ ] **SCHED-03**: Each delivery attempt is logged with timestamp, status (sent/failed), and recipient email
- [ ] **SCHED-04**: Failed deliveries are automatically retried with exponential backoff

### Institution Portal

- [ ] **PORTAL-01**: Institution contacts can log in with their own credentials (separate from contributor auth)
- [ ] **PORTAL-02**: Institution portal shows a read-only dashboard with their institution's stats (contributor count, challenges, hours)
- [ ] **PORTAL-03**: Institution users can download their own PDF impact report without CM intervention
- [ ] **PORTAL-04**: Institution users can view attention flags at their institution (read-only, no resolve action)

## Future Requirements

### v2+
- **PRIV-01**: Contributor-level wellbeing data visible to CM (requires GDPR impact assessment)
- **PDF-06**: Multi-institution comparative reports for admin users
- **PORTAL-05**: Institution users can resolve attention flags (currently CM-only)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Contributor-level wellbeing visible to CM | GDPR DPIA required — deferred to v2+ |
| Real-time wellbeing alerts | Over-engineered for pilot scale; batch reporting sufficient |
| Institution portal self-registration | Security risk; CM creates portal accounts |
| Multi-institution portal accounts | Pilot-scale assumption; one contact per institution |
| Custom PDF templates per institution | Premature; single branded template sufficient |
| SMS delivery option | Email sufficient for institutional contacts |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WELL-01 | Phase 16 | Pending |
| WELL-02 | Phase 16 | Pending |
| WELL-03 | Phase 16 | Pending |
| WELL-04 | Phase 16 | Pending |
| ATTN-05 | Phase 16 | Pending |
| ATTN-06 | Phase 16 | Pending |
| SCHED-01 | Phase 17 | Done |
| SCHED-02 | Phase 17 | Done |
| SCHED-03 | Phase 17 | Done |
| SCHED-04 | Phase 17 | Done |
| PORTAL-01 | Phase 18 | Pending |
| PORTAL-02 | Phase 18 | Pending |
| PORTAL-03 | Phase 18 | Pending |
| PORTAL-04 | Phase 18 | Pending |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 — traceability populated after roadmap creation*

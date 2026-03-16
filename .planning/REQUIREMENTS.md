# Requirements: Indomitable Unity

**Defined:** 2026-03-15
**Core Value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.

## v1.1 Requirements

Requirements for pilot-ready release. Each maps to roadmap phases.

### UX Overhaul

- [ ] **UX-01**: User can navigate to dashboard, challenges, circles, impact, and logout from every authenticated page
- [ ] **UX-02**: Dashboard shows active circles, open challenge matches, earnings summary, hours contributed, and wellbeing check-in status
- [ ] **UX-03**: Wellbeing scores display with context (score/max, colour band: low/average/high per UK norms, trend direction)
- [ ] **UX-04**: Wellbeing trajectory shows as a line chart with SWEMWBS and UCLA series over time
- [ ] **UX-05**: All interactive elements (cards, links, buttons) have visible hover states, cursor pointer, and click affordance
- [ ] **UX-06**: CM can view and access all circles they formed from the circles page
- [ ] **UX-07**: CM circles page shows role-appropriate messaging and actions (not "Express interest in challenges")
- [ ] **UX-08**: User can reach wellbeing check-in from navigation without typing the URL
- [ ] **UX-09**: Error messages display human-readable text (no raw UUIDs or technical details)
- [ ] **UX-10**: Edit Resolution button has clear active/disabled states and works when clickable
- [ ] **UX-11**: Circle formation modal shows correct member names matching selected contributors

### Wellbeing Visualisation

- [ ] **WELL-01**: Impact dashboard shows wellbeing trajectory as an interactive line chart (recharts)
- [ ] **WELL-02**: Wellbeing chart includes UK population benchmark line for SWEMWBS
- [ ] **WELL-03**: Wellbeing scores include accessible data table alternative for screen readers

### VANTAGE Integration

- [ ] **VANT-01**: Server supports API key authentication via X-API-Key header, separate from JWT cookie auth
- [ ] **VANT-02**: API keys are stored as SHA-256 hashes with scoped permissions and expiry
- [ ] **VANT-03**: API key endpoints are rate-limited (express-rate-limit)
- [ ] **VANT-04**: VANTAGE endpoint contract is documented (request/response shapes for all REST endpoints)

### Kiosk Mode

- [ ] **KIOSK-01**: URL parameter `?kiosk=true` activates kiosk mode with simplified UI (larger buttons, no install/notification prompts)
- [ ] **KIOSK-02**: Kiosk sessions auto-logout after 10 minutes of inactivity with 60-second warning countdown
- [ ] **KIOSK-03**: Kiosk logout clears server cookies AND React Query cache completely (no data leakage)
- [ ] **KIOSK-04**: Kiosk mode shows "End Session" button prominently in navigation

### Challenger Portal

- [ ] **CHAL-01**: Organisation can register an account with name, email, and organisation type
- [ ] **CHAL-02**: Organisation can submit a challenge brief (title, description, domain, skills, type, deadline, circle size)
- [ ] **CHAL-03**: Submitted challenges enter "draft" status for CM review before publishing
- [ ] **CHAL-04**: Organisation can view status of their submitted challenges (draft, open, closed, archived)
- [ ] **CHAL-05**: Organisation can view circle progress on their challenges (members, status)
- [ ] **CHAL-06**: Organisation can rate completed resolutions and provide feedback

### Institutional Landing Pages

- [ ] **INST-01**: Each institution has a public landing page at `/i/[slug]` with name, description, and "Get Started" CTA
- [ ] **INST-02**: Institutional landing page shows aggregate local impact stats (contributors, challenges, hours)
- [ ] **INST-03**: Institutional URL auto-activates kiosk mode when accessed from that page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### VANTAGE Deep Integration

- **VANT-05**: VANTAGE can impersonate a specific contributor (user-context tokens)
- **VANT-06**: VANTAGE can execute multi-step workflows (e.g., "find me a challenge and express interest")

### Institutional Management

- **INST-04**: Institutions can manage their own contributor cohorts
- **INST-05**: Institution-specific impact reports exportable as PDF

### Advanced Wellbeing

- **WELL-04**: Wellbeing comparison across contributor cohorts (anonymised, aggregated)
- **WELL-05**: Automated wellbeing alerts to CM when scores decline significantly

## Out of Scope

| Feature | Reason |
|---------|--------|
| OS-level kiosk lockdown (browser back button, tab switching) | Libraries manage their own machines. App-level kiosk is sufficient |
| Rich text / WYSIWYG for challenge briefs | Heavy dependency, plain text sufficient for pilot |
| Organisation SSO (SAML/OIDC for NHS) | 3-6 month enterprise IT engagement, not pilot-ready |
| Real-time kiosk analytics (occupancy tracking) | Surveillance infrastructure, conflicts with GDPR and values |
| Interactive wellbeing goal-setting | Clinical liability without qualified practitioner |
| Wellbeing chart annotations | Special category data — increased consent surface |
| Challenger listing fees (pay to post) | Revenue comes from contributor payment splits, not listing fees |
| MCP tool implementation | VANTAGE uses REST directly, MCP is not needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 7 | Pending |
| UX-02 | Phase 7 | Pending |
| UX-03 | Phase 7 | Pending |
| UX-04 | Phase 7 | Pending |
| UX-05 | Phase 7 | Pending |
| UX-06 | Phase 7 | Pending |
| UX-07 | Phase 7 | Pending |
| UX-08 | Phase 7 | Pending |
| UX-09 | Phase 7 | Pending |
| UX-10 | Phase 7 | Pending |
| UX-11 | Phase 7 | Pending |
| WELL-01 | Phase 8 | Pending |
| WELL-02 | Phase 8 | Pending |
| WELL-03 | Phase 8 | Pending |
| VANT-01 | Phase 9 | Pending |
| VANT-02 | Phase 9 | Pending |
| VANT-03 | Phase 9 | Pending |
| VANT-04 | Phase 9 | Pending |
| CHAL-01 | Phase 10 | Pending |
| CHAL-02 | Phase 10 | Pending |
| CHAL-03 | Phase 10 | Pending |
| CHAL-04 | Phase 10 | Pending |
| CHAL-05 | Phase 10 | Pending |
| CHAL-06 | Phase 10 | Pending |
| KIOSK-01 | Phase 11 | Pending |
| KIOSK-02 | Phase 11 | Pending |
| KIOSK-03 | Phase 11 | Pending |
| KIOSK-04 | Phase 11 | Pending |
| INST-01 | Phase 11 | Pending |
| INST-02 | Phase 11 | Pending |
| INST-03 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-16 — traceability complete, all 31 requirements mapped to phases 7-11*

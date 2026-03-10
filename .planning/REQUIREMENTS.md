# Requirements: Age No Concern

**Defined:** 2026-03-10
**Core Value:** Experienced professionals can upload their CV, get matched to real challenges, collaborate in cross-functional Circles, and earn income — bridging the pension gap while contributing to their communities.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can create account with email and password
- [ ] **AUTH-02**: User can log in via Google OAuth
- [ ] **AUTH-03**: User can log in via LinkedIn OAuth (profile data imported as secondary source)
- [ ] **AUTH-04**: User session persists across browser refresh
- [ ] **AUTH-05**: User can log out from any page
- [ ] **AUTH-06**: User can reset password via email link

### Onboarding

- [ ] **ONBD-01**: User can upload CV (PDF, DOCX, TXT) stored in S3
- [ ] **ONBD-02**: CV is parsed via text extraction + LLM to produce structured profile (roles, skills, qualifications, sectors, experience years)
- [ ] **ONBD-03**: User sees draft profile as editable cards and can confirm/adjust
- [ ] **ONBD-04**: User sets availability (full-time, part-time, occasional, project-only)
- [ ] **ONBD-05**: User sets preferences (domains of interest, willing to mentor/volunteer, max Circles, communication preference)
- [ ] **ONBD-06**: Stripe Connect onboarding triggered if user opts into paid work
- [ ] **ONBD-07**: First wellbeing check-in completed during onboarding
- [ ] **ONBD-08**: CV upload to live profile completes in under 5 minutes

### Challenges

- [ ] **CHAL-01**: User can browse challenge feed sorted by relevance, recency, domain, or deadline
- [ ] **CHAL-02**: Challenge cards show title, brief excerpt, domain, skills, type, deadline, interest count
- [ ] **CHAL-03**: User can filter challenges by domain, skill match, type (free/paid), and timeline
- [ ] **CHAL-04**: User sees top 3-5 "recommended for you" challenges based on profile match
- [ ] **CHAL-05**: User can express interest in a challenge with single tap
- [ ] **CHAL-06**: Community manager can create and post challenges via admin interface

### Matching

- [ ] **MTCH-01**: Platform scores contributors against challenges (direct skill match, cross-functional value, availability, Circle diversity, active Circle count)
- [ ] **MTCH-02**: Community manager reviews suggested team and confirms or adjusts Circle composition

### Circles

- [ ] **CIRC-01**: Circle is formed with 3-7 members linked to a challenge
- [ ] **CIRC-02**: Circle workspace shows pinned challenge brief, notes feed, member list, and social channel link
- [ ] **CIRC-03**: Circle members can post notes with text and file attachments
- [ ] **CIRC-04**: Circle members can set/change external social channel (WhatsApp/Slack/Discord/Teams/Signal)
- [ ] **CIRC-05**: Circle can submit structured resolution (problem summary, recommendations, evidence, dissenting views, implementation notes)
- [ ] **CIRC-06**: Challenger can rate resolution (1-5) and provide feedback
- [ ] **CIRC-07**: Contributors can participate in multiple Circles simultaneously (configurable max, default 3)
- [ ] **CIRC-08**: New members can join a Circle mid-challenge

### Payments

- [ ] **PAY-01**: Contributor can onboard to Stripe Connect (bank details for payouts)
- [ ] **PAY-02**: Knowledge Transition retainer: monthly Stripe subscription with auto 75/25 split
- [ ] **PAY-03**: Premium challenge stipend: fixed fee held via payment intent, released on resolution (75/25 split)
- [ ] **PAY-04**: SME subscription: monthly/annual Stripe subscription for ongoing expertise pool access
- [ ] **PAY-05**: Contributors receive payouts on Stripe's standard schedule

### Wellbeing

- [ ] **WELL-01**: User completes wellbeing check-in (UCLA Loneliness Scale short form + WEMWBS) at onboarding
- [ ] **WELL-02**: Wellbeing check-in prompted every 8 weeks
- [ ] **WELL-03**: Wellbeing data stored with GDPR special category protections (explicit consent, DPIA)

### Impact

- [ ] **IMPT-01**: Contributor sees challenges participated in (active + historical)
- [ ] **IMPT-02**: Contributor sees total hours contributed (self-reported per Circle)
- [ ] **IMPT-03**: Contributor sees total earnings (if opted into paid work)
- [ ] **IMPT-04**: Contributor sees unpaid contribution formally recognised (hours mentoring, volunteering, community work)
- [ ] **IMPT-05**: Contributor sees wellbeing trajectory (personal scores over time)
- [ ] **IMPT-06**: Challenger sees recommendations received, implementation status, and feedback submitted

### Notifications

- [ ] **NOTF-01**: User notified of new challenge match
- [ ] **NOTF-02**: User notified when Circle is formed
- [ ] **NOTF-03**: User notified of Circle activity (configurable: immediate, daily digest, off)
- [ ] **NOTF-04**: User notified when wellbeing check-in is due
- [ ] **NOTF-05**: User notified of resolution feedback
- [ ] **NOTF-06**: User notified of payment received
- [ ] **NOTF-07**: Notifications delivered via PWA push (primary) and email fallback

### Platform

- [ ] **PLAT-01**: MCP server exposes 14 tools across 4 domains (Contributors, Challenges, Circles, Wellbeing)
- [ ] **PLAT-02**: Basic React/Vite web UI for all contributor-facing flows
- [ ] **PLAT-03**: PWA manifest, service worker, and home screen install
- [ ] **PLAT-04**: WCAG AAA contrast (7:1 minimum) with 16px+ body text
- [ ] **PLAT-05**: External social deep links launch correctly (WhatsApp, Slack, Discord, Teams, Signal)
- [ ] **PLAT-06**: GDPR-compliant data handling (consent management, data export, deletion)
- [ ] **PLAT-07**: Community manager admin interface for challenge posting and Circle management

## v2 Requirements

### VANTAGE Integration

- **VANT-01**: VANTAGE connects to MCP server as AI agent interface
- **VANT-02**: Conversational flows for all 14 MCP tools
- **VANT-03**: Adaptive output across modalities (voice, text, simplified visual, motor-adapted)
- **VANT-04**: End-to-end voice flow: CV upload through resolution submission

### Advanced Matching

- **AMCH-01**: AI-powered matching using engagement history and outcome data
- **AMCH-02**: Cross-sector pattern recognition for non-obvious skill matches

### Institutional Embedding

- **INST-01**: Institution profiles with local impact dashboards
- **INST-02**: QR codes and kiosk mode for library/community centre access
- **INST-03**: Local admin accounts for institutional partners

### Challenger Self-Service

- **CSLF-01**: Organisations can post challenges directly via web portal
- **CSLF-02**: Challenge templates for common engagement types

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin dashboard (complex) | Community manager uses spreadsheet exports + monthly reports for pilot |
| Public marketing site | Single landing page with sign-up only |
| Native mobile app (iOS/Android) | PWA covers mobile. App store distribution is expensive and slow |
| Internal messaging / chat | WhatsApp/Slack/Discord handle conversation. Deep links only |
| Video conferencing | Zoom/Teams/Google Meet handle this |
| Gamification / leaderboards | Wrong demographic. Professionals, not players |
| Marketplace bidding / price competition | Destroys professional dignity. Fixed rates set collaboratively |
| Automated vetting (Toptal-style) | Disrespectful to vet 30-year veterans like junior hires |
| Complex analytics / BI tools | Database queries + CSV exports for pilot scale |
| Tax / invoicing system | Stripe receipts. Contributors handle own tax |
| Multi-language | English only at pilot |
| AI-powered everything from day one | Build data foundation first. VANTAGE wraps later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| ONBD-01 | Phase 2 | Pending |
| ONBD-02 | Phase 2 | Pending |
| ONBD-03 | Phase 2 | Pending |
| ONBD-04 | Phase 2 | Pending |
| ONBD-05 | Phase 2 | Pending |
| ONBD-06 | Phase 2 | Pending |
| ONBD-07 | Phase 6 | Pending |
| ONBD-08 | Phase 2 | Pending |
| CHAL-01 | Phase 3 | Pending |
| CHAL-02 | Phase 3 | Pending |
| CHAL-03 | Phase 3 | Pending |
| CHAL-04 | Phase 3 | Pending |
| CHAL-05 | Phase 3 | Pending |
| CHAL-06 | Phase 3 | Pending |
| MTCH-01 | Phase 3 | Pending |
| MTCH-02 | Phase 3 | Pending |
| CIRC-01 | Phase 4 | Pending |
| CIRC-02 | Phase 4 | Pending |
| CIRC-03 | Phase 4 | Pending |
| CIRC-04 | Phase 4 | Pending |
| CIRC-05 | Phase 4 | Pending |
| CIRC-06 | Phase 4 | Pending |
| CIRC-07 | Phase 4 | Pending |
| CIRC-08 | Phase 4 | Pending |
| PAY-01 | Phase 5 | Pending |
| PAY-02 | Phase 5 | Pending |
| PAY-03 | Phase 5 | Pending |
| PAY-04 | Phase 5 | Pending |
| PAY-05 | Phase 5 | Pending |
| WELL-01 | Phase 6 | Pending |
| WELL-02 | Phase 6 | Pending |
| WELL-03 | Phase 6 | Pending |
| IMPT-01 | Phase 5 | Pending |
| IMPT-02 | Phase 5 | Pending |
| IMPT-03 | Phase 5 | Pending |
| IMPT-04 | Phase 5 | Pending |
| IMPT-05 | Phase 5 | Pending |
| IMPT-06 | Phase 5 | Pending |
| NOTF-01 | Phase 6 | Pending |
| NOTF-02 | Phase 6 | Pending |
| NOTF-03 | Phase 6 | Pending |
| NOTF-04 | Phase 6 | Pending |
| NOTF-05 | Phase 6 | Pending |
| NOTF-06 | Phase 6 | Pending |
| NOTF-07 | Phase 6 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 6 | Pending |
| PLAT-04 | Phase 1 | Pending |
| PLAT-05 | Phase 4 | Pending |
| PLAT-06 | Phase 1 | Pending |
| PLAT-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after roadmap creation*

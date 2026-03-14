# Roadmap: Age No Concern

## Overview

Age No Concern delivers a pilot-ready expertise marketplace that takes experienced professionals from CV upload to paid advisory work and community contribution through Circles. The build progresses from foundation and auth, through the core onboarding and challenge loop, into Circles collaboration, payments, wellbeing and impact tracking, and finally notifications and PWA polish. Each phase delivers a complete, verifiable capability that builds on the last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Auth** - Monorepo, database, MCP server shell, auth system, and basic web UI shell
- [ ] **Phase 2: Onboarding and Profiles** - CV upload, LLM parsing, profile generation, availability/preferences, Stripe Connect onboarding
- [x] **Phase 3: Challenges and Matching** - Challenge board, filtering, interest expression, scoring algorithm, community manager admin
- [x] **Phase 4: Circles and Collaboration** - Circle formation, workspace, notes, social links, resolutions, feedback
- [x] **Phase 5: Payments and Impact** - Payment flows (retainers, stipends, subscriptions), impact dashboard, earnings tracking
- [ ] **Phase 6: Wellbeing, Notifications, and PWA** - Wellbeing check-ins, notification system, PWA configuration, GDPR compliance, accessibility

## Phase Details

### Phase 1: Foundation and Auth
**Goal**: Contributors can register, log in, and access a running application with persistent sessions
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PLAT-01, PLAT-02, PLAT-04, PLAT-06
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password and log in
  2. User can log in via Google OAuth and via LinkedIn OAuth
  3. User session persists across browser refresh and user can log out from any page
  4. User can reset password via email link
  5. MCP server starts and responds to tool calls; React web UI loads with auth-gated routes
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Monorepo scaffold, shared types, database schema
- [ ] 01-02-PLAN.md — Express server, MCP tool stubs, middleware
- [ ] 01-03-PLAN.md — Auth system (email/password, OAuth, SMS, password reset, CM accounts)
- [ ] 01-04-PLAN.md — React web UI shell with auth flows, design system, GDPR consent

**PLAT-06 note**: GDPR consent banner and consent recording are in Phase 1. Data export (Subject Access Request) and data deletion (Right to Erasure) are deferred to Phase 5/6 when all personal data stores exist -- implementing now with only auth tables would be incomplete. Privacy policy includes interim contact email for requests.

### Phase 2: Onboarding and Profiles
**Goal**: Contributors can upload a CV and have a complete, editable profile in under 5 minutes with zero form-filling
**Depends on**: Phase 1
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05, ONBD-06, ONBD-08
**Success Criteria** (what must be TRUE):
  1. User can upload a CV (PDF, DOCX, TXT) and see it stored in S3
  2. CV is automatically parsed into structured profile fields (roles, skills, qualifications, sectors) via LLM extraction
  3. User sees draft profile as editable cards, can adjust, and confirm -- entire flow completes in under 5 minutes
  4. User can set availability and preferences (domains, mentoring, max Circles, communication)
  5. User who opts into paid work is guided through Stripe Connect onboarding
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Backend: DB schema, S3/OpenAI/Stripe services, CV parsing pipeline, onboarding API routes
- [ ] 02-02-PLAN.md — Frontend: CV upload, parsing wait state, profile review, affirmation page
- [ ] 02-03-PLAN.md — Frontend: Preferences, Stripe Connect prompt, onboarding completion and routing

### Phase 3: Challenges and Matching
**Goal**: Contributors can discover relevant challenges and express interest; community manager can post challenges and review suggested teams
**Depends on**: Phase 2
**Requirements**: CHAL-01, CHAL-02, CHAL-03, CHAL-04, CHAL-05, CHAL-06, MTCH-01, MTCH-02, PLAT-07
**Success Criteria** (what must be TRUE):
  1. User can browse a challenge feed with cards showing title, brief, domain, skills, type, deadline, and interest count
  2. User can filter challenges by domain, skill match, type (free/paid), and timeline
  3. User sees 3-5 recommended challenges based on profile match
  4. User can express interest in a challenge with a single tap
  5. Community manager can create/post challenges and review/confirm suggested Circle compositions via admin interface
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Backend: DB schema, shared types, matching algorithm, challenge API routes
- [x] 03-02-PLAN.md — Frontend: Challenge feed with accordion layout, filters, infinite scroll, interest expression
- [x] 03-03-PLAN.md — Frontend: CM admin (create form, manage tab, team compositions, role toggle) + human verification

### Phase 4: Circles and Collaboration
**Goal**: Contributors can collaborate in cross-functional Circles to deliver resolutions for challenges
**Depends on**: Phase 3
**Requirements**: CIRC-01, CIRC-02, CIRC-03, CIRC-04, CIRC-05, CIRC-06, CIRC-07, CIRC-08, PLAT-05
**Success Criteria** (what must be TRUE):
  1. Circle of 3-7 members is formed linked to a challenge, with workspace showing pinned brief, notes feed, member list, and social link
  2. Circle members can post notes with text and file attachments
  3. Circle members can set/change external social channel link (WhatsApp, Slack, Discord, Teams, Signal) and links launch correctly
  4. Circle can submit a structured resolution; challenger can rate it and provide feedback
  5. Contributors can participate in multiple Circles simultaneously and new members can join mid-challenge
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Backend: DB schema (6 tables), shared types/schemas, Circle API routes, S3 download URL
- [x] 04-02-PLAN.md — Frontend: Circle formation modal, workspace UI, notes feed with attachments, My Circles list
- [x] 04-03-PLAN.md — Frontend: Social channel editor, resolution form, challenger rating, add member modal + human verification

### Phase 5: Payments and Impact
**Goal**: Contributors earn income through the platform and can see the full picture of their paid and unpaid contributions
**Depends on**: Phase 4
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, IMPT-06
**Success Criteria** (what must be TRUE):
  1. Contributor can onboard to Stripe Connect and receive payouts on standard schedule
  2. Knowledge Transition retainer payments process monthly with automatic 75/25 split
  3. Premium challenge stipend is held via payment intent and released on resolution with 75/25 split
  4. SME subscription payments process monthly/annually
  5. Contributor dashboard shows challenges participated in, hours contributed, total earnings, unpaid contribution recognised, and wellbeing trajectory
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md — DB schema (2 tables), shared types/schemas, Stripe service extensions
- [x] 05-02-PLAN.md — Payment routes, webhook handler, impact API routes, express-app wiring
- [x] 05-03-PLAN.md — Impact dashboard frontend (contributor + challenger views), navigation + human verification

### Phase 6: Wellbeing, Notifications, and PWA
**Goal**: Platform supports contributor wellbeing, keeps users informed, and works as an installable PWA
**Depends on**: Phase 5
**Requirements**: ONBD-07, WELL-01, WELL-02, WELL-03, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07, PLAT-03
**Success Criteria** (what must be TRUE):
  1. User completes wellbeing check-in (UCLA Loneliness Scale + WEMWBS) at onboarding and is prompted every 8 weeks
  2. Wellbeing data is stored with GDPR special category protections (explicit consent, DPIA completed)
  3. User receives notifications for challenge matches, Circle formation, Circle activity, wellbeing reminders, resolution feedback, and payments
  4. Notifications delivered via PWA push with email fallback; Circle activity notifications are configurable
  5. Application is installable as PWA from home screen with manifest and service worker
**Plans**: TBD

Plans:
- [ ] 06-01: Wellbeing check-in flows (UCLA + WEMWBS), GDPR special category handling, DPIA
- [ ] 06-02: Notification system (PWA push + email fallback, all event types, preferences)
- [ ] 06-03: PWA configuration (manifest, service worker, home screen install)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Auth | 4/4 | ✓ Complete | 2026-03-10 |
| 2. Onboarding and Profiles | 3/3 | ✓ Complete | 2026-03-11 |
| 3. Challenges and Matching | 3/3 | ✓ Complete | 2026-03-12 |
| 4. Circles and Collaboration | 3/3 | ✓ Complete | 2026-03-13 |
| 5. Payments and Impact | 3/3 | ✓ Complete | 2026-03-14 |
| 6. Wellbeing, Notifications, and PWA | 0/3 | Not started | - |

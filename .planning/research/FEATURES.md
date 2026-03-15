# Feature Landscape

**Domain:** Expertise marketplace / professional community platform (social enterprise)
**Researched:** 2026-03-10
**Confidence:** MEDIUM (verified against multiple marketplace platforms, WEMWBS official docs, Stripe docs)

---

## Table Stakes

Features users expect. Missing = platform feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Profile creation with CV/resume upload** | Every marketplace (Toptal, Catalant, Expert360) has this. Users won't manually re-enter career history | Medium | Accept PDF/DOCX. AI extraction of skills, roles, industries. LinkedIn import is a bonus but not MVP-critical for this demographic |
| **Skills taxonomy and tagging** | Users need to be found by skill. Catalant and Expert360 both use structured skill taxonomies for matching | Medium | Use a curated taxonomy relevant to professional advisory (strategy, finance, operations, HR, marketing, governance, etc.) not a freeform tag soup |
| **Challenge/project posting** | Core marketplace function. Organisations post needs, professionals respond. Toptal, Catalant, Expert360 all centre on this | Medium | Both paid engagements and unpaid community challenges must use the same posting format. This is the ANC differentiator |
| **Basic matching (skills to challenges)** | Expert360 and Catalant use algorithmic matching. At MVP scale (50-100 users), manual curation + simple filter is sufficient | Low (MVP) / High (AI) | Start with search/filter. VANTAGE handles intelligent matching post-MVP |
| **Messaging / communication** | Every platform has direct messaging between parties. MentorCruise uses in-platform messaging + video calls | Low | In-platform messaging for coordination. Do NOT build video/voice -- use external tools (Zoom, Teams, WhatsApp) |
| **Notification system (email)** | Users expect to know when matched, when a challenge is posted, when they receive a message | Low | Email notifications for MVP. Push notifications are a Phase 2 concern |
| **Payment processing** | Catalant takes 20-30%, Expert360 takes 15-20%. Users expect to get paid through the platform | High | Stripe Connect for marketplace splits. Platform takes a percentage of paid engagements. Must handle UK tax requirements |
| **User dashboard** | Central place to see active engagements, pending invitations, contribution history | Medium | Single dashboard showing both paid and unpaid activity side by side -- this is where ANC's dual-value model becomes visible |
| **Basic search and discovery** | Users need to find challenges and organisations need to find professionals | Low | Filter by skill, location (East Midlands initially), availability, paid/unpaid |
| **Authentication and security** | Non-negotiable for any platform handling personal data and payments. GDPR compliance required (UK) | Medium | Email/password + magic link. Social login is nice but not critical for this demographic. MFA for payment-connected accounts |
| **Responsive web design** | Users will access from desktop, tablet, and mobile. 50-75 demographic uses all three | Low | Mobile-first responsive design. Not a native app -- PWA later |
| **Organisation profiles** | Businesses and community organisations posting challenges need their own profiles | Low | Company name, description, location, verification status |

## Differentiators

Features that set Indomitable Unity apart. Not expected by users coming from other platforms, but create unique value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dual contribution tracking (paid + unpaid)** | ANC's core thesis: unpaid community work is valued equally to paid advisory. No other marketplace does this. Volunteering platforms (Better Impact, GivePulse) track hours but don't bridge to paid work | Medium | Single contribution ledger that tracks hours, outcomes, and earnings across both paid and unpaid engagements. This is THE differentiator |
| **Circles (teams of 3-7 professionals)** | Small interdisciplinary teams deployed to challenges. Not just individual freelancer matching. Closer to Catalant's team engagements but formalised as a first-class concept | High | Circle formation, role assignment within circles, shared workspace. Defer to Phase 2 -- MVP is individual matching |
| **Impact dashboard with social proof** | Aggregated view of contribution: hours given, challenges completed, earnings, community impact. Creates a "contribution CV" that demonstrates ongoing professional value | Medium | Think LinkedIn activity feed meets volunteer hours log. Exportable for funders, grant applications, personal portfolios |
| **Wellbeing measurement (WEMWBS / ONS4)** | Validated psychological instruments measuring whether platform participation improves wellbeing. WEMWBS is UK-validated, 14 items, scores 14-70. ONS4 is 4 questions used by Office for National Statistics | Low | Periodic self-report surveys (quarterly). Simple to implement technically. Requires licence for WEMWBS (free for non-commercial use from University of Warwick). Powerful for funding bids and social impact reporting |
| **Institutional embedding (library/community centre integration)** | Platform designed to be accessed and promoted through local institutions. QR codes, kiosk mode, local admin accounts | Low-Medium | Local institution profiles with their own dashboards showing community impact in their area. Unique to ANC's delivery model |
| **Contribution recognition and badges** | Formal recognition of unpaid contribution. Badges, certificates, milestone celebrations | Low | Gamification-lite. Not points/leaderboards (wrong demographic) but milestone markers: "100 hours contributed", "5 challenges completed" |
| **VANTAGE AI agent interface** | Post-MVP: AI agent as the primary interface. Users converse with VANTAGE rather than navigating traditional UI. Handles matching, onboarding, check-ins | Very High | Phase 3+. Requires solid data foundation from Phases 1-2. No other marketplace has an AI-first conversational interface as the primary UX |
| **External social integration (WhatsApp/Slack deep links)** | WhatsApp is the dominant messaging tool for 50-75 UK demographic. Deep links to WhatsApp groups for circle communication, not in-platform chat | Low | WhatsApp deep links (wa.me URLs) for circle coordination. WhatsApp Groups API has 8-person limit which aligns perfectly with Circles (3-7 people). Do NOT build a full chat system |
| **PWA with offline capability** | Home screen install, offline access to profile and contribution history. Important for users in community centres with patchy WiFi | Medium | Service worker caching for profile, dashboard, contribution history. Online required for messaging, payments, new challenges |

## Anti-Features

Features to explicitly NOT build. These are traps that waste time or damage the proposition.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **In-platform video/voice calls** | Massive complexity, Zoom/Teams/WhatsApp already solve this perfectly. This demographic already uses these tools | Deep link to Zoom/Teams/WhatsApp. Store meeting links in challenge workspace |
| **Full chat/messaging system** | Slack, WhatsApp, Discord already exist. Building another chat tool adds zero value and massive complexity | Lightweight in-platform messaging for notifications/coordination only. WhatsApp deep links for real-time conversation |
| **Job board / gig economy features** | ANC is NOT a job board. Adding job listings, CVs-for-hire, bidding, or hourly rate competition destroys the social enterprise model | Challenges are posted by organisations, professionals are matched (not bidding). Rates are set collaboratively, not competitively |
| **Gamification / leaderboards** | Wrong demographic. Points, levels, streaks feel patronising to 50-75 professionals with decades of experience | Milestone recognition, contribution certificates, impact dashboards. Dignified, not gamified |
| **Native mobile apps (iOS/Android)** | App store distribution is expensive and slow. PWA covers 95% of use cases. This demographic doesn't want to install another app | PWA with home screen install prompt. Responsive web design |
| **Complex role-based permissions** | Over-engineering access control for a 50-100 user pilot is a time sink | Three roles: Contributor, Organisation, Admin. Add complexity only when needed |
| **Automated vetting (Toptal-style)** | Toptal's 3-8 week vetting process with live coding challenges is wrong for experienced professionals. It's disrespectful to vet a 30-year veteran like a junior hire | Light verification: LinkedIn profile link, brief bio, self-declared skills. Trust the professional. Community reputation builds naturally |
| **Marketplace bidding / price competition** | Race-to-the-bottom pricing destroys professional dignity and undercuts the social enterprise model | Fixed rate ranges set by ANC. Organisations pay fair rates. Platform takes a transparent percentage |
| **Complex analytics dashboards** | At 50-100 users, you don't need real-time analytics, funnel metrics, or BI tools | Simple admin dashboard: user count, active challenges, total hours contributed, total earnings processed. Export to CSV for reporting |
| **AI-powered everything from day one** | VANTAGE is the vision, but building AI matching, AI onboarding, AI everything in Phase 1 guarantees you ship nothing | Build the data foundation first. Manual matching, human onboarding. VANTAGE wraps existing functionality with AI in Phase 3+ |

## Feature Dependencies

```
Authentication -----> Profile Creation -----> Skills Taxonomy
                           |                      |
                           v                      v
                    CV/Resume Upload         Challenge Posting
                           |                      |
                           v                      v
                    Skills Extraction    <--- Basic Matching
                                               |
                                               v
                                        Engagement (paid/unpaid)
                                               |
                              +----------------+----------------+
                              |                |                |
                              v                v                v
                    Payment Processing   Contribution      Messaging
                    (Stripe Connect)      Tracking
                              |                |
                              v                v
                    Earnings Dashboard   Impact Dashboard
                                               |
                                               v
                                    Wellbeing Measurement
                                    (WEMWBS / ONS4)

Phase 2+ Dependencies:
    Contribution Tracking --> Circles (team formation)
    Circles --> Circle Workspace (shared notes, files)
    Circles --> WhatsApp Deep Links (circle group chat)
    Impact Dashboard --> Institutional Embedding (local dashboards)
    All of the above --> VANTAGE AI Interface (Phase 3+)
```

## MVP Recommendation

**Prioritise (Phase 1 -- pilot with 50-100 contributors):**

1. **Authentication + Profile Creation** -- gate to everything else
2. **CV/Resume Upload with AI skills extraction** -- reduces onboarding friction massively. Use an LLM to parse uploaded CVs into structured skills/experience. This is the "wow" moment in onboarding
3. **Challenge posting and basic matching** -- core value loop. Organisations post, professionals are matched
4. **Dual contribution tracking** -- THE differentiator. Track paid and unpaid from day one
5. **Payment processing (Stripe Connect)** -- required for paid engagements. Platform revenue depends on this
6. **Email notifications** -- minimum viable communication
7. **User + Organisation dashboards** -- central hub for activity
8. **Responsive web design** -- accessible on any device

**Defer to Phase 2:**

- **Circles (team formation):** Need enough active users to form meaningful teams. Pilot with individual matching first
- **PWA features (offline, install):** Nice to have but not blocking for pilot
- **Push notifications:** Email is sufficient for pilot scale
- **Wellbeing measurement (WEMWBS):** Schedule first survey at 3-month mark. Implement the survey mechanism in Phase 2
- **External social integration (WhatsApp):** Add when Circles launch
- **Institutional embedding:** Add when expanding beyond initial pilot locations
- **Impact dashboard (public-facing):** Build once there's enough data to show meaningful impact

**Defer to Phase 3+:**

- **VANTAGE AI agent:** Build on top of solid data and proven workflows
- **Advanced AI matching:** Need engagement data to train on
- **Contribution certificates / badges:** Nice to have, not blocking
- **Complex reporting for funders:** Build when seeking scale funding

## Unique Considerations for 50-75+ Demographic

| Consideration | Implication |
|---------------|-------------|
| **Larger font sizes, high contrast** | Default to 16px+ body text, WCAG AA contrast ratios minimum |
| **Clear navigation, minimal nesting** | Flat information architecture. No hamburger menus hiding critical features |
| **Familiar patterns** | Use standard web conventions. No clever UI tricks. Forms that look like forms |
| **Error recovery** | Clear error messages, easy undo, autosave. This demographic is less tolerant of losing work to a misclick |
| **Terminology** | "Challenges" not "gigs". "Contributors" not "freelancers". "Circles" not "squads". Language matters for dignity |
| **Onboarding support** | Expect some users will need guided onboarding at a community centre. Design for assisted setup |
| **Trust signals** | Show institutional backing, social enterprise status, data privacy commitments prominently |

## Sources

- [Consulting Success - Consulting Marketplaces Guide](https://www.consultingsuccess.com/consulting-marketplaces) - marketplace feature comparison
- [Toptal Screening Process](https://www.toptal.com/top-3-percent) - vetting and onboarding
- [Catalant Marketplace](https://catalant.com/marketplace/) - project posting and matching
- [Expert360 on Capterra](https://www.capterra.com/p/181181/Expert360/) - platform features and pricing
- [MentorCruise](https://mentorcruise.com/) - mentoring marketplace features
- [Flexiple - MentorCruise Review](https://flexiple.com/reviews/mentorcruise) - mentor pricing and communication tools
- [Stripe Connect](https://stripe.com/connect) - marketplace payment splits
- [Stripe Connect Documentation](https://docs.stripe.com/connect) - platform payment features
- [Better Impact](https://www.betterimpact.com) - volunteer management and hours tracking
- [GivePulse](https://learn.givepulse.com/volunteer-management) - impact metrics and contribution tracking
- [WEMWBS - University of Warwick](https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/) - validated wellbeing scale
- [WEMWBS Development and UK Validation (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2222612/) - psychometric validation
- [WhatsApp Groups API (Sanuker)](https://sanuker.com/whatsapp-groups-api-en/) - 8-person group limit, integration capabilities
- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) - PWA features and offline capability
- [Wise Age UK](https://wiseage.org.uk/) - UK social enterprise for 50+ workers
- [UnLtd - Social Enterprise and Ageing](https://www.unltd.org.uk/blog/insights/reimagining-ageing-how-social-enterprise-can-help-us-all-grow-old-well/) - social enterprise for older adults

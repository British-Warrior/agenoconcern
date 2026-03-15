# Indomitable Unity

## What This Is

Indomitable Unity is a social enterprise platform that deploys experienced professionals (50-75+) who have been involuntarily excluded from the workforce into paid advisory work and unpaid community contribution. It addresses the "pension gap" — the ~12-year financial void between involuntary career exit (~55) and state pension eligibility (67+ UK). The platform is an MCP server exposing 14 domain tools, with a React/Vite web UI that VANTAGE (Kirk's adaptive AI agent) will overlay as the sole interface. v1.0 MVP shipped 2026-03-15 with all 50 requirements satisfied — pilot-ready for East Midlands deployment.

## Core Value

Experienced professionals can upload their CV, get matched to real challenges, collaborate in cross-functional Circles, and earn income — bridging the pension gap while contributing to their communities.

## Requirements

### Validated

- ✓ CV upload → automated profile generation (< 5 minutes, zero form-filling) — v1.0
- ✓ OAuth authentication (Google, LinkedIn) + email/password — v1.0
- ✓ Challenge board with filtering and "express interest" — v1.0
- ✓ Simple scoring-based matching algorithm — v1.0
- ✓ Circle formation (3-7 members, community manager confirms) — v1.0
- ✓ Circle workspace (notes feed, member list, external social channel link) — v1.0
- ✓ Resolution template and structured submission — v1.0
- ✓ Stripe Connect integration (contributor onboarding, 75/25 payment splits) — v1.0
- ✓ Knowledge Transition retainer payment flow — v1.0
- ✓ Premium challenge stipend payment flow — v1.0
- ✓ Wellbeing check-ins (UCLA Loneliness Scale + WEMWBS, every 8 weeks) — v1.0
- ✓ Impact tracking (contributor dashboard — challenges, hours, earnings, unpaid contribution) — v1.0
- ✓ PWA push notifications + email fallback — v1.0
- ✓ External social deep links (WhatsApp, Slack, Discord, Teams, Signal) — v1.0
- ✓ MCP server exposing 14 tools across 4 domains (Contributors, Challenges, Circles, Wellbeing) — v1.0
- ✓ Basic web UI for all contributor-facing flows (VANTAGE overlays later) — v1.0
- ✓ PWA configuration (manifest, service worker, home screen install) — v1.0

### Active

## Current Milestone: v1.1 Pilot-Ready

**Goal:** Make the platform usable for real pilot deployment — fix critical UX issues, enable VANTAGE AI overlay, add kiosk mode for institutional embedding, and give challengers their own portal.

**Target features:**
- UX overhaul (10 issues from walkthrough: navigation, dashboard, wellbeing visualisation, CM views, affordances)
- VANTAGE integration (stable API URLs, API key auth, locked endpoint contracts)
- Kiosk mode for libraries and community centres (large buttons, auto-logout, guided flows)
- Challenger portal (organisation accounts, challenge submission, progress tracking, resolution rating)

### Out of Scope

- Admin dashboard — community manager uses spreadsheet exports + monthly reports
- Public marketing site — single landing page with sign-up only
- Challenger self-service portal — ~~email intake, manual posting for first 100 challenges~~ (moved to Active for v1.1)
- AI/ML matching — simple scoring + manual oversight; ML is v2
- Native mobile app — PWA via web UI handles mobile
- Internal messaging — external apps (WhatsApp/Slack/Discord) handle this
- Gamification — no badges, leaderboards, points. These are professionals.
- Complex analytics dashboard — database queries + spreadsheet exports
- Tax/invoicing system — Stripe receipts; contributors handle own tax
- Multi-language — English only at pilot
- Video conferencing — external tools (Zoom, Teams, Google Meet)
- Real-time chat — external social apps handle conversation

## Context

- **Founder:** Kirk Harper, Neurosync Technologies
- **Target demographic:** Digitally literate professionals aged 50-75+ who were using enterprise software last week. Not elderly people struggling with technology. Framing must reflect this.
- **Brand tone:** Defiant, not sympathetic. Warm, not corporate. Blunt, not patronising.
- **Tagline:** "Deploying Expertise That Hasn't Passed Its Sell-By Date."
- **Brand name:** "Indomitable Unity" — name reflects defiance and collective strength. Professionals united, refusing to be sidelined.
- **VANTAGE:** Kirk's pre-built adaptive AI agent — will become the sole interface post-MVP. For MVP, we build a basic web UI that VANTAGE can be overlaid onto. Architecturally aligned with Google's Natively Adaptive Interfaces (NAI) framework (Feb 2026).
- **Institutional embedding:** Platform embeds in libraries, community centres, Women's Institute, voluntary organisations — not a standalone app.
- **Pilot plan:** East Midlands, UK. 50-100 contributors, 20-30 challenges, 3-5 institutional partnerships, 1 community manager, 6-month duration.
- **Funding:** NLCF Community Power Fund £80k (primary for MVP), UnLtd Awards £5-15k, Awards for All £300-£20k. MVP build within Community Power Fund budget.
- **Key contact:** Maria Zappala GAICD — Australian board director, AI governance & anti-ageism advocate. Potential advisory board member.

### Current State (v1.0 shipped)

- **Codebase:** 16,650 lines TypeScript/TSX/CSS across 223 files
- **Tech stack:** Node.js/TypeScript monorepo, Express server, React/Vite frontend, PostgreSQL (Drizzle ORM), Stripe Connect, S3, OpenAI, web-push, Resend
- **Architecture:** MCP server (14 tools) + REST API + React SPA (PWA)
- **Known tech debt:** 7 items (see milestone audit) — none blocking pilot
- **Legal pre-launch:** Employment Agencies Act 1973 classification, WEMWBS licence registration, DPIA/APD completion

### Data Model (6 Core Entities)

1. **Contributor** — id, name, email, auth_provider, cv_file_url, parsed_profile (JSON), availability, preferences (JSON), stripe_connect_id, wellbeing_scores, status
2. **Challenge** — id, title, brief, domain, skills_needed, perspectives_needed, type (community/premium/knowledge_transition), payment (JSON), challenger (JSON), deadline, status
3. **Circle** — id, challenge_id (FK), members (JSON array), max_members (3-7), social_channel (JSON), status
4. **CircleNote** — id, circle_id (FK), contributor_id (FK), content, attachments, type (note/file/decision/milestone)
5. **Resolution** — id, circle_id (FK), challenge_id (FK), content (JSON with recommendations), feedback (JSON), submitted_at
6. **WellbeingCheckin** — id, contributor_id (FK), ucla_loneliness_score, wemwbs_score, freetext_note, completed_at

### MCP Server Tools (14 across 4 domains)

**Contributors:** get_contributor_profile, update_contributor_profile, get_contributor_circles, get_contributor_impact
**Challenges:** list_challenges, get_challenge_detail, express_interest, submit_challenge
**Circles:** get_circle_detail, add_circle_note, get_circle_notes, submit_resolution, update_social_link
**Wellbeing:** submit_wellbeing_checkin

### Revenue Model

1. Knowledge Transition retainers (75/25 split, £1-3k/month, 3-12 months)
2. Premium challenge stipends (75/25 split, fixed project fee)
3. SME subscriptions (monthly/annual access to expertise pool)
4. Community challenges (free — contribution formally recognised)
5. Commissioner grants (local authorities, NHS)

### Non-Negotiable Principles

1. The pension gap is the core problem — not loneliness, not boredom
2. Not everything valuable is billable — recognise unpaid community contribution
3. Community first, not platform first — embed in existing institutions
4. Target demographic is digitally literate — don't patronise
5. VANTAGE is the sole interface (post-MVP) — one codebase, one experience
6. CV upload as onboarding — zero form-filling beyond confirming parser output

## Constraints

- **Tech stack:** Node.js/TypeScript backend (MCP server), PostgreSQL, Stripe Connect, S3-compatible storage, React/Vite basic web UI
- **Budget:** MVP within NLCF Community Power Fund £80k
- **Timeline:** Pilot-ready MVP for East Midlands deployment
- **Auth:** OAuth 2.0 (Google + LinkedIn) + email/password. LinkedIn login doubles as profile data source.
- **Payments:** Stripe Connect marketplace model. 75/25 splits. No custom invoicing.
- **CV parsing:** Open-source parser + LLM extraction (research needed on best approach)
- **Social:** External apps for conversation (WhatsApp/Slack/Discord/Teams/Signal). Platform provides deep links only.
- **Wellbeing instruments:** UCLA Loneliness Scale (short form) + WEMWBS. Validated, standardised.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCP server architecture | VANTAGE integration requires tool-based API; future-proof for agentic interfaces | ✓ Good — 14 tools across 4 domains |
| Basic web UI for MVP | Need pilot-ready interface before VANTAGE overlay; gives contributors immediate access | ✓ Good — full contributor flows delivered |
| React/Vite for web UI | Consistent with Kirk's other projects (iLearn LSS); fast iteration | ✓ Good — PWA with service worker |
| External social over internal chat | Don't compete with WhatsApp/Slack; reduce build scope; people already have preferences | ✓ Good — 5 platform deep links |
| 75/25 payment split | Industry-standard marketplace split; contributor-favourable; sustainable for platform | ✓ Good — all 3 payment flows working |
| Semi-manual challenge intake | Community manager curates quality for first 100 challenges; self-service is v2 | ✓ Good — CM admin interface delivered |
| CV upload as onboarding | Reduces friction; emotionally reframes from job-seeking rejection to expertise deployment | ✓ Good — < 5 min end-to-end |
| Match scoring in TypeScript (not SQL) | Drizzle JSONB arrayOverlaps bug #4935; TS scoring is more flexible | ✓ Good — avoids ORM bug, easy to tune |
| Shared package as TS source (no build step) | Simpler DX for monorepo at pilot scale | ✓ Good — zero build overhead |
| Tailwind v4 CSS-first with OKLCH | WCAG AAA compliance (7:1+ contrast ratios), modern color space | ✓ Good — accessible from day one |
| Wellbeing in Phase 6 (not Phase 2) | DPIA/APD legal work must precede code; all personal data stores needed first | ✓ Good — complete data model available |

| Kiosk mode for institutional embedding | Libraries/community centres need simplified interface for shared computers | — Pending |
| Challenger portal (v1.1) | Organisations need self-service to scale beyond CM manual intake | — Pending |
| VANTAGE REST integration over MCP | VANTAGE calls REST APIs directly with typed client modules, not MCP | ✓ Good — aligns with existing architecture |

---
*Last updated: 2026-03-15 after v1.1 milestone start*

# AGE NO CONCERN — Complete Build Overview

## For: Claude Code / Get Shit Done Platform
## Author: Kirk Harper, Neurosync Technologies
## Date: March 2026
## Status: MVP Build-Ready

---

## 1. WHAT THIS IS

Indomitable Unity is a social enterprise platform that rebuilds community, purpose, and income for experienced professionals aged 50–75+ who have been involuntarily excluded from the workforce. It addresses the "pension gap" — the approximately 12-year financial void between involuntary workforce exit (typically around age 55) and state pension eligibility (age 67+ in the UK, 67 in Australia).

**It is NOT:** A job board. A charity. A gig economy platform. A social network for old people.

**It IS:** An intelligence platform that deploys professional expertise through paid advisory work AND unpaid community contribution, mediated by an adaptive AI agent (VANTAGE) that adjusts to each user's capabilities in real time.

**Tagline:** "Deploying Expertise That Hasn't Passed Its Sell-By Date."

---

## 2. CORE PRINCIPLES (Non-Negotiable)

1. **The pension gap is the core problem** — not loneliness, not boredom.
2. **Not everything valuable is billable** — recognise unpaid community contribution alongside paid advisory work.
3. **Community first, not platform first** — embed in existing local institutions.
4. **The target demographic is digitally literate** — not elderly people struggling with technology.
5. **VANTAGE is the sole interface** — one codebase, one experience. No separate "accessibility mode."
6. **CV upload as onboarding** — reduces friction and emotionally reframes the experience.

---

## 3. ARCHITECTURE

### 3.1 The Paradigm Shift

```
[User] <---> [VANTAGE AI Agent] <---> [Indomitable Unity MCP Server (Domain Layer)]
```

- VANTAGE handles ALL user interaction through conversation (voice, text, simplified visual, motor-adapted)
- Indomitable Unity is an MCP server that exposes domain logic as tools
- VANTAGE calls these tools to execute platform operations on behalf of the user

### 3.2 MCP Server Architecture — 14 Tools Across 4 Domains

**Contributors Domain:**
- `get_contributor_profile` — retrieve contributor's parsed profile
- `update_contributor_profile` — update expertise, availability, preferences
- `get_contributor_circles` — list all active Circles for a contributor
- `get_contributor_impact` — hours, challenges, earnings, wellbeing scores

**Challenges Domain:**
- `list_challenges` — browse/filter available challenges
- `get_challenge_detail` — full brief for a specific challenge
- `express_interest` — contributor signals interest in a challenge
- `submit_challenge` — challenger submits a new challenge

**Circles Domain:**
- `get_circle_detail` — members, brief, status, social channel link
- `add_circle_note` — post a note/file to the Circle workspace
- `get_circle_notes` — retrieve workspace content
- `submit_resolution` — Circle submits structured output/recommendation
- `update_social_link` — set/change the external social channel

**Wellbeing Domain:**
- `submit_wellbeing_checkin` — periodic wellbeing assessment (UCLA + WEMWBS)

### 3.3 Technology Stack

| Layer | Technology |
|-------|-----------|
| Interface | VANTAGE (Kirk's built AI agent) |
| Backend / MCP Server | Node.js / TypeScript |
| Database | PostgreSQL |
| Search / Matching | PostgreSQL full-text + simple scoring |
| Payments | Stripe Connect |
| Auth | OAuth 2.0 (Google, LinkedIn) + email/password |
| File Storage | S3-compatible (AWS S3 or Cloudflare R2) |
| CV Parsing | Open-source parser + LLM extraction |
| Notifications | Push (PWA) + email (SendGrid/Postmark) |
| Hosting | Vercel or Railway + managed PostgreSQL |
| External Social | Deep links / URI schemes |

---

## 4. DATA MODEL — 6 Core Entities

### Contributor
- id, name, email, auth_provider, cv_file_url, parsed_profile (JSON), availability, preferences (JSON), stripe_connect_id, wellbeing_scores, status, timestamps

### Challenge
- id, title, brief, domain, skills_needed, perspectives_needed, type (community/premium/knowledge_transition), payment (JSON with model/amount/split), challenger (JSON), deadline, status, timestamps

### Circle
- id, challenge_id (FK), members (JSON array), max_members (3-7), social_channel (JSON), status, timestamps

### CircleNote
- id, circle_id (FK), contributor_id (FK), content, attachments, type (note/file/decision/milestone), timestamps

### Resolution
- id, circle_id (FK), challenge_id (FK), content (JSON with recommendations), feedback (JSON), submitted_at

### WellbeingCheckin
- id, contributor_id (FK), ucla_loneliness_score, wemwbs_score, freetext_note, completed_at

---

## 5. MVP FEATURES

1. **Onboarding** — CV upload → parse → editable profile → Stripe Connect (optional) → wellbeing check-in → live in <5 min
2. **Challenge Board** — browseable/filterable feed, express interest, recommended matches
3. **Matching & Circle Formation** — simple scoring, manual community manager confirmation, 3-7 members
4. **Circle Workspace** — notes feed, member list, social channel link, resolution template
5. **External Social** — deep links to WhatsApp/Slack/Discord/Teams/Signal
6. **Payments** — Stripe Connect: KT retainers (75/25), premium stipends, SME subscriptions
7. **Impact Tracking** — basic counters, contributor dashboard, spreadsheet exports
8. **Wellbeing Check-ins** — UCLA Loneliness Scale + WEMWBS every 8 weeks
9. **Notifications** — PWA push + email fallback

---

## 6. REVENUE MODEL

1. **Knowledge Transition retainers** (75/25 split, £1-3k/month)
2. **Premium challenge stipends** (75/25 split)
3. **SME subscriptions** (monthly/annual)
4. **Community challenges** (free, contribution recognised)
5. **Commissioner grants** (local authorities, NHS)

---

## 7. BUILD PRIORITY ORDER

### Phase 1: Foundation
1. PostgreSQL schema (all six core entities)
2. MCP server skeleton (Node.js/TypeScript, 14 tools stubbed)
3. Auth (OAuth 2.0 — Google + LinkedIn + email)
4. CV upload + S3 storage
5. CV parsing pipeline

### Phase 2: Core Loop
6. Challenge Board (list, filter, express interest)
7. Matching algorithm (simple scoring)
8. Circle formation (manual confirm)
9. Circle workspace (notes, members, social link)
10. Resolution template and submission

### Phase 3: Money + Metrics
11. Stripe Connect integration
12. Knowledge Transition retainer flow
13. Premium challenge payment flow
14. Impact tracking

### Phase 4: Wellbeing + Polish
15. Wellbeing check-in (UCLA + WEMWBS)
16. Notification system (PWA push + email)
17. External social deep links
18. PWA configuration

### Phase 5: VANTAGE Integration
19. Connect VANTAGE to MCP server
20. Conversational flows for all 14 tools
21. Adaptive output testing
22. End-to-end voice flow

---

## OUT OF MVP SCOPE

Admin dashboard, public marketing site, challenger self-service portal, AI matching, native app, internal messaging, gamification, complex analytics, tax/invoicing, multi-language, video conferencing.

---

## FUNDING

- NLCF Community Power Fund — £80k (primary for MVP)
- UnLtd Awards — £5–15k seed
- Awards for All — £300–£20k pilot
- Horizon Europe Cluster 2 — €3–4m (post-pilot)
- EIC Accelerator — potential

## PILOT

East Midlands, UK. 50–100 contributors, 20–30 challenges, 3–5 institutional partnerships, 6 months.

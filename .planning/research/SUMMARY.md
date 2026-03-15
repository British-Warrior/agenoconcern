# Project Research Summary

**Project:** Indomitable Unity
**Domain:** Social enterprise expertise marketplace (UK, 50-75+ demographic)
**Researched:** 2026-03-10
**Confidence:** MEDIUM-HIGH

## Executive Summary

Indomitable Unity is a two-sided marketplace connecting experienced professionals (50-75+) with organisations needing advisory expertise, while simultaneously tracking unpaid community contribution. The platform combines an MCP server backend (14 tools across 4 domains) with a React/Vite web UI for MVP, with the MCP server designed to serve a future VANTAGE AI agent as the primary interface. Experts build this type of platform with a shared domain service layer that both REST routes and MCP tool handlers call into -- this is the single most important architectural decision, as it makes the VANTAGE transition seamless rather than a rewrite.

The recommended approach is: Express accounts with destination charges on Stripe Connect, LLM-based CV parsing (not regex-based npm packages), email/password as primary auth with LinkedIn/Google OAuth as optional enrichment, and Drizzle ORM over PostgreSQL with a hybrid normalized/JSONB schema. The stack aligns with Kirk's existing iLearn LSS patterns (React/Vite, Tailwind, Express, PostgreSQL) to minimize learning curve. The platform should launch supply-first in the East Midlands with 30-50 contributors recruited before approaching any challengers.

The three highest-risk areas are: (1) UK GDPR compliance for wellbeing data (special category data requiring DPIA, APD, and separate storage before any code is written), (2) potential Employment Agencies Act 1973 classification (deploying professionals for pay may require registration -- get legal advice before building), and (3) marketplace cold-start with a high-touch demographic that won't respond to standard growth tactics. All three must be addressed before or during Phase 1, not deferred.

## Key Findings

### Recommended Stack

The stack mirrors Kirk's iLearn LSS project for consistency: React 19 / Vite 6 / Tailwind 4 frontend, Express 4 / TypeScript 5.7 / Node 22 LTS backend, PostgreSQL 16 with Drizzle ORM. The MCP server uses the official `@modelcontextprotocol/sdk` (v1.27.x) with Streamable HTTP transport for future VANTAGE integration. Key additions beyond the standard stack are Stripe Connect for marketplace payments, Arctic for lightweight OAuth (replacing Passport.js), and a two-stage CV parsing pipeline using pdf-parse + mammoth for text extraction followed by LLM-based structured extraction validated with Zod.

**Core technologies:**
- **MCP SDK + Express:** Dual-interface server -- REST for web UI, MCP for AI agents -- sharing one domain service layer
- **Drizzle ORM:** SQL-like, TypeScript-first, no binary engine (unlike Prisma), 85% smaller bundle, full query control for marketplace search patterns
- **Stripe Connect (Express accounts):** Destination charges with 25% platform fee, Stripe-hosted KYC/onboarding, GBP currency
- **Arctic + Argon2 + jose:** Lightweight OAuth for Google/LinkedIn, Argon2id password hashing (OWASP recommended), jose for JWTs
- **pdf-parse + mammoth + LLM:** Two-stage CV parsing -- deterministic text extraction then LLM structured extraction with Zod validation
- **Resend:** Transactional email with 3,000/month free tier, React Email templates
- **vite-plugin-pwa:** PWA support deferred to Phase 2 but architecture-ready

### Expected Features

**Must have (table stakes):**
- Profile creation with CV upload and AI-assisted skills extraction
- Challenge/project posting (paid and unpaid using same format)
- Basic matching (search/filter by skills, location, availability)
- Stripe Connect payment processing with platform fee
- Email notifications for matches, messages, payments
- User and organisation dashboards showing both paid and unpaid activity
- Authentication (email/password primary, OAuth secondary)
- Responsive web design (mobile-first, no native app)

**Should have (differentiators):**
- Dual contribution tracking (paid + unpaid in single ledger) -- THE core differentiator
- Impact dashboard with social proof (exportable for funding bids)
- Wellbeing measurement (WEMWBS/ONS4) -- powerful for social impact reporting
- WhatsApp deep links for circle coordination (not in-platform chat)
- Contribution recognition (milestone markers, not gamification)

**Defer (v2+):**
- Circles (teams of 3-7) -- need active user base first
- PWA offline capability and push notifications
- VANTAGE AI agent interface
- Institutional embedding (library/community centre integration)
- Advanced AI matching (need engagement data first)

**Anti-features (do NOT build):**
- In-platform video/voice (use Zoom/Teams/WhatsApp)
- Job board / gig economy features (destroys social enterprise model)
- Gamification / leaderboards (patronising for this demographic)
- Automated vetting (disrespectful to 30-year veterans)
- Marketplace bidding / price competition

### Architecture Approach

The architecture centres on domain services as the single source of truth. Both Express REST routes (for the web UI) and MCP tool handlers (for VANTAGE) are thin wrappers over the same service layer. This eliminates logic duplication and makes the future VANTAGE integration a matter of connecting an MCP client, not rebuilding business logic. The monorepo uses pnpm workspaces with three packages: `server` (Express + MCP, single deployable), `web` (React/Vite), and `shared` (types, validation schemas).

**Major components:**
1. **Express Gateway** -- REST API for web UI + MCP Streamable HTTP endpoint for AI clients + Stripe webhook receiver
2. **Domain Services** -- All business logic (matching, payments, profiles, circles, CV parsing, email) shared by both interfaces
3. **PostgreSQL + Drizzle** -- 8 core tables with hybrid normalized/JSONB schema, pgEnums for status fields, junction tables for relationships
4. **React Web UI** -- TanStack Query for server state, React Router for navigation, Tailwind for styling, accessibility-first design system

### Critical Pitfalls

1. **Wellbeing data is GDPR special category data** -- Requires DPIA, Appropriate Policy Document, separate storage with separate encryption, and explicit consent BEFORE writing any wellbeing code. ICO enforcement risk is real.

2. **Stripe Connect account type is nearly irreversible** -- Must choose Express accounts + destination charges upfront. Wrong choice means full payment integration rewrite. Document the decision and rationale.

3. **LinkedIn OAuth tokens expire after 60 days with no guaranteed refresh** -- Never use LinkedIn as sole auth method. Email/password must be primary. LinkedIn is optional profile enrichment only.

4. **CV parsing accuracy with 50-75 year old CVs** -- Older formats, longer histories, UK conventions reduce accuracy. Must use LLM-based parsing (not regex), show results as editable draft with confidence scores, and store original files.

5. **Marketplace cold-start** -- Supply-first recruitment is mandatory. Recruit 30-50 contributors before approaching challengers. Concierge the first matches manually. Don't delay launch for perfect features.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Auth
**Rationale:** Everything depends on the monorepo structure, database schema, auth system, and Express gateway. These have zero external dependencies and must exist before any feature work. Auth decisions (email/password primary, LinkedIn optional) are architecturally locked here.
**Delivers:** Running monorepo, database with migrations, Express server with auth middleware, React shell with login/register, basic contributor and organisation profiles
**Addresses:** Authentication, profile creation, responsive web design, organisation profiles
**Avoids:** LinkedIn-as-sole-auth pitfall, bundled GDPR consent (implement granular consent model from day one), accessibility failures (set 16px base / 7:1 contrast in design system immediately)

### Phase 2: Core Marketplace Loop
**Rationale:** The minimum viable marketplace requires CV upload, challenge posting, and basic matching. These form the core value loop that makes the platform useful. CV parsing is the "wow moment" in onboarding.
**Delivers:** CV upload with LLM-based parsing and editable review screen, challenge posting (paid + unpaid), skills taxonomy, basic search/filter matching, challenge interest expression
**Addresses:** CV/resume upload, skills taxonomy, challenge posting, basic matching, dual contribution tracking (start tracking from day one)
**Avoids:** CV parsing trust destruction (editable draft + confidence scores), cold-start (focus on contributor onboarding quality)

### Phase 3: Payments and Engagement
**Rationale:** Stripe Connect requires working profiles and challenges to test against. Payment flows depend on the engagement model being functional. Refund/dispute handling must be designed alongside payment flows, not bolted on.
**Delivers:** Stripe Connect onboarding for contributors, destination charges with 25% platform fee, webhook handling with idempotency, payout delay for dispute window, engagement lifecycle management
**Addresses:** Payment processing, earnings dashboard, email notifications for payment events
**Avoids:** Stripe account type lock-in (Express + destination charges locked in Phase 1 design), refund/dispute edge cases (payout delays, dispute webhooks from day one), FCA wallet/e-money risks (Stripe holds all funds)

### Phase 4: Messaging, Dashboards, and Polish
**Rationale:** With the core loop and payments working, add the communication and visibility layer. Lightweight messaging for coordination, user dashboards, and contribution tracking create a complete pilot-ready experience.
**Delivers:** In-platform messaging (notifications/coordination only), contributor and organisation dashboards, contribution tracking (paid + unpaid), search and discovery improvements, admin dashboard
**Addresses:** Messaging, user dashboard, basic search, notification system (email)

### Phase 5: Impact and Wellbeing
**Rationale:** Wellbeing features require DPIA and APD as legal prerequisites. Impact dashboards need accumulated data to be meaningful. Defer to here so legal groundwork is done properly and there's enough data to show.
**Delivers:** WEMWBS/ONS4 wellbeing surveys with separate storage/consent, impact dashboard, contribution recognition milestones
**Addresses:** Wellbeing measurement, impact dashboard, contribution recognition
**Avoids:** Special category data violations (DPIA/APD completed before code), stale cached questionnaires (versioned surveys, network-first caching)

### Phase 6: PWA, Circles, and Social Integration
**Rationale:** PWA features and Circles need a stable, tested core platform. Circles need enough active users to form meaningful teams. WhatsApp deep links pair with Circles.
**Delivers:** PWA with offline profile/dashboard access, Circles (teams of 3-7), WhatsApp deep links for circle coordination, push notifications (email remains primary)
**Avoids:** iOS push notification unreliability (email/SMS primary, push as enhancement)

### Phase 7: VANTAGE AI Integration
**Rationale:** VANTAGE requires solid data foundation and proven workflows from Phases 1-6. The MCP server and domain services are already built -- VANTAGE connects as an MCP client to the existing Streamable HTTP endpoint.
**Delivers:** MCP auth for AI clients, VANTAGE connected as primary interface, AI-enhanced matching using engagement data
**Addresses:** VANTAGE AI agent interface, advanced AI matching

### Phase Ordering Rationale

- **Auth before everything** because every feature requires authenticated users, and the LinkedIn token expiry decision must be locked early
- **CV parsing before payments** because contributor profiles must exist before they can be matched and paid
- **Payments before dashboards** because dashboards need real transaction data to display
- **Wellbeing deferred to Phase 5** because DPIA/APD legal work takes time and shouldn't block the core marketplace launch
- **VANTAGE last** because it wraps existing functionality -- building AI-first before the data foundation exists guarantees shipping nothing

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Payments):** Stripe Connect destination charges with refund/dispute handling -- edge cases are well-documented but implementation-specific. Also: Employment Agencies Act legal question must be resolved before this phase.
- **Phase 5 (Wellbeing):** WEMWBS licensing from University of Warwick, DPIA process, APD requirements -- regulatory/legal research, not technical.
- **Phase 7 (VANTAGE):** MCP Streamable HTTP auth patterns, VANTAGE-specific client integration -- spec is evolving.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented auth patterns, standard monorepo setup, established Express/React patterns
- **Phase 2 (Core Marketplace):** LLM-based CV parsing is well-documented, challenge CRUD is standard
- **Phase 4 (Messaging/Dashboards):** Standard CRUD and notification patterns
- **Phase 6 (PWA):** vite-plugin-pwa has excellent documentation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm with recent publish dates. Aligns with Kirk's existing patterns. |
| Features | MEDIUM | Feature landscape based on comparable platforms (Catalant, Expert360, MentorCruise). No direct competitor for the 50-75 paid+unpaid model -- ANC is genuinely novel. |
| Architecture | HIGH | MCP SDK patterns well-documented. Express gateway pattern is the recommended approach. Drizzle schema patterns are standard PostgreSQL. |
| Pitfalls | HIGH | GDPR/ICO guidance is authoritative. Stripe Connect documentation is thorough. LinkedIn OAuth limitations are well-documented. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Employment Agencies Act 1973 classification:** Legal advice needed before building. If "deploying expertise for pay" triggers registration requirements, the business model needs a different legal wrapper. This is a blocking question.
- **WEMWBS licensing:** Free for non-commercial use, but ANC is a social enterprise taking platform fees. Verify licensing terms with University of Warwick before implementing.
- **Stripe Accounts v2 API:** Research recommended starting with v1 Express accounts for MVP. Monitor v2 maturity for potential migration at scale.
- **MCP OAuth 2.1 for HTTP transport:** Spec is evolving. Verify requirements at Phase 7 implementation time. stdio transport for local dev doesn't require it.
- **Accessibility testing with actual 50-75 year olds:** No amount of WCAG compliance replaces real user testing with the target demographic. Build feedback mechanisms into the pilot.
- **Cloudflare R2 vs AWS S3:** R2 recommended for zero egress fees, but verify S3 SDK compatibility and any feature gaps at implementation time.

## Sources

### Primary (HIGH confidence)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- server patterns, tool registration, transport
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) -- protocol requirements
- [Stripe Connect Documentation](https://docs.stripe.com/connect) -- Express accounts, destination charges, webhooks
- [ICO: Special Category Data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/) -- GDPR wellbeing data classification
- [LinkedIn Authentication](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication) -- 60-day token expiry
- [W3C: Older Users and Web Accessibility](https://www.w3.org/WAI/older-users/) -- accessibility requirements
- [WEMWBS - University of Warwick](https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/) -- validated wellbeing scale

### Secondary (MEDIUM confidence)
- [Drizzle vs Prisma comparisons](https://www.bytebase.com/blog/drizzle-vs-prisma/) -- ORM selection rationale
- [Arctic OAuth library](https://arcticjs.dev/) -- lightweight OAuth client for Google/LinkedIn
- [Resend](https://resend.com/pricing) -- email API pricing and features
- [Consulting Success - Marketplace Guide](https://www.consultingsuccess.com/consulting-marketplaces) -- feature comparison
- [Cold-start problem patterns](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace) -- marketplace strategy

### Tertiary (LOW confidence)
- [Stripe UK Payment Regulations](https://stripe.com/resources/more/uk-payment-regulations) -- FCA/EMI classification (needs legal counsel verification)
- [Employment Agencies Act implications](https://docs.stripe.com/connect) -- inferred risk, not directly confirmed for this model

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*

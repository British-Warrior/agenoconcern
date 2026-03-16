# Project Research Summary

**Project:** Indomitable Unity v1.1
**Domain:** Social enterprise platform — expertise marketplace with wellbeing measurement, institutional embedding, and AI agent integration
**Researched:** 2026-03-15
**Confidence:** HIGH (stack additions and architecture grounded in direct codebase inspection; features HIGH for UX/visualisation, MEDIUM for kiosk/VANTAGE, LOW for challenger portal comparators)

## Executive Summary

Indomitable Unity v1.1 is an incremental milestone on top of a fully validated v1.0 MVP. The existing stack (Node.js/TypeScript, Express 4, React 19/Vite 6, PostgreSQL/Drizzle, TanStack Query, React Router 7, Stripe, jose, Tailwind v4) is locked and must not be replaced. Three lightweight additions cover all new capability requirements: `recharts ^3.8.0` for wellbeing visualisation, `react-idle-timer ^5.7.2` for kiosk session management, and `express-rate-limit ^8.3.1` for VANTAGE API protection. All other new capabilities — kiosk render mode, challenger portal, RBAC — are built using existing primitives already in the codebase.

The recommended build order follows hard dependency chains: shared type and schema additions first (challenger role enum, new tables), then VANTAGE API key infrastructure (self-contained server addition), then the challenger portal (server routes before UI), then UX navigation (depends on all roles being defined), then kiosk mode (purely frontend, builds on cleaned-up AppShell). Crucially, 10 UX walkthrough fixes have no new dependencies and can be batched as a fast-track parallel track — they are P1 table-stakes that determine whether the product appears functional to new users.

The primary risks in v1.1 are security and data governance, not technical complexity. Four "never" patterns emerged consistently across all research files: API keys must never be stored in plaintext; cookie and API key auth paths must never be merged into a single middleware; kiosk logout must never be a client-side navigation without a server-side cookie-clearing POST; and challengers must never receive any wellbeing-derived data, even aggregated. Each of these has an irreversible recovery cost if shipped incorrectly. The challenger portal also carries the highest effort at roughly 3–4x the complexity of any other v1.1 feature, and should be deferred to its own phase, triggered only when a concrete organisational user is confirmed.

## Key Findings

### Recommended Stack

The v1.0 stack is validated and stable. For v1.1, only three npm packages are added. `recharts ^3.8.0` is the correct React-native SVG charting library — 3.6M weekly downloads, React 19 and Tailwind v4 OKLCH-compatible, with `RadialBarChart` (gauge) and `AreaChart` (trend line) covering all wellbeing visualisation requirements. `react-idle-timer ^5.7.2` handles kiosk idle detection with hook-based API, cross-tab coordination, and touch/keyboard events built in. `express-rate-limit ^8.3.1` provides ESM-native, TypeScript-typed rate limiting for VANTAGE endpoints.

The shadcn/ui chart component is copy-pasted as source (no npm dependency) and API keys are generated using Node.js's built-in `crypto` module — zero new dependencies for either concern. All RBAC is handled by extending the existing `jose` JWT payload with `org_id` and `org_role` claims, with thin Express middleware guards — no policy engine required at 3-role scale.

**Core technologies (new for v1.1):**
- `recharts ^3.8.0`: wellbeing gauges and trend charts — SVG reads Tailwind v4 CSS variables natively, React 19 confirmed compatible
- `react-idle-timer ^5.7.2`: kiosk idle detection — hook-based, handles touch/keyboard/mouse, cross-tab coordination
- `express-rate-limit ^8.3.1`: VANTAGE endpoint rate limiting — ESM-native, TypeScript included, no `@types/` package needed
- `shadcn/ui chart primitives` (copy-paste, no npm): ChartContainer/ChartTooltip wrappers eliminating hand-rolled tooltip/legend styling
- Node.js built-in `crypto`: API key generation and SHA-256 hashing — no new dependency

See `.planning/research/STACK.md` for full alternatives considered and version compatibility matrix.

### Expected Features

v1.1 adds five capability areas to the live v1.0 product. The 10 UX fixes are table stakes — they determine whether the platform appears functional to new users. No comparator platforms (Catalant, Expert360, Toptal) have wellbeing measurement, kiosk mode, or AI agent integration; these are genuine differentiators. The critical gap between comparators and v1.0 is that all comparators have persistent navigation and a functional dashboard — v1.0 currently has neither, making the UX overhaul the highest urgency work.

**Must have — v1.1 table stakes:**
- Global navigation fix (dashboard + challenges links absent from Navbar) — users are stranded without it
- Actionable dashboard (activity widgets) — empty dashboard destroys first-impression credibility
- Wellbeing score context (score/max + colour band label) — raw numbers are meaningless without scale
- Wellbeing trajectory line chart (Recharts) — longitudinal trend is the key impact evidence for funders
- CM circles fix (created circles not visible to CM) — CMs cannot find circles they made
- CM empty-state copy fix — wrong role context on the circles page
- Clickable affordance audit (cursor, hover states) — affordance failures cause abandonment
- Error message sanitisation (no raw UUIDs) — UUID in error message signals broken software
- Edit Resolution button visual fix — broken resolution editing destroys core workflow trust
- Circle formation member display fix — data integrity and trust issue
- Wellbeing check-in nav link — feature is currently unreachable except via dashboard banner
- Kiosk mode (idle timer + auto-logout + simplified nav) — required for institutional embedding
- VANTAGE typed client modules + API auth strategy — VANTAGE cannot call cookie-auth endpoints

**Should have — competitive differentiators (post-validation):**
- Challenger portal full flow — self-service org challenge submission; defer until first concrete org user confirmed
- Challenger status tracking page — challenger visibility into challenge progress
- Wellbeing benchmark line on chart (UK population average) — funder reporting context

**Defer to v2+:**
- Organisation SSO (NHS/local authority SAML/OIDC) — 3–6 month enterprise IT engagement
- VANTAGE conversational UI as primary interface — needs usage data foundation
- Contribution certificates (PDF export) — low priority vs core workflow fixes
- Multi-institution admin dashboard — needs multiple live institution partners

See `.planning/research/FEATURES.md` for full prioritisation matrix and domain-specific UX notes (SWEMWBS/UCLA score thresholds).

### Architecture Approach

v1.1 follows four architectural patterns determined by direct codebase inspection. Kiosk mode is a render-mode switch, not a separate build — URL path prefix `/kiosk/*` activates `KioskShell` instead of `AppShell`, same bundle, same API. VANTAGE API key auth is a standalone middleware applied to a separate `/api/v1/` route group, never merged with the existing cookie-based `authMiddleware`. The challenger role is added via a named Drizzle migration to the `contributor_role` PostgreSQL enum, and challenger routes sit under a dedicated `/api/challenger/` prefix with `requireRole("challenger")` guards. UX navigation overhaul adds a role-aware `Sidebar.tsx` and `MobileNavDrawer.tsx` without restructuring the existing AppShell contract.

**Major components:**
1. `middleware/api-key-auth.ts` (NEW) — validates `X-API-Key` header for VANTAGE, completely separate from `authMiddleware`
2. `routes/challenger.ts` (NEW) — challenger portal endpoints with atomic org+account registration
3. `KioskShell.tsx` + `KioskContext.tsx` + `useInactivityLogout.ts` (NEW) — kiosk render mode and session management
4. `Sidebar.tsx` + `MobileNavDrawer.tsx` + `NavLink.tsx` (NEW) — role-aware navigation
5. `db/schema.ts` (MODIFIED) — challenger role enum value, `challenger_organisations` table, FK on `challenges`
6. `shared/types/auth.ts` + `shared/schemas/challenger.ts` (MODIFIED/NEW) — type system extended for challenger role

Recommended build order per ARCHITECTURE.md: shared types + DB migration → VANTAGE API → challenger portal → UX navigation → kiosk mode.

See `.planning/research/ARCHITECTURE.md` for full integration map, data flow diagrams, and anti-pattern documentation.

### Critical Pitfalls

1. **React Query cache leaks personal data between kiosk users** — call `queryClient.clear()` (not `invalidateQueries()`) in kiosk logout handler. Recovery cost is HIGH if a leakage event is reported post-launch.

2. **Kiosk auto-logout not clearing HttpOnly cookies** — the idle timer MUST call `POST /api/auth/logout` server-side before any client navigation. JavaScript cannot delete HttpOnly cookies. A client-only navigate leaves the refresh token cookie intact, allowing the next user to silently re-authenticate as the previous person.

3. **Challenger enum added without a rollback-safe migration** — `ALTER TYPE ADD VALUE` in PostgreSQL executes outside a transaction and cannot be rolled back. Always use a named Drizzle migration file; never use `drizzle-kit push` for production. Plan for irreversibility before deploying.

4. **MCP tool handlers accept any `contributor_id` without scope check** — VANTAGE can act as any contributor if tool handlers do not verify the `contributor_id` parameter matches the API key's `scoped_contributor_id`. Enforce scope at tool handler level before any tool returns real data.

5. **Challenger portal returning contributor PII or wellbeing data** — circles have 3–4 members; aggregate wellbeing scores at that size are not k-anonymous and identify individuals. Never expose any wellbeing-derived data to challengers, even as aggregates. Write an integration test asserting absence of PII fields on every challenger-facing endpoint before it ships.

See `.planning/research/PITFALLS.md` for full security mistake catalogue, technical debt patterns, and the "looks done but isn't" verification checklist.

## Implications for Roadmap

Based on combined research, the following phase structure is recommended. The architecture's Phase A–E build order from ARCHITECTURE.md maps directly to phases, with UX fixes split into their own early phase because they have zero new dependencies and must ship to establish baseline product credibility.

### Phase 1: UX Overhaul (10 Fixes)

**Rationale:** Zero new dependencies — all 10 fixes use existing APIs, existing components, and CSS/logic changes only. They are parallelisable and fast. They fix table-stakes problems (missing nav, empty dashboard, broken affordances) that make the product appear non-functional to new users. Must ship before any institutional demos or external stakeholder access.

**Delivers:** Functional navigation, actionable dashboard, readable wellbeing scores, correct CM experience, sanitised error messages, working resolution editing, correct circle formation data.

**Addresses:** All 10 P1 UX fix features from FEATURES.md.

**Avoids:** ProtectedRoute new route exclusion pitfall (update exclusion list for `/kiosk/*` and `/challenger/*` before those phases ship).

**Research flag:** Skip — well-documented fixes with confirmed root causes from codebase audit.

### Phase 2: Wellbeing Visualisation

**Rationale:** Adds `recharts` (the one non-trivial new dependency) against data already present in the API response. Self-contained — no backend changes. Ships quickly after Phase 1 and provides the key funder-facing impact evidence.

**Delivers:** Wellbeing trajectory line chart on ImpactDashboard, score interpretation labels (low/average/high per UK population norms), single-point fallback card.

**Uses:** `recharts ^3.8.0`, shadcn/ui chart primitives (copy-paste).

**Avoids:** Single-point Recharts pitfall (invisible dot — explicit fallback required); raw UCLA/SWEMWBS axis labels (always use human-readable labels for the 50-75 target demographic).

**Research flag:** Skip — recharts patterns are well-documented; shadcn chart examples map directly to requirements.

### Phase 3: Shared Foundation (Types + DB Migration)

**Rationale:** Mandatory pre-requisite for both the challenger portal and UX navigation overhaul. Adds `"challenger"` to the `ContributorRole` TypeScript union and PostgreSQL enum via a named migration. Also adds ROUTES constants needed by the nav overhaul in Phase 6.

**Delivers:** `challenger_organisations` table, FK on `challenges`, updated shared types and Zod schemas, named Drizzle migration file.

**Avoids:** Challenger enum without rollback-safe migration pitfall — staging deploy verification protocol must be explicit before any production push of this migration.

**Research flag:** Flag — Postgres enum irreversibility requires explicit staging verification before production push.

### Phase 4: VANTAGE API Integration

**Rationale:** Pure server addition — no DB changes, no UI changes. Unblocks VANTAGE development in parallel with the remaining phases. Depends on Phase 3 for env configuration conventions; otherwise fully independent.

**Delivers:** `middleware/api-key-auth.ts`, `VANTAGE_API_KEY` env config, versioned `/api/v1/` route mounts, `VANTAGE-CONTRACT.md` listing every consumed endpoint with request/response shapes.

**Uses:** `express-rate-limit ^8.3.1`, Node.js built-in `crypto`.

**Avoids:** Dual auth path divergence pitfall (separate middleware, separate route group, never mixed); API keys stored in plaintext (SHA-256 hash only, show raw key once at creation); MCP tools accepting arbitrary `contributor_id` without scope check.

**Research flag:** Flag — MCP tool scope enforcement is a non-obvious security requirement; the current tool stubs have no auth layer and this must be designed explicitly before any tool returns real data.

### Phase 5: Challenger Portal

**Rationale:** Highest effort feature (3–4x complexity of any other v1.1 item). Requires shared types from Phase 3. Server routes must be built before web pages. Defer this phase entirely until a concrete organisational user is confirmed — do not build speculative infrastructure.

**Delivers:** Challenger registration and org profile, challenge brief submission (draft flow), CM review queue, challenge status visibility, `routes/challenger.ts`, 4 web pages (`ChallengerRegister`, `ChallengerDashboard`, `ChallengerChallengeForm`, `ChallengerProgress`).

**Avoids:** Challenger portal returning contributor PII (integration test required before any endpoint ships); challengers accessing contributor routes (strict `/challenger/*` route isolation in `ProtectedRoute`).

**Research flag:** Flag — challenger registration flow decision (dedicated endpoint vs extending existing register; Option A full account vs Option B guest submission) needs explicit product decision from Kirk at phase kickoff.

### Phase 6: UX Navigation Overhaul

**Rationale:** Depends on all roles being defined (Phase 3) and challenger portal pages existing (Phase 5) so the sidebar can link to them. Adds role-aware sidebar, mobile nav drawer, and active-state nav link wrapper.

**Delivers:** `Sidebar.tsx`, `MobileNavDrawer.tsx`, `NavLink.tsx`, role-based post-login redirects, updated `Navbar.tsx` and `AppShell.tsx`.

**Avoids:** Icon-only sidebar pitfall (always use text labels for the 50-75 target demographic); ProtectedRoute not excluding new routes from onboarding redirect.

**Research flag:** Skip — role-aware navigation is a standard React pattern; component structure is fully defined in ARCHITECTURE.md.

### Phase 7: Kiosk Mode

**Rationale:** Entirely frontend, no backend changes required. Builds on the cleaned-up AppShell from Phase 6. The existing `POST /api/auth/logout` is the only server dependency (already live). Self-contained.

**Delivers:** `KioskContext.tsx`, `useInactivityLogout.ts`, `KioskShell.tsx`, `KioskLanding.tsx`, `KioskChallenges.tsx`, kiosk routing in `App.tsx`, simplified kiosk Navbar variant.

**Uses:** `react-idle-timer ^5.7.2`.

**Avoids:** React Query cache leak between kiosk users (`queryClient.clear()` not `invalidateQueries()`); HttpOnly cookie persistence after timeout (server logout must complete before navigate); idle timer missing touch/keyboard events; kiosk mode activating on standard `/login` URL; session-end screen displaying previous user's name.

**Research flag:** Flag — kiosk session security requires end-to-end verification (network tab check for `Set-Cookie: Max-Age=0`, manual touch-device test for event coverage) as a gate condition before any institutional deployment.

### Phase Ordering Rationale

- Phases 1–2 ship without any new infrastructure risk and immediately improve product credibility for demos and funder access.
- Phase 3 is a prerequisite gate — nothing challenger-related can be written before it completes; keep it narrow and focused on types and migration only.
- Phase 4 (VANTAGE) is independent of the UI work and can unblock VANTAGE development while phases 5–7 proceed.
- Phase 5 (challenger portal) precedes Phase 6 (nav overhaul) so the sidebar can link to real challenger pages rather than placeholder routes.
- Phase 7 (kiosk) is last because it builds on the stable AppShell produced by Phase 6 and has no other blockers once the logout endpoint exists.
- The UX fixes (Phase 1) are deliberately separated from the nav overhaul (Phase 6) — the fixes are zero-dependency hot patches; the nav overhaul requires all role definitions to exist first.

### Research Flags

Phases needing deeper research or careful review during planning:

- **Phase 3** (Shared Foundation): Postgres enum irreversibility — staging deploy verification protocol needs to be explicit in the phase plan before any production push.
- **Phase 4** (VANTAGE Integration): MCP tool scope enforcement — non-obvious security requirement; existing stubs have no auth layer. Needs design session at phase start.
- **Phase 5** (Challenger Portal): Challenger registration flow decision (Option A vs B) requires a product decision before implementation begins; no direct public-sector comparators were found.
- **Phase 7** (Kiosk Mode): Session security end-to-end verification must be a named gate condition before institutional deployment.

Phases with standard patterns (skip research-phase):

- **Phase 1** (UX Overhaul): All root causes confirmed from codebase audit; fixes are straightforward implementation work.
- **Phase 2** (Wellbeing Visualisation): recharts and shadcn chart patterns are well-documented with direct examples.
- **Phase 6** (UX Navigation): Role-aware navigation is a standard React pattern; component structure fully defined in ARCHITECTURE.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All additions confirmed from npm/official docs; recharts React 19 + Tailwind v4 compatibility explicitly verified via shadcn/ui docs |
| Features | HIGH (UX/visualisation), MEDIUM (kiosk/VANTAGE), LOW (challenger portal) | UX fixes from direct codebase audit; kiosk patterns from multiple sources; challenger portal has limited direct public-sector comparators |
| Architecture | HIGH | All claims derived from reading actual v1.0 code — routes, middleware, schema, hooks; no training-data assumptions |
| Pitfalls | HIGH | All critical pitfalls grounded in v1.0 codebase inspection and verified against OWASP, MCP security reports, and TanStack Query docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Challenger registration flow decision:** Option A (new `challenger` role with full account, login, and session) vs Option B (guest submission form, no account required, CM reviews). Research documents both but does not prescribe — this is a product decision requiring input from Kirk about whether challengers need accounts. Address at Phase 5 kickoff.
- **VANTAGE MCP tool scope binding:** The current MCP stubs have `isError: true` and no auth layer. The pattern for binding a `contributor_id` scope to an API key at tool handler level is documented in PITFALLS.md but the implementation is non-trivial. Needs explicit design review at Phase 4 start.
- **Kiosk GDPR consent session context:** PITFALLS.md flags that consent records for special-category wellbeing data submitted on a kiosk terminal lack session context. A `sessionContext: "kiosk"` flag on consent records is recommended but not yet in the schema — gap to address during Phase 7 planning.
- **Institutional landing page:** Deferred from kiosk scope (`/i/[slug]` per-institution public pages, P3 in FEATURES.md). Not blocking v1.1 but should be tracked for when a first library partner is confirmed.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection (`packages/server/src/`, `packages/web/src/`, `packages/shared/src/`) — all architecture, pitfall, and feature gap findings
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — React 19 + Tailwind v4 chart support confirmed
- [recharts GitHub releases](https://github.com/recharts/recharts/releases) — v3.8.0 published March 2025
- [express-rate-limit npm](https://www.npmjs.com/package/express-rate-limit) — v8.3.1, ESM-native, TypeScript included
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) — `randomBytes` and `createHash` built-in
- [OWASP Top 10:2025 A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [WEMWBS Score Interpretation — Warwick](https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/using/howto/)
- [Frontiers Psychiatry: SWEMWBS Score Categorisation 2025](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1674009/full)

### Secondary (MEDIUM confidence)
- [react-idle-timer npm](https://www.npmjs.com/package/react-idle-timer) — v5.7.2 latest; search result verified (npm page 403'd during research)
- [MCP Security Vulnerabilities — Practical DevSecOps 2026](https://www.practical-devsecops.com/mcp-security-vulnerabilities/) — tool poisoning CVE pattern
- [State of MCP Server Security 2025 — Astrix](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/) — scope enforcement requirements
- [TanStack Query persistQueryClient docs](https://tanstack.com/query/v4/docs/framework/react/plugins/persistQueryClient) — cache management on logout
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — HttpOnly cookie lifecycle
- Multi-tenant Drizzle ORM patterns — row-based `organisation_id` approach confirmed across multiple sources for small tenant counts
- Express.js RBAC + JWT role claims — consistent recommendation to embed roles in JWT for 2–5 role systems

### Tertiary (LOW confidence)
- Challenger portal comparator analysis — no direct public-sector self-service challenge submission portal comparators found; model inferred from Catalant/Expert360 commercial patterns

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*

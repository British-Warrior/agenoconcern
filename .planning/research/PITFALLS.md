# Pitfalls Research

**Domain:** Adding kiosk mode, challenger portal, API key auth, nav overhaul, and AI agent integration to existing Node.js/React social enterprise platform (v1.1)
**Project:** Indomitable Unity
**Researched:** 2026-03-15
**Confidence:** HIGH — all pitfalls grounded in the actual v1.0 codebase (`packages/server/src/`, `packages/web/src/`); research verified against official sources and current security reports.

---

## Critical Pitfalls

---

### Pitfall 1: React Query Cache Leaks Personal Data Between Kiosk Users

**What goes wrong:**
When user A logs out at a library terminal and user B logs in, TanStack Query's in-memory `QueryClient` still holds user A's data. Keys like `["me"]`, `["impact", "summary"]`, `["wellbeing", "due"]`, `["circles"]`, and `["challenges"]` all survive a logout if only `queryClient.invalidateQueries()` is called. The current `logoutMutation.onSuccess` in `useAuth.ts` calls `queryClient.setQueryData(["me"], null)` and `queryClient.invalidateQueries({ queryKey: ["me"] })` — but it does NOT clear the rest of the cache. User B may briefly see user A's name, dashboard state, or wellbeing data during the re-render cycle before their own data loads.

**Why it happens:**
Developers treat logout as an auth-state change and only invalidate the identity query. In a personal-device context this is acceptable — all other queries will re-fetch and replace. In a kiosk (shared-device) context, the previous user's data in any cached key is a data leakage event, even if it appears for only a second.

**How to avoid:**
In the `logoutMutation.onSuccess` callback (or in a dedicated kiosk logout handler), call `queryClient.clear()` instead of `queryClient.invalidateQueries()`. This removes all cached query data, not just the `["me"]` key. For kiosk mode, also set `gcTime: 0` on any query whose data is user-specific, so nothing is retained after the component unmounts.

**Warning signs:**
- After logout and re-login as a different user, the old user's name briefly appears in the welcome heading
- `["wellbeing", "due"]` returns `true` for a brand-new user who has never checked in (stale from previous user)
- Any query keyed to a contributor ID (circles, impact) returns data for the wrong person on the first render

**Phase to address:** Kiosk Mode phase

---

### Pitfall 2: Kiosk Auto-Logout Navigates Without Clearing HttpOnly Cookies

**What goes wrong:**
An idle-timeout auto-logout fires JavaScript that navigates to `/login` or calls `window.location.assign('/login')`, but the `access_token` and `refresh_token` HttpOnly cookies set by the Express server persist in the browser. The next user who arrives at the terminal can silently re-authenticate as the previous user by refreshing the page, because the client code in `client.ts` will call `POST /api/auth/refresh` and get a new access token if the refresh cookie is still valid.

**Why it happens:**
JavaScript cannot read or delete HttpOnly cookies — they are by design inaccessible to script. Developers implement the idle timer entirely in the browser, navigate to `/login`, and assume the user is logged out. The cookie lifecycle is only managed by the server via `Set-Cookie` headers with `Max-Age=0`.

**How to avoid:**
The kiosk idle-timeout MUST call `POST /api/auth/logout` via the existing `authApi.logout()` before any navigation. This endpoint must set `Set-Cookie: access_token=; Max-Age=0` and `Set-Cookie: refresh_token=; Max-Age=0` in its response. Never implement kiosk logout as a client-only navigation. After the server call succeeds, then navigate. Also ensure the `access_token` cookie has a short `Max-Age` (15 minutes) as defence-in-depth for cases where the server call fails.

**Warning signs:**
- Idle timer callback calls `navigate('/login')` or `window.location.assign(...)` without first awaiting a `POST /api/auth/logout`
- After kiosk timeout, pressing Back takes the next user directly into the previous session
- An automated test that calls `GET /api/auth/me` after client-side-only logout still receives 200

**Phase to address:** Kiosk Mode phase

---

### Pitfall 3: Adding "challenger" Enum Value Without an Explicit Migration Strategy

**What goes wrong:**
Adding `"challenger"` to the `contributorRoleEnum` in `schema.ts` and running `drizzle-kit push` alters the Postgres `contributor_role` enum type. In Postgres, `ALTER TYPE ... ADD VALUE` executes outside a transaction — it cannot be rolled back. If the deployment fails after the migration but before the new code is deployed, the database has a value (`"challenger"`) that no running server process knows how to handle. The existing `requireRole` middleware does strict equality (`req.contributor.role !== role && req.contributor.role !== "admin"`) — an unknown role will pass or fail silently depending on context, with no `default: throw` branch.

**Why it happens:**
Adding an enum value feels trivial. In development, `drizzle-kit push` handles it silently. In production the irreversibility of `ADD VALUE` is not obvious until you need to roll back.

**How to avoid:**
Write a named Drizzle migration file (do not use `push` for production schema changes). Review the generated SQL — confirm it contains `ALTER TYPE contributor_role ADD VALUE 'challenger'`. Plan for irreversibility: once deployed, you cannot remove the value. Update `requireRole` to explicitly handle `"challenger"` and add a `default` branch that returns 403 for any unrecognised role string. Gate every challenger-only endpoint with `requireRole("challenger")` — not an absence-of-role check or inline string comparison. JWT tokens issued before the migration will contain `"contributor"` — challengers who log in after the server deploys but with old tokens will need to re-authenticate (tokens expire naturally, but force re-login for the challenger account type at first access).

**Warning signs:**
- `drizzle-kit push` used for production migrations
- No migration file — schema diff applied directly
- `requireRole` has no `default` branch for unknown roles
- Challenger-only routes use inline `req.contributor.role === "challenger"` checks scattered across route handlers

**Phase to address:** Challenger Portal phase — must be the first task before any challenger-specific routes are written

---

### Pitfall 4: MCP Tool Handlers Have No Auth Scope — VANTAGE Can Act as Any Contributor

**What goes wrong:**
The current MCP tool stubs in `packages/server/src/tools/` accept a `contributor_id` UUID as a direct parameter (e.g., `get_contributor_profile({ contributor_id })`). When VANTAGE calls these tools, it passes whatever contributor ID it has in context. If the MCP server does not verify that the API key used to authenticate VANTAGE is scoped to that specific `contributor_id`, any VANTAGE instance (or a compromised key) can read or write data for any contributor by supplying an arbitrary UUID.

**Why it happens:**
MCP tool schemas are designed for convenience — parameters make it easy to pass any ID. The existing REST routes are protected by `authMiddleware` which reads `req.cookies.access_token`, but MCP tools call `getDb()` directly and have no equivalent auth check. The MCP server (`mcp-server.ts`) currently has no authentication layer at all.

**How to avoid:**
When implementing MCP tools for VANTAGE, enforce at the tool handler level that the `contributor_id` parameter matches the contributor scope stored against the API key in the database. The key lookup is: `SELECT scoped_contributor_id FROM api_keys WHERE key_hash = hash(presented_key)`. If `contributor_id != scoped_contributor_id`, return `isError: true` with code `FORBIDDEN`. Never accept the agent's claimed ID as the authorization signal — always verify against the server-side key record.

**Warning signs:**
- MCP tool handlers call `getDb()` without first resolving an auth context from the call's credentials
- The only `contributor_id` check is the one passed by the agent as a parameter
- An API key is issued with no `scoped_contributor_id` or with a wildcard scope
- No key expiry date stored in the database

**Phase to address:** VANTAGE Integration phase — auth scope enforcement must be built before any tool returns real data

---

### Pitfall 5: Dual Auth Paths (Cookie JWT + API Key) Create Divergent Permission Checks

**What goes wrong:**
Adding `X-API-Key` authentication alongside the existing cookie-based `authMiddleware` creates two paths that must both correctly populate `req.contributor` in the same shape. If one path is added as an `if/else` branch inside the existing middleware, the role checks, rate limits, and audit logging diverge. A request that fails the cookie path may silently succeed via the API key path without going through role guards. Audit logs become ambiguous — you cannot distinguish a human contributor action from a VANTAGE agent action.

**Why it happens:**
Developers add API key support by modifying `authMiddleware` inline: `if (req.headers['x-api-key']) { ... } else { // original cookie path }`. This feels like the simplest change but conflates two separate concerns.

**How to avoid:**
Create a standalone `apiKeyMiddleware` that independently resolves `req.contributor` in exactly the same shape as `authMiddleware` does (same `{ id, role }` interface). Apply this middleware only to the VANTAGE-facing routes (`/api/vantage/*` or a dedicated route group). Do not modify `authMiddleware`. Apply express-rate-limit to API key routes with a separate, lower ceiling than the user-facing routes. Log API key requests with the key ID (not the raw key, and not just the contributor ID) so agent calls can be distinguished from human calls in audit logs.

**Warning signs:**
- A single middleware function contains both `req.cookies.access_token` and `req.headers['x-api-key']` conditions
- No rate limiting on API key endpoints separate from user-facing rate limiting
- API keys stored as plain text in the database
- Audit logs contain contributor ID but no `key_id` or `auth_method` field

**Phase to address:** VANTAGE Integration phase (API key auth sub-task, completed before any VANTAGE endpoint goes live)

---

### Pitfall 6: Challenger Portal Returns Contributor PII or Wellbeing Data to Organisations

**What goes wrong:**
When building the challenger portal, a developer adds "useful context" to challenge outcome responses — contributor names, contact details, or wellbeing scores. The current `GET /api/impact/challenger` is safe (returns only `problemSummary`, `recommendations`, `rating`). But the challenger portal is likely to be extended with "who worked on my challenge?" or "how is the circle doing?" queries. Circles are small (3–4 members). Even aggregate wellbeing scores for a group that small are not k-anonymous — an organisation can identify individuals from contextual signals.

**Why it happens:**
Developers think from the challenger's perspective and include "helpful" data. The data exists in the database; it is easy to join. The risk to contributors is not visible to the person writing the query.

**How to avoid:**
Define a strict data boundary enforced at the API level: challengers can see aggregated metrics (resolution status, average rating, circle count) but never individual contributor identities, contact details, or any wellbeing-derived data. The existing `ChallengerImpact` shared type must not contain any PII fields. Write a backend integration test that asserts every challenger-scoped endpoint returns a response that passes a schema check for absence of `email`, `name`, `phoneNumber`, `uclaScore`, `wemwbsScore` fields.

**Warning signs:**
- Any challenger endpoint JOINs the `contributors` table without explicitly excluding PII columns
- Response types for challenger-facing endpoints extend or reuse the general `Contributor` type
- VANTAGE tools that serve challenger context accept an `includeContributorDetails` flag
- Wellbeing trajectory data is included in any challenger dashboard

**Phase to address:** Challenger Portal phase — data boundary test written before any endpoint ships

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `ProtectedRoute` for kiosk routes, add kiosk props | Avoids a new component | Kiosk logic bleeds into general auth flow; hard to strip out later | Never — kiosk needs its own route wrapper |
| Store API keys unhashed in the database | Simple SELECT to validate | Single DB dump exposes all VANTAGE integrations permanently | Never |
| Add API key check as a branch inside `authMiddleware` | One file to change | Audit trail merges human and agent traffic; role checks diverge silently | Never for production; acceptable for a one-day spike |
| Use `drizzle-kit push` to add challenger enum value in production | Faster than writing a migration | Postgres enum ADD VALUE is irreversible; cannot be rolled back on bad deploy | Never in production |
| `queryClient.invalidateQueries()` on kiosk logout instead of `.clear()` | Less disruptive render | Previous user's cached data survives until GC; PII data leakage window | Never for kiosk; fine for personal-device use |
| Return contributor names in challenger portal for "team context" | Better UX for challengers | GDPR data minimisation violation; potential ICO complaint | Never — use anonymous team references if needed |
| Hard-code VANTAGE REST base URL in environment variable with no health check | Simple | When VANTAGE changes their endpoint, silent failures; no early-warning system | Acceptable for MVP phase only; add `/vantage/health` probe before phase ends |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| VANTAGE REST API | Calling VANTAGE endpoints directly from route handlers with no timeout | Wrap all outbound calls in a service class with `AbortController` timeout (5 s default); return a structured fallback on timeout |
| VANTAGE REST API | Trusting VANTAGE response shape without validation | Parse every VANTAGE response through a Zod schema before using any field; surface parse failures as 502 with a structured error log |
| VANTAGE REST API | Issuing a long-lived API key with no expiry | Store keys with `expiresAt` in the database; VANTAGE must re-authenticate when a key expires; alert operations 7 days before expiry |
| MCP tools | `NOT_IMPLEMENTED` stubs have `isError: true` — forgetting to remove this flag when implementing | Add a CI lint rule: grep for `NOT_IMPLEMENTED` in `packages/server/src/tools/`; fail the build if found after the VANTAGE phase begins |
| Kiosk idle timer | `useEffect` idle timer fires twice in React Strict Mode (dev), masking bugs | Use a single `useRef` to hold the `setTimeout` handle; cancel in cleanup; always test in a production build |
| Nav overhaul and `ProtectedRoute` | Adding new routes (kiosk, challenger) without updating the onboarding redirect | `ProtectedRoute` currently redirects any `contributor.status === "onboarding"` user to `/onboarding/upload` unless path `startsWith("/onboarding")`. New `/kiosk/*` and `/challenger/*` paths must be added to the exclusion list. |
| Recharts / wellbeing charts | Mapping raw UCLA score (3–12) and WEMWBS score (7–35) directly to chart axes | Users aged 50–75 cannot interpret psychometric scale numbers; always label axes with human meaning ("Feeling connected" ↔ "Feeling isolated"), not raw integers |
| Recharts | Rendering a line chart with exactly one data point | Recharts renders a single invisible dot with no line; handle `data.length === 1` explicitly with a fallback card component |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 query in `GET /api/impact/challenger` | Each challenge triggers 3 sequential DB calls (circle → resolution → rating) inside `Promise.all`; parallelised per challenge but still O(n) round trips | Rewrite as a single JOIN query before challenger traffic grows | ~20 active challengers each with 5+ challenges; currently acceptable for pilot scale |
| `queryClient.clear()` on every kiosk logout | Next user sees simultaneous loading spinners on every dashboard widget | Accept the correctness; optimise with skeleton UIs and `staleTime: 0` so re-fetches are fast | Not a scale concern; a UX concern on slow library connections |
| Charting entire wellbeing history with no pagination | `GET /wellbeing/history` returns all check-ins for a contributor | Safe to ignore for v1.1 (56-day intervals = ~6 points/year); add limit only if trajectory exceeds 100 points | ~16 years of continuous use per contributor |
| `staleTime: 0` in kiosk QueryClient triggers refetch on every window focus | Kiosk terminal with screen saver regaining focus hammers the API repeatedly | Set `refetchOnWindowFocus: false` on the kiosk QueryClient instance | Any terminal with frequent focus-blur cycles |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API keys stored as plain text in database | Single DB dump exposes every VANTAGE integration permanently | Hash keys with SHA-256 (or bcrypt for slow comparison); store only the hash; show the raw key once at creation, then never again |
| No rate limiting on API key endpoints | Misconfigured or runaway VANTAGE agent exhausts the DB connection pool | Apply `express-rate-limit` to `/api/vantage/*` with a ceiling lower than user-facing routes; add per-key rate tracking |
| Kiosk mode activating on the standard `/login` URL | A library computer bookmarked to `/login` gets kiosk behaviour unexpectedly; or vice versa, kiosk computer misses kiosk protections | Kiosk mode must only activate when the user navigates to an explicit `/kiosk/login` path; standard `/login` must never enter kiosk mode |
| Challenger sees wellbeing aggregates for small circles | Circle membership of 3–4 people is below k-anonymity threshold; aggregate scores identify individuals | Never expose any wellbeing-derived data to challengers, even aggregated — remove from all challenger-facing endpoints and types |
| GDPR consent record on kiosk machine lacks session context | Consent records for special-category wellbeing data submitted at a library terminal cannot be reliably linked to the correct device context for future audits | Add a `sessionContext: "kiosk"` flag to consent records created in kiosk mode; log terminal identifier if available |
| MCP tool descriptions are mutable and not version-pinned | If VANTAGE connects to a compromised or updated MCP server, altered tool descriptions could instruct it to exfiltrate data (tool poisoning — documented CVE pattern as of 2025) | Pin and version all tool schemas; validate tool descriptions at server startup against a known-good manifest; do not allow dynamic tool registration at runtime |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Kiosk idle timeout shown as a small corner notification | Users aged 50–75 miss it; they lose unsaved work without warning | Show a large central modal countdown (60 seconds), with a high-contrast "I'm still here" button and explicit "Logging you out to keep your information secure" explanation |
| Navigation overhaul uses icon-only sidebar | Professionals in this demographic are not familiar with icon-only navigation conventions | Use text labels alongside every nav icon; never rely on icon recognition alone for primary navigation in this audience |
| Challenger portal shows any wellbeing-related metrics | Organisations may misinterpret psychometric data as team performance indicators; contributors lose trust when they learn their health data reached their employer | Remove all wellbeing data from challenger-facing views entirely — not just labelled differently, but absent from responses |
| Dashboard empty states show blank panels with no prompt | New contributors see an empty page and do not understand what the platform does | Every empty state needs a primary action: "Browse open challenges", "Post your first challenge", "Complete your profile" |
| Wellbeing chart renders with a single data point | Recharts draws a single invisible dot — looks like a broken chart to all users | Detect `data.length === 1` and render a styled single-point callout card with the date and a message: "Your first check-in — return in 8 weeks to see your progress" |
| Kiosk session-end screen displays the previous user's name | Data leakage; could embarrass the previous user in a semi-public space | Kiosk session-end screen shows only: "Session ended. Your information has been cleared. Please log in to start a new session." — no personal data of any kind |

---

## "Looks Done But Isn't" Checklist

- [ ] **Kiosk logout:** Verify `queryClient.clear()` is called (not `invalidateQueries`) AND `POST /api/auth/logout` completes before navigation — check the network tab
- [ ] **Cookie clearing on logout:** After `POST /api/auth/logout`, confirm the response `Set-Cookie` header contains `Max-Age=0` for both `access_token` and `refresh_token`
- [ ] **Kiosk idle timer:** Verify the timer resets on mouse move, keyboard events, AND touch events — not mouse only (keyboard-only navigation is common for this demographic)
- [ ] **API key hashing:** Query the `api_keys` table directly and confirm stored values are not reversible to raw key strings
- [ ] **Challenger role gate:** Write a test that calls every challenger-only endpoint with a `contributor` role JWT and asserts 403 — not a 200 with empty data
- [ ] **MCP tool stubs:** Grep `packages/server/src/tools/` for `NOT_IMPLEMENTED` — assert zero results before VANTAGE integration ships
- [ ] **VANTAGE response parsing:** Confirm all VANTAGE API responses pass through a Zod schema — grep for `.json()` calls in VANTAGE service code without a `.parse()` chain
- [ ] **Challenger data isolation:** Write an integration test that calls `GET /api/impact/challenger` and `GET /api/vantage/challenger/*` with a challenger JWT and asserts the response body contains no `email`, `phoneNumber`, `uclaScore`, or `wemwbsScore` fields
- [ ] **ProtectedRoute new route exclusion:** Test with an `onboarding`-status contributor navigating to `/kiosk/login` and `/challenger/*` — confirm they are NOT redirected to `/onboarding/upload`
- [ ] **Wellbeing chart single point:** Render `WellbeingChart` with `data.length === 1` in development — confirm no empty/broken chart renders; fallback card appears

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Kiosk cache leak discovered in production | LOW | Deploy `queryClient.clear()` fix; no data migration needed; document the specific session window in an incident report for GDPR accountability |
| HttpOnly cookie persists after kiosk timeout | MEDIUM | Shorten `access_token` `Max-Age` to 15 minutes server-side as immediate mitigation; deploy proper logout fix; audit access logs for anomalous same-IP / same-user-agent dual-session requests |
| Challenger enum deployed without reversible migration | HIGH | `ALTER TYPE ADD VALUE` cannot be undone; forward-migrate by deploying new code that handles the value; force re-login for all challenger accounts (token refresh on next request will issue correct role claim); update all role guards before re-opening the routes |
| API key stored in plaintext — discovered post-breach | HIGH | Rotate all keys immediately; re-issue to all VANTAGE integrations; conduct a log audit for key usage since issuance; assess GDPR breach notification obligation (72-hour ICO window) |
| Challenger endpoint returned contributor PII | HIGH | Take the endpoint offline; audit all previous responses via server logs; notify affected contributors under GDPR Article 33; fix data boundary; redeploy with integration test coverage |
| VANTAGE contract drift — endpoint returns unexpected shape | MEDIUM | Zod parse failure surfaces as a server-side 502; add a monitoring alert on VANTAGE parse error rate; maintain a VANTAGE integration test suite that runs weekly against the VANTAGE sandbox; pin to a named API version if VANTAGE offers versioned endpoints |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| React Query cache leaks between kiosk users | Kiosk Mode | Integration test: log out user A, log in user B, assert no user A data survives in any query cache key |
| Kiosk auto-logout not clearing cookies | Kiosk Mode | After idle timeout, call `GET /api/auth/me` with the previous cookies — assert 401 |
| Challenger enum without rollback-safe migration | Challenger Portal — first task | CI: drizzle-kit generate produces explicit SQL reviewed before merge; staging deploy verified before production |
| MCP tools accepting any contributor_id without scope check | VANTAGE Integration | Unit test: call MCP tool with a `contributor_id` that does not match the API key's scope — assert `isError: true` |
| Cookie JWT and API key paths diverging silently | VANTAGE Integration | Integration test: send a request with both a valid cookie and a valid API key — verify only one auth path executes and the audit log records `auth_method` |
| Challenger seeing contributor PII or wellbeing data | Challenger Portal | Integration test: challenger JWT calls every challenger endpoint — response schema check asserts no PII fields present |
| ProtectedRoute trapping new routes in onboarding redirect | UX Overhaul / Navigation | E2E test: onboarding-status contributor navigating to `/kiosk/login` and `/challenger/*` is not redirected to `/onboarding/upload` |
| Kiosk idle timer missing touch and keyboard events | Kiosk Mode | Manual test on a touch-capable device; keyboard-only navigation test with no mouse |
| Wellbeing chart broken with single data point | UX Overhaul / Dashboard | Storybook story: `WellbeingChart` with `data.length === 1` renders fallback card, not empty chart |
| VANTAGE contract drift breaking response parsing | VANTAGE Integration | Scheduled integration test against VANTAGE sandbox (weekly); alert fires on any Zod parse failure in VANTAGE service |

---

## Sources

- Codebase direct inspection (v1.0): `packages/server/src/middleware/auth.ts`, `packages/server/src/tools/index.ts`, `packages/web/src/hooks/useAuth.ts`, `packages/server/src/db/schema.ts`, `packages/server/src/routes/impact.ts`, `packages/server/src/routes/wellbeing.ts`, `packages/web/src/App.tsx`, `packages/web/src/components/layout/ProtectedRoute.tsx`
- MCP security: [MCP Security Vulnerabilities — Practical DevSecOps](https://www.practical-devsecops.com/mcp-security-vulnerabilities/) (2026); [State of MCP Server Security 2025 — Astrix](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/); [Top 6 MCP Vulnerabilities — Descope](https://www.descope.com/blog/post/mcp-vulnerabilities)
- Kiosk session security: [Kiosk Mode — Ensuring Security for Public Computers](https://kioskindustry.org/kiosk-mode-2023/); [How to Secure Public-Facing Devices — Limaxlock](https://limaxlock.com/blog/how-to-secure-public-devices-kiosk-browser/)
- TanStack Query cache management: [Persisting your React Query cache — New Orbit](https://www.neworbit.co.uk/blog/post/persisted-react-query-cache/); [TanStack Query persistQueryClient docs](https://tanstack.com/query/v4/docs/framework/react/plugins/persistQueryClient)
- RBAC and broken access control: [A01 Broken Access Control — OWASP Top 10:2025](https://owasp.org/Top10/A01_2021-Broken_Access_Control/); [Authorization Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- AI agent integration pitfalls: [Overcoming Challenges in AI Agent Integration — Knit](https://www.getknit.dev/blog/overcoming-the-hurdles-common-challenges-in-ai-agent-integration-solutions); [Versioning AI Agents — CIO](https://www.cio.com/article/4056453/why-versioning-ai-agents-is-the-cios-next-big-challenge.html)
- API key security: [API Security in the AI Era — CSA](https://cloudsecurityalliance.org/blog/2025/09/09/api-security-in-the-ai-era); [Node.js API Security Best Practices — StackHawk](https://www.stackhawk.com/blog/nodejs-api-security-best-practices/)
- Charting libraries: [tremor/react vs recharts npm trends](https://npmtrends.com/@tremor/react-vs-chart.js-vs-d3-vs-echarts-vs-plotly.js-vs-recharts)

---
*Pitfalls research for: Indomitable Unity v1.1 — kiosk mode, challenger portal, API key auth, navigation overhaul, VANTAGE agent integration*
*Researched: 2026-03-15*

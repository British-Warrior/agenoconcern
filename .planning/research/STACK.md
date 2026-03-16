# Stack Research

**Domain:** Social enterprise platform — v1.1 additions (charting, kiosk mode, API key auth, challenger portal RBAC)
**Researched:** 2026-03-15
**Confidence:** HIGH (charting, API key auth, rate limiting), MEDIUM (kiosk idle pattern, RBAC approach)

> This document covers ONLY new stack additions for v1.1.
> The existing stack (Node.js/TypeScript, Express 4, React 19/Vite 6, PostgreSQL/Drizzle,
> Tailwind v4, TanStack Query, React Router 7, Stripe, S3, OpenAI, Resend, web-push, argon2, jose)
> is validated from v1.0 and MUST NOT be replaced.

---

## Recommended Stack Additions

### Core Technologies (new for v1.1)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| recharts | ^3.8.0 | Line, area, radial/gauge charts for wellbeing trends and scores | React-first SVG library — components map directly to JSX with no imperative D3 API. v3.8.0 released March 2025, confirmed React 19 compatible per shadcn/ui docs. 3.6M weekly downloads; dominant in the React ecosystem. RadialBarChart with constrained arc covers gauge requirements. |
| react-idle-timer | ^5.7.2 | Detect user inactivity, auto-logout, session reset for kiosk mode | The standard React idle detection library (564K weekly downloads). Hook-based (`useIdleTimer`), zero external dependencies, cross-tab idle coordination, page-level whitelist/blacklist. API is stable; 3+ years on v5 with no breaking changes. |
| express-rate-limit | ^8.3.1 | Rate-limit VANTAGE API key endpoints on the server | ESM-native, TypeScript-typed, Express 4 compatible. Latest v8.3.1 published March 2025. In-memory store sufficient for single-instance deploy; Redis store available if load balancing added later. Prevents API key abuse without a separate gateway. |

### Supporting Libraries (new for v1.1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui chart primitives | copy-paste (no npm) | ChartContainer, ChartTooltip, ChartLegend wrappers around recharts | Always — eliminates hand-rolling tooltip/legend styling. Tailwind v4-native (uses `var(--chart-1)` not `hsl(var(--chart-1))`), React 19-confirmed. Zero npm dependency added — copied as source into `src/components/ui/chart.tsx`. |
| Node.js built-in `crypto` | built-in (no install) | Generate and SHA-256 hash API keys for VANTAGE | `crypto.randomBytes(32).toString('hex')` produces cryptographically secure 64-char keys. Hash with `crypto.createHash('sha256')` before DB storage. No new dependency — same pattern as existing session token generation. |

### Development Tools (new for v1.1)

No new dev tooling required. All existing tools (tsx, vitest, TypeScript 5.7, drizzle-kit) cover v1.1 development needs.

---

## Installation

```bash
# Web package — charting and kiosk idle detection
cd packages/web
npm install recharts react-idle-timer

# Server package — API rate limiting
cd packages/server
npm install express-rate-limit
```

shadcn/ui chart component (copy-paste, no npm):
```bash
# Fetch from https://ui.shadcn.com/charts and copy into:
# packages/web/src/components/ui/chart.tsx
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| recharts ^3.8.0 | Chart.js / react-chartjs-2 | Chart.js renders on Canvas, which is faster for datasets >10K points. Wellbeing check-ins are daily/weekly (small datasets) — SVG readability and React-native API win. Also, Canvas rendering breaks Tailwind OKLCH CSS custom properties for chart colours; recharts SVG reads them natively. |
| recharts ^3.8.0 | visx (Airbnb) | Full D3 primitive control for bespoke, brand-locked data art. Steeper learning curve adds no value for standard wellness gauges and trend lines. |
| recharts ^3.8.0 | nivo | Nivo is visually polished but heavier bundle (~60KB gzip vs recharts ~45KB). Already covered by recharts + shadcn wrappers. |
| react-idle-timer ^5.7.2 | Custom event listener hook | A custom hook is feasible but misses cross-tab coordination, visibility change events, and leader election for multi-tab scenarios. react-idle-timer handles these correctly. |
| express-rate-limit ^8.3.1 | api-key-auth npm package | api-key-auth adds HMAC request signing, appropriate for webhook-style push integrations. VANTAGE is a REST pull model — a plain hashed key in `x-api-key` is the right level of complexity. |
| Row-based multi-tenancy (Drizzle) | Schema-based multi-tenancy | Schema-based isolation (one PG schema per org) is stronger but requires dynamic schema routing and operational complexity not justified at <100 challenger organisations. Row-based with consistent `organisation_id` FK filtering is sufficient and simpler to migrate from if needs change. |
| 3-role middleware guards (jose JWT) | Permit.io / Oso / OpenFGA | External policy engines are appropriate for 50+ roles across complex resource hierarchies. A 3-role org portal (owner/admin/viewer) is a dozen middleware guards — a full policy engine is over-engineering with a new vendor dependency and runtime latency. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-gauge-chart | Adds D3 as a separate dependency, duplicating recharts internals. Last updated 2022, unmaintained. | recharts `RadialBarChart` with constrained `startAngle`/`endAngle` |
| Chart.js / react-chartjs-2 | Canvas rendering does not read Tailwind v4 OKLCH CSS custom properties. Colours must be resolved to hex/rgb manually, breaking theme consistency. | recharts (SVG reads CSS variables natively) |
| nivo | Heavier bundle than recharts with no chart types needed beyond what recharts provides for this domain. | recharts |
| passport-headerapikey | Passport.js session strategy pipeline designed for user auth flows. Service-to-service API key checks do not need passport's strategy abstraction layer. | Express middleware + Node.js `crypto` |
| Permit.io / Oso / OpenFGA | Vendor SaaS dependency or heavy OSS policy engine for 3 org roles. Disproportionate to the problem scope at v1.1 scale. | Role claim in JWT payload (via existing `jose`) + thin Express middleware guard |
| Separate JWT library for org tokens | jose is already in the project. Adding `org_id` and `org_role` claims to the existing access token shape adds zero new code paths. | Extend existing `jose` token payload shape |
| nanoid / uuid library for API keys | Node.js `crypto.randomBytes(32).toString('hex')` is cryptographically secure and requires no new dependency. | Node.js built-in `crypto` |

---

## Stack Patterns by Variant

**Charting — wellbeing score gauge:**
- Use `recharts RadialBarChart` with `startAngle={180}` `endAngle={0}` (half-donut arc)
- Single `RadialBar` with `data={[{ value: score, fill: 'var(--chart-1)' }]}`
- Do not add react-gauge-chart

**Charting — wellbeing trend line:**
- Use `recharts AreaChart` with `LinearGradient` fill below the line
- Wrap in shadcn `ChartContainer` for responsive sizing and consistent tooltip

**Kiosk mode — managed ChromeOS kiosk app:**
- `useIdleTimer` with `timeout={3 * 60 * 1000}` (3 minutes) and `onIdle` callback
- `onIdle`: call JWT invalidation endpoint → clear localStorage → navigate to `/kiosk-welcome` → re-request `document.requestFullscreen()`
- Mount fullscreen request on the kiosk layout component `useEffect` with `fullscreenchange` event listener to re-request on exit

**Kiosk mode — unmanaged tablet:**
- Same web app behaviour as managed
- Document that browser nav lockdown is not achievable without MDM
- Recommend institution uses Android MDM or Apple Configurator for OS-level lockdown
- Web app owns session hygiene only

**VANTAGE API key — external third-party caller:**
- `POST /api/keys` (org admin only) generates key, returns plaintext once
- Store: `api_keys(id, organisation_id, key_hash, scopes text[], created_at, expires_at, last_used_at, revoked_at)`
- Middleware: extract `x-api-key` header → SHA-256 hash → lookup non-revoked, non-expired row → attach `req.apiKey` context
- Rate limit: `express-rate-limit` at 100 req/15min per key (keyed on `x-api-key` value)
- Scopes as `text[]`: start with `['wellbeing:read']`, extend to `['wellbeing:write', 'profile:read']` as VANTAGE needs grow

**VANTAGE API key — internal server-to-server:**
- Use existing `jose` service-account JWT instead of API keys
- API keys are for external third-party integrators only

**Challenger portal RBAC — organisation + roles:**
- New tables: `organisations(id, name, slug, created_at)` and `organisation_members(organisation_id, user_id, role)` where `role` is `'owner' | 'admin' | 'viewer'`
- Add `org_id` and `org_role` claims to existing JWT access token payload at login
- Express middleware `requireOrgRole('admin')` reads JWT claims — no new library
- Row-level isolation: every org-scoped query adds `.where(eq(table.organisationId, req.user.orgId))`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| recharts ^3.8.0 | React ^19.0.0, Tailwind v4 | shadcn/ui docs explicitly confirm React 19 + Tailwind v4 support. In chartConfig use `color: "var(--chart-1)"` not `color: "hsl(var(--chart-1))"` — Tailwind v4 wraps OKLCH values already. |
| react-idle-timer ^5.7.2 | React ^16–19 | Hook API is stable across React versions. No breaking changes for React 19. |
| express-rate-limit ^8.3.1 | Express ^4.x, Node ESM | Named ESM import: `import { rateLimit } from 'express-rate-limit'`. TypeScript types included in package. No `@types/` package needed. |

---

## Sources

- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — React 19 + Tailwind v4 chart support confirmed (HIGH)
- [shadcn/ui charts catalogue](https://ui.shadcn.com/charts) — Component copy-paste model and RadialBar examples confirmed (HIGH)
- [recharts GitHub releases](https://github.com/recharts/recharts/releases) — v3.8.0 published March 6, 2025 (HIGH)
- WebSearch: recharts v3.8.0 latest, React 19 peer dependency status — version 3.8.0 confirmed, 3.6M weekly downloads (HIGH)
- WebSearch: react-idle-timer npm — v5.7.2 latest, 564K weekly downloads, stable API (MEDIUM — npm page 403'd, search result verified)
- WebSearch: express-rate-limit npm — v8.3.1 latest, ESM named export, TypeScript included (HIGH)
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) — `crypto.randomBytes` confirmed built-in (HIGH)
- WebSearch: multi-tenant Drizzle ORM patterns — row-based `organisation_id` approach confirmed across multiple sources for small tenant counts (MEDIUM)
- WebSearch: Express.js RBAC + JWT role claims patterns — consistent recommendation to embed roles in JWT for 2–5 role systems (MEDIUM)

---
*Stack research for: Indomitable Unity v1.1 — charting, kiosk mode, VANTAGE API key auth, challenger portal RBAC*
*Researched: 2026-03-15*

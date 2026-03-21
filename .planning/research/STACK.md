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

---
---

# Stack Research — v1.2 Additions

**Domain:** Social enterprise platform — v1.2 additions (institution management, PDF reports, webhook integration, CM attention views)
**Researched:** 2026-03-21
**Confidence:** HIGH

> This section covers ONLY new stack additions for v1.2.
> All v1.0 and v1.1 stack (including recharts, react-idle-timer, express-rate-limit) is validated
> and MUST NOT be replaced. The server already uses `express.raw()` for Stripe webhook raw body
> handling — the same pattern applies to iThink webhooks.

---

## Recommended Stack Additions

### Core Technologies (new for v1.2)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pdfkit | ^0.18.0 | Server-side PDF generation for institution impact reports | Pure Node.js, no headless browser required. Ships both CJS (`js/pdfkit.js`) and ESM (`js/pdfkit.es.js`) entry points — imports cleanly into the existing `"type": "module"` server package. Streams directly to Express `res` via `doc.pipe(res)`. v0.18.0 published March 15, 2026. Actively maintained. The report format (text, tables, IU branding) maps directly to pdfkit's programmatic API with no JSX overhead. |
| @types/pdfkit | ^0.17.5 | TypeScript definitions for pdfkit | DefinitelyTyped package; currently v0.17.5 (last updated February 2026). Must install alongside pdfkit since the main package does not include types. |
| Node.js built-in `crypto` | built-in (no install) | HMAC-SHA256 signature verification for incoming iThink webhooks | Already present in the project for API key hashing. `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` is the standard pattern. No new dependency. |
| react-native-quick-crypto | ^1.0.17 | HMAC-SHA256 signing for outgoing webhooks dispatched from iThink (React Native) | Margelo's JSI-based drop-in for Node's `crypto` module. Confirmed `createHmac` + `Hmac.digest()` support per implementation coverage docs. v1.0.17 published March 17, 2026. Required because `expo-crypto` only provides one-way digests (no HMAC key signing). Works in bare Expo workflow — does not work in Expo Go. |

### Supporting Libraries (new for v1.2)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js built-in `express.raw()` | built-in (no install) | Capture raw webhook request body before JSON parsing | Already used for Stripe at `app.post('/api/payments/webhook', express.raw(...))` in `express-app.ts`. Register iThink webhook route with the same pattern before `app.use(express.json())`. No new middleware package needed. |

**Note on PDF table helpers:** `pdfkit-table` and `voilab-pdf-table` are both unmaintained (last published 4 years ago). Do not add either. Impact report tables are data grids with predictable column widths — implement directly using pdfkit's `doc.text()` + `doc.moveDown()` coordinate API. Cell x-positions are constant per report design; manual layout takes ~30 lines of code and does not require an abstraction layer.

### Development Tools (new for v1.2)

No new dev tooling required. All existing tools (tsx, vitest, TypeScript 5.7, drizzle-kit) cover v1.2 development needs.

---

## PDF Library Comparison

| Criterion | pdfkit ^0.18.0 | @react-pdf/renderer ^4.3.x | puppeteer ^24.x |
|-----------|---------------|---------------------------|-----------------|
| Server weight | ~800KB bundle, no browser | ~5MB bundle, no browser | ~300MB Chromium binary |
| ESM/CJS | Both (`module` + `main` fields in package.json, verified) | ESM-only with active breakage — `__dirname` Yoga layout error, missing named exports, scheduler peer dep missing in 4.1.x | CJS/ESM dual; Chromium download on install |
| Express streaming | `doc.pipe(res)` — native Node stream | `renderToStream()` — returns Node stream (works but more setup) | `page.pdf()` returns Buffer (no native stream) |
| Tables | Manual coordinate API (no maintained plugin) | Native `<View>` flex layout | Native CSS tables in HTML |
| Charts/images | `doc.image(buffer)` — embed PNG | SVG as `<Image>` | Full CSS rendering |
| Maintenance | Active (v0.18.0 March 2026) | Active but broken for ESM consumers (open issues #2624, #2907, #3017) | Active — Google-backed |
| Best for | Programmatic data documents | Design-heavy branded documents using React component model | Pixel-perfect HTML-to-PDF from existing web UI |
| This project fit | HIGH — data tables + IU branding, not design-heavy layouts | LOW — active ESM breakage in `"type": "module"` + `tsx` server setup | LOW — Chromium binary operationally heavy for periodic report generation |

**Recommendation: pdfkit ^0.18.0.** The institution impact report is a structured data document (statistics, contributor counts, activity summaries). pdfkit's programmatic API handles this without the ESM/CJS friction that @react-pdf/renderer introduces in ESM-first monorepos. If the report design grows into brand-heavy multi-column magazine layouts, migrate to @react-pdf/renderer at that point.

---

## Webhook Signing Standard

**Use HMAC-SHA256 with a shared secret.** This is the industry standard (Stripe, GitHub, Shopify, Slack all use it). The Standard Webhooks specification formalises the same approach with a structured header set.

**IU receiving iThink webhooks:**
- IU generates a shared secret per integration, stores it server-side
- iThink includes `X-Webhook-Signature: sha256=<hex>` header with each outbound POST
- IU verifies: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` and compares to header value using `crypto.timingSafeEqual`
- Raw body must be captured via `express.raw()` on the webhook route — the existing `express-app.ts` pattern for Stripe is the exact template
- Include timestamp header (`X-Webhook-Timestamp`) and reject requests older than 5 minutes to prevent replay attacks

**iThink dispatching to IU:**
- iThink stores the secret and IU webhook endpoint URL in its SQLite config
- Before each outbound POST, iThink generates the HMAC using `react-native-quick-crypto`
- Sets `Content-Type: application/json`, `X-Webhook-Signature: sha256=<hex>`, `X-Webhook-Timestamp: <unix_seconds>`
- Uses standard `fetch` (available in React Native) for the HTTP POST — no new HTTP library needed

---

## Installation

```bash
# Server package — PDF generation
pnpm --filter @indomitable-unity/server add pdfkit
pnpm --filter @indomitable-unity/server add -D @types/pdfkit
```

```bash
# iThink (React Native) — HMAC signing for outgoing webhooks
# Run inside the iThink project directory
npm install react-native-quick-crypto
npx expo prebuild  # required — does not work in Expo Go
```

No new packages needed in `packages/web` for this milestone.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| pdfkit ^0.18.0 | @react-pdf/renderer | Use react-pdf if the report template is built by a designer using a React component model and the design is complex enough that JSX layout is materially faster to maintain than pdfkit's coordinate API. Not recommended here due to ongoing ESM breakage in ESM-first Node setups (GitHub issues #2624, #2907, #3017 all open March 2026). |
| pdfkit ^0.18.0 | puppeteer | Use puppeteer if the PDF must be pixel-identical to an existing web page. Operationally expensive: 300MB Chromium binary, memory-heavy per render. Not justified for data reports. |
| pdfkit ^0.18.0 | jsPDF | jsPDF is browser-oriented; its Node.js support is a workaround. No streaming to Express response. Not appropriate for server-side generation. |
| react-native-quick-crypto | expo-crypto | `expo-crypto` only supports one-way digests (SHA-256 hash, no HMAC key). Cannot sign outgoing webhook payloads. expo-crypto is the right choice for hashing; react-native-quick-crypto is needed specifically for HMAC. |
| react-native-quick-crypto | react-native-hash (JSHmac) | `react-native-hash`'s `JSHmac` is a pure-JS fallback that runs in Expo Go without ejecting. Use it if iThink must remain in Expo Go. react-native-quick-crypto is preferred for production bare builds — native JSI performance and full `node:crypto` API parity. |
| HMAC-SHA256 (manual) | svix npm package | svix is an enterprise webhook platform SDK — it manages webhook queues, retries, and dashboards. Appropriate if IU later needs to send managed webhooks to third parties at scale. Not needed for a single iThink-to-IU integration with manual retry logic. |
| Manual coordinate tables | pdfkit-table / voilab-pdf-table | Both packages are unmaintained (last published 4 years ago). Manual coordinate layout using `doc.text()` is 30 lines of code for a fixed-column data report — no abstraction layer needed. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @react-pdf/renderer in the existing ESM server | Active open GitHub issues (#2624, #2907, #3017) report ESM bundle lacks exports, Yoga layout's `__dirname` breaks under Node.js ESM without an esbuild inject shim, and scheduler peer dependency missing in 4.1.x. Avoidable risk. | pdfkit ^0.18.0 |
| puppeteer for report generation | Requires a 300MB Chromium binary. Cold start latency (2–5s) is unacceptable for a synchronous download response. Memory spikes under concurrent requests. | pdfkit ^0.18.0 |
| html-pdf / phantom.js | Abandoned; PhantomJS project is unmaintained since 2018. html-pdf wraps it. | pdfkit ^0.18.0 |
| pdfkit-table | Last published 4 years ago, unmaintained. 26 dependents vs pdfkit's hundreds. | pdfkit coordinate API directly |
| voilab-pdf-table | Also last published 4 years ago, no recent activity. | pdfkit coordinate API directly |
| express.json() on the webhook route | If `express.json()` runs before HMAC verification, the raw body is consumed and signature verification will fail. The iThink webhook route must use `express.raw({ type: 'application/json' })` — the exact same guard already in place for the Stripe route. | `express.raw()` registered before `app.use(express.json())` |
| expo-crypto for HMAC signing | `expo-crypto` does not expose `createHmac`. It provides `digestStringAsync` (one-way hash only). | react-native-quick-crypto |
| crypto-js in React Native | Pure-JS library, no longer actively maintained. Poor mobile performance. | react-native-quick-crypto |
| Body parsing middleware order changes | Do not move `app.use(express.json())` to after all routes to "fix" webhook raw body issues — that breaks all other JSON routes. The correct approach is route-specific `express.raw()` registered before the global JSON parser, as already done for Stripe. | Route-specific `express.raw()` for webhook endpoints |

---

## Stack Patterns by Variant

**PDF generation — institution impact report:**
- Create a `services/pdf.service.ts` that returns a `PDFDocument` stream
- In the route handler: `res.setHeader('Content-Type', 'application/pdf')`, `res.setHeader('Content-Disposition', 'attachment; filename="impact-report.pdf"')`, then `doc.pipe(res)`
- Pipe the pdfkit document directly to the response — do not buffer the full PDF in memory
- Use `doc.end()` after all content is written; pdfkit flushes the stream to `res` automatically
- Set `req.setTimeout(30_000)` on the route to handle large datasets

**PDF generation — tables without plugins:**
- Define column x-positions as constants: `const cols = { label: 50, value: 300, date: 420 }`
- Use `doc.text(cell, x, y)` with fixed `y` incremented per row: `y += 20`
- Add a header row with `doc.font('Helvetica-Bold')`, data rows with `doc.font('Helvetica')`
- Check `if (y > 720) { doc.addPage(); y = 50 }` for multi-page tables

**Webhook receiving — iThink POST to IU:**
- Register route in `express-app.ts` as: `app.post('/api/webhooks/ithink', express.raw({ type: 'application/json' }), ithinkWebhookHandler)`
- Place this line **before** `app.use(express.json())`, matching the existing Stripe pattern
- In the handler: extract `X-Webhook-Signature` and `X-Webhook-Timestamp`, verify timestamp within 5-minute window, then verify HMAC
- Use `crypto.timingSafeEqual` to compare hashes — prevents timing attacks
- Parse `req.body` as JSON only after verification: `const payload = JSON.parse(req.body.toString('utf-8'))`

**Webhook dispatching — iThink outbound:**
- Store `IU_WEBHOOK_URL` and `IU_WEBHOOK_SECRET` in iThink's environment/config
- Before each event POST: compute `const sig = QuickCrypto.createHmac('sha256', secret).update(body).digest('hex')`
- Include headers: `{ 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=' + sig, 'X-Webhook-Timestamp': String(Date.now() / 1000 | 0) }`
- Use `fetch` (React Native built-in) — no axios or other HTTP library needed

**CM attention flags — dashboard views:**
- No new frontend library needed: existing recharts + TanStack Query + React Router patterns are sufficient
- Attention flags are data aggregations from existing tables — implement as new Drizzle queries returning counts/lists, exposed via new CM-protected routes
- UI: use existing Tailwind v4 utility classes for badge/pill components (no new component library)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pdfkit ^0.18.0 | Node.js >=20.0.0, `"type": "module"` | Ships `"module"` field (`js/pdfkit.es.js`) for ESM and `"main"` field (`js/pdfkit.js`) for CJS. Node resolves the ESM entry cleanly in `"type": "module"` projects. `@types/pdfkit` must be installed separately. |
| @types/pdfkit ^0.17.5 | pdfkit ^0.18.0, TypeScript ^5.7 | DefinitelyTyped package; v0.17.5 last updated February 2026. Minor version may lag slightly behind pdfkit releases — verify API surface against official docs when using new 0.18.0 features. |
| react-native-quick-crypto ^1.0.17 | React Native >=0.71, Expo bare workflow | Does not work in Expo Go. Requires `npx expo prebuild` or a bare workflow. Install with `install()` call in the app entry point to polyfill `global.crypto`. |
| express.raw() | Express ^4.21.0 | Built into Express 4 — no body-parser package needed. Already used for Stripe in this codebase. |

---

## Sources

- [foliojs/pdfkit GitHub releases](https://github.com/foliojs/pdfkit/releases) — v0.18.0 confirmed published March 15, 2026 (HIGH)
- [foliojs/pdfkit package.json](https://github.com/foliojs/pdfkit/blob/master/package.json) — `"module"` and `"main"` fields confirmed; ESM entry point `js/pdfkit.es.js` verified (HIGH)
- [margelo/react-native-quick-crypto releases](https://github.com/margelo/react-native-quick-crypto/releases) — v1.0.17 published March 17, 2026 (HIGH)
- [react-native-quick-crypto implementation coverage](https://github.com/margelo/react-native-quick-crypto/blob/main/.docs/implementation-coverage.md) — `createHmac`, `Hmac.digest()`, `Hmac.update()` all confirmed (HIGH)
- [expo-crypto docs](https://docs.expo.dev/versions/latest/sdk/crypto/) — confirmed no HMAC support, one-way digest only (HIGH)
- [react-pdf issue #2624](https://github.com/diegomura/react-pdf/issues/2624) — ESM packaging unusable for modern packaging systems (HIGH — open March 2026)
- [react-pdf issue #2907](https://github.com/diegomura/react-pdf/issues/2907) — CJS exports removed, users downgrading to v3.4.5 (HIGH — open March 2026)
- [react-pdf issue #3017](https://github.com/diegomura/react-pdf/issues/3017) — ERR_REQUIRE_ESM despite ESM import (HIGH — open March 2026)
- [@types/pdfkit npm search results](https://www.npmjs.com/package/@types/pdfkit) — v0.17.5 confirmed, last updated February 2026 (HIGH)
- [pdfkit-table npm](https://www.npmjs.com/package/pdfkit-table) — last published 4 years ago, unmaintained (HIGH — avoidance confirmed)
- [voilab-pdf-table npm](https://www.npmjs.com/package/voilab-pdf-table) — last published 4 years ago, unmaintained (HIGH — avoidance confirmed)
- [standard-webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC-SHA256 standard, timestamp + id replay prevention pattern (HIGH)
- [stripe-node issue #734](https://github.com/stripe/stripe-node/issues/734) — express.raw() before express.json() pattern (HIGH — existing IU codebase already implements this)

---
*Stack research for: Indomitable Unity v1.2 — institution management, PDF reports, webhook integration, CM attention views*
*Researched: 2026-03-21*

# Phase 1: Foundation and Auth - Research

**Researched:** 2026-03-10
**Domain:** Monorepo scaffolding, PostgreSQL auth schema, MCP server shell, multi-path authentication, WCAG AAA design system, GDPR consent
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire foundation: pnpm monorepo with three packages (server, web, shared), PostgreSQL schema for contributors and auth, an MCP server shell with 14 tool stubs, a complete auth system supporting three identity paths (email/password, Google/LinkedIn OAuth, phone/SMS), a React/Vite web UI shell with auth flows, a WCAG AAA design system via Tailwind v4, and GDPR consent management.

The stack is well-researched at project level. This phase-level research drills into implementation specifics: exact Arctic v3 API calls for Google and LinkedIn OAuth, SMS verification service selection (Twilio Verify), pnpm workspace configuration for shared types, Drizzle ORM schema for auth/session tables, MCP tool stub patterns, Tailwind v4 CSS-first theme configuration for AAA contrast, and GDPR consent architecture.

**Primary recommendation:** Build in this order: monorepo scaffold -> database schema + migrations -> Express server skeleton -> auth system (email/password first, then OAuth, then SMS) -> MCP server shell with stubs -> React web UI shell with auth pages -> design system -> GDPR consent layer.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Landing page with sign-up CTA: brief pitch + "Upload your CV and start contributing" button, login link secondary
- OAuth as primary signup path: "Continue with Google" / "Continue with LinkedIn" as main buttons, email/password form below as alternative
- **Three identity paths:** email/password, OAuth (Google/LinkedIn), phone number (SMS) -- maximum accessibility for people who may not have email or internet presence
- **CM-assisted onboarding:** Community manager can create accounts on behalf of contributors at partner locations (libraries, community centres)
- **Kiosk mode:** Simplified self-service screen at partner locations with large buttons and guided steps
- **No-CV onboarding path:** For contributors without electronic CVs -- scan/photograph paper CV (OCR + LLM extraction) OR guided conversation that builds profile from verbal answers
- **Platform-generated accounts:** For contributors with no email, CM creates username/password and provides printed card with login details
- **VANTAGE-ready shell:** UI built as a thin visual layer that VANTAGE can hook into mid-pilot. Semantic HTML, full ARIA, accessible defaults.
- **Voice-first future:** Visual UI should be minimal, clean, and focused on displaying content/responses in large readable blocks
- **Monorepo:** Single repo with MCP server and web UI
- **Progressive schema:** Only contributor + auth tables in Phase 1

### Claude's Discretion
- Colour palette selection (within WCAG AAA + colour-blind safe constraints)
- Typography selection (within legibility + voice-first constraints)
- Component density and spacing
- Package manager choice
- Type sharing architecture
- JSONB vs normalised column boundaries
- Session management approach (JWT vs cookie sessions)
- Password hashing algorithm

### Deferred Ideas (OUT OF SCOPE)
- Full VANTAGE integration -- Phase 5 (roadmap) / mid-pilot overlay
- Voice biometrics (iListen) auth -- when VANTAGE connects
- Kiosk mode at partner locations -- could be Phase 1 stretch or separate phase
- Paper CV scanning with OCR -- Phase 2 onboarding (extends CV upload path)
- Guided conversation profile building (no-CV path) -- Phase 2 onboarding or VANTAGE integration

</user_constraints>

## Standard Stack

### Core (Phase 1 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | ^9.x | Package manager + workspaces | Best monorepo isolation -- packages not hoisted to root, strict dependency resolution |
| @modelcontextprotocol/sdk | ^1.27.x | MCP server framework | Official TypeScript SDK, McpServer class, tool registration, Streamable HTTP transport |
| Express | ^4.21.x | HTTP server / REST API | Shared with MCP server process, handles auth routes, webhooks, API |
| Drizzle ORM | ^0.45.x | Database ORM + schema | SQL-like API, TypeScript-first, tiny bundle, clean migration management |
| drizzle-kit | latest | Migration CLI | `generate` for SQL files, `push` for dev, `migrate` for production |
| postgres (porsager) | ^3.4.x | PostgreSQL driver | Pure JS, no native bindings, pairs with Drizzle |
| arctic | ^3.7.x | OAuth 2.0 clients | Lightweight, fully-typed, Google + LinkedIn providers built-in |
| argon2 | ^0.41.x | Password hashing | Argon2id -- OWASP recommended, memory-hard, resists GPU attacks |
| jose | ^6.x | JWT tokens | Web Crypto API based, no deprecated deps, signs/verifies/decodes |
| twilio | ^5.x | SMS verification | Verify API handles code generation, delivery, validation, fraud monitoring |
| resend | ^6.9.x | Transactional email | Password reset emails, welcome emails. 3,000/mo free tier |
| React | ^19.x | UI framework | Consistent with Kirk's projects |
| Vite | ^6.x | Build tool | Fast HMR, native ESM |
| Tailwind CSS | ^4.x | Styling | CSS-first config via @theme directive, OKLCH colour support |
| React Router | ^7.x | Routing | Standard React routing |
| TanStack Query | ^5.x | Server state | Caching, refetching, loading states for API calls |
| zod | ^3.24.x | Validation | Required by MCP SDK, shared across all input validation |
| TypeScript | ^5.7.x | Type safety | Required by MCP SDK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cors | latest | CORS headers | Express middleware for cross-origin requests (dev + production) |
| cookie-parser | latest | Parse cookies | Read httpOnly JWT cookies in Express middleware |
| react-cookie-consent | latest | Cookie consent banner | GDPR-compliant cookie consent UI with equal Accept/Reject |
| tsx | ^4.x | TypeScript execution | Dev-time script running |
| vitest | ^3.x | Testing | Unit/integration tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Twilio Verify | Vonage Verify | Vonage is ~EUR0.052/verification vs Twilio ~$0.10/verification (UK). Twilio has better fraud monitoring + simpler API. At pilot scale (50-100 users), cost difference is negligible (~$5-10 total). Twilio recommended for DX. |
| Twilio Verify | Plivo Verify | Cheaper at scale. Less mature fraud detection. Only consider if scaling past 10K users. |
| pnpm | npm workspaces | npm hoists packages, creating phantom dependency issues. pnpm is stricter. |
| jose | jsonwebtoken | jsonwebtoken has deprecated deps, jose uses modern Web Crypto API |

**Installation (Phase 1 packages only):**

```bash
# Root
pnpm init
pnpm add -Dw typescript

# Server package
cd packages/server
pnpm add @modelcontextprotocol/sdk zod express cors cookie-parser
pnpm add drizzle-orm postgres
pnpm add arctic argon2 jose
pnpm add twilio resend
pnpm add -D @types/express @types/cors @types/cookie-parser
pnpm add -D drizzle-kit tsx vitest

# Web package
cd packages/web
pnpm add react react-dom react-router
pnpm add @tanstack/react-query
pnpm add react-cookie-consent
pnpm add -D vite @vitejs/plugin-react
pnpm add -D tailwindcss @tailwindcss/vite

# Shared package
cd packages/shared
pnpm add zod
```

## Architecture Patterns

### Recommended Project Structure

```
indomitable-unity/
  package.json                      # Root workspace config
  pnpm-workspace.yaml              # packages: ["packages/*"]
  tsconfig.base.json               # Shared TS config (target ES2022, module Node16)
  .env.example                     # Environment variables template
  .gitignore

  packages/
    shared/                         # @indomitable-unity/shared
      package.json                  # { "name": "@indomitable-unity/shared", "main": "src/index.ts" }
      src/
        index.ts                    # Re-exports all shared types
        types/
          contributor.ts            # Contributor, ContributorStatus types
          auth.ts                   # AuthProvider, Session, TokenPayload types
        schemas/
          auth.schemas.ts           # Zod schemas for auth validation
          contributor.schemas.ts    # Zod schemas for contributor validation
        constants.ts                # Status enums, role constants

    server/                         # @indomitable-unity/server
      package.json
      tsconfig.json                 # extends ../../tsconfig.base.json
      drizzle.config.ts             # Drizzle Kit configuration
      src/
        index.ts                    # Entry point -- starts Express
        express-app.ts              # Express app setup, route mounting
        mcp-server.ts               # McpServer instance + tool registration
        config/
          env.ts                    # Environment variable validation (Zod)
        middleware/
          auth.ts                   # JWT verification from httpOnly cookie
          error-handler.ts          # Global error handling
        routes/
          auth.ts                   # /api/auth/* (register, login, oauth, refresh, logout)
          contributors.ts           # /api/contributors/* (stub for Phase 1)
        tools/                      # MCP tool stubs (14 tools, 4 domains)
          contributors/
            get-contributor-profile.ts
            update-contributor-profile.ts
            get-contributor-circles.ts
            get-contributor-impact.ts
          challenges/
            list-challenges.ts
            get-challenge-detail.ts
            express-interest.ts
            submit-challenge.ts
          circles/
            get-circle-detail.ts
            add-circle-note.ts
            get-circle-notes.ts
            submit-resolution.ts
            update-social-link.ts
          wellbeing/
            submit-wellbeing-checkin.ts
          index.ts                  # registerAllTools()
        services/
          auth.service.ts           # Register, login, OAuth, token management
          contributor.service.ts    # Profile CRUD (minimal in Phase 1)
        db/
          schema.ts                 # Drizzle schema (contributors + auth tables)
          migrations/               # SQL migration files
          index.ts                  # Connection pool setup

    web/                            # @indomitable-unity/web
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx                    # React entry
        App.tsx                     # Router + QueryClientProvider
        styles/
          app.css                   # @import "tailwindcss" + @theme block
        pages/
          Landing.tsx               # Sign-up CTA, brief pitch
          Login.tsx                 # OAuth buttons + email/password form
          Register.tsx              # Registration form
          PhoneLogin.tsx            # SMS verification flow
          ForgotPassword.tsx        # Password reset request
          ResetPassword.tsx         # Password reset form (from email link)
          Dashboard.tsx             # Post-auth landing (placeholder)
          PrivacyPolicy.tsx         # GDPR privacy policy
          CookiePolicy.tsx          # Cookie policy
        components/
          ui/                       # Design system primitives
            Button.tsx              # 48px+ touch targets, ARIA labels
            Input.tsx               # Large text inputs, clear labels
            Card.tsx                # Content container
            Alert.tsx               # Success/error/warning messages
            ConsentBanner.tsx       # GDPR cookie consent
          layout/
            AppShell.tsx            # Header + main + footer
            Navbar.tsx              # Navigation with logout
            ProtectedRoute.tsx      # Auth-gated route wrapper
        hooks/
          useAuth.ts                # Auth state, login/logout/register functions
        api/
          client.ts                 # Fetch wrapper with cookie credentials
          auth.ts                   # Auth API calls
        lib/
          constants.ts              # API base URL, route paths
```

### Pattern 1: Three-Package Monorepo with Workspace Protocol

**What:** pnpm workspaces with `@indomitable-unity/shared` referenced by both server and web packages.

**Configuration:**

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```json
// packages/server/package.json
{
  "name": "@indomitable-unity/server",
  "dependencies": {
    "@indomitable-unity/shared": "workspace:*"
  }
}
```

```json
// packages/web/package.json
{
  "name": "@indomitable-unity/web",
  "dependencies": {
    "@indomitable-unity/shared": "workspace:*"
  }
}
```

```json
// packages/shared/package.json
{
  "name": "@indomitable-unity/shared",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**Key insight:** The shared package uses `"main": "src/index.ts"` -- no build step needed. Both server (tsx) and web (Vite) can consume TypeScript source directly. Vite resolves workspace dependencies automatically. The server uses tsx which handles TS natively.

### Pattern 2: Arctic v3 OAuth Flow (Google + LinkedIn)

**What:** OAuth implementation using Arctic's stateless, Fetch-API-based client.

**Google OAuth:**
```typescript
// Source: https://arcticjs.dev/providers/google
import * as arctic from "arctic";

const google = new arctic.Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!  // e.g., http://localhost:3000/api/auth/callback/google
);

// 1. Generate auth URL (in GET /api/auth/google)
const state = arctic.generateState();
const codeVerifier = arctic.generateCodeVerifier();
const scopes = ["openid", "profile", "email"];
const url = google.createAuthorizationURL(state, codeVerifier, scopes);
// Store state + codeVerifier in httpOnly cookies for callback validation
// Redirect user to url.toString()

// 2. Handle callback (in GET /api/auth/callback/google)
const tokens = await google.validateAuthorizationCode(code, codeVerifier);
const accessToken = tokens.accessToken();
const idToken = tokens.idToken();
const claims = arctic.decodeIdToken(idToken);
// claims contains: sub, name, email, picture
// Create/find contributor, issue JWT, set session cookie
```

**LinkedIn OAuth:**
```typescript
// Source: https://arcticjs.dev/providers/linkedin
import * as arctic from "arctic";

const linkedin = new arctic.LinkedIn(
  process.env.LINKEDIN_CLIENT_ID!,
  process.env.LINKEDIN_CLIENT_SECRET!,
  process.env.LINKEDIN_REDIRECT_URI!
);

// 1. Generate auth URL (in GET /api/auth/linkedin)
const state = arctic.generateState();
const scopes = ["openid", "profile", "email"];
const url = linkedin.createAuthorizationURL(state, scopes);
// Note: LinkedIn does NOT use PKCE (no codeVerifier)

// 2. Handle callback (in GET /api/auth/callback/linkedin)
const tokens = await linkedin.validateAuthorizationCode(code);
const accessToken = tokens.accessToken();

// Get profile via userinfo endpoint
const response = await fetch("https://api.linkedin.com/v2/userinfo", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const user = await response.json();
// user contains: sub, name, email, picture

// Or decode ID token
const idToken = tokens.idToken();
const claims = arctic.decodeIdToken(idToken);
```

**Key differences between Google and LinkedIn:**
- Google uses PKCE (codeVerifier required), LinkedIn does not
- LinkedIn access tokens expire after 60 days, refresh tokens are limited availability
- Both support OpenID Connect (ID tokens with claims)
- Store LinkedIn profile data as snapshot at import time -- do not depend on ongoing API access

### Pattern 3: JWT Session with httpOnly Cookies

**What:** Short-lived access token + longer-lived refresh token, both in httpOnly cookies.

```typescript
// services/auth.service.ts
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function createTokens(contributorId: string, role: string) {
  const accessToken = await new jose.SignJWT({ sub: contributorId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  const refreshToken = await new jose.SignJWT({ sub: contributorId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string) {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET);
  return payload;
}

// Setting cookies in Express route handler
function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie("access_token", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
  });
  res.cookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth/refresh", // Only sent to refresh endpoint
  });
}
```

**Session management recommendation: Stateless JWT (not database sessions).**
- Access token: 15 min, httpOnly cookie, sent with every request
- Refresh token: 7 days, httpOnly cookie, path restricted to `/api/auth/refresh`
- No sessions table needed -- JWT is self-validating
- For logout: clear cookies client-side. For forced logout (security), maintain a short token denylist in memory or Redis (not needed at pilot scale)
- Refresh token path restriction prevents it being sent with every request, reducing exposure

### Pattern 4: SMS/Phone Authentication with Twilio Verify

**What:** Phone number as third identity path using Twilio Verify API.

```typescript
// services/auth.service.ts (SMS portion)
import twilio from "twilio";

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;

// 1. Send verification code
export async function sendSMSCode(phoneNumber: string) {
  const verification = await twilioClient.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verifications.create({
      to: phoneNumber,  // E.164 format: +447700900123
      channel: "sms",
    });
  return verification.status; // "pending"
}

// 2. Check verification code
export async function verifySMSCode(phoneNumber: string, code: string) {
  const check = await twilioClient.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: phoneNumber,
      code: code,
    });
  return check.status; // "approved" or "pending" (wrong code)
}
```

**Express routes:**
```typescript
// POST /api/auth/phone/send - sends SMS code
router.post("/phone/send", async (req, res) => {
  const { phoneNumber } = req.body; // Validate E.164 format
  await authService.sendSMSCode(phoneNumber);
  res.json({ message: "Code sent" });
});

// POST /api/auth/phone/verify - verifies code, creates/finds account, issues JWT
router.post("/phone/verify", async (req, res) => {
  const { phoneNumber, code } = req.body;
  const status = await authService.verifySMSCode(phoneNumber, code);
  if (status !== "approved") return res.status(400).json({ error: "Invalid code" });
  // Find or create contributor by phone number
  // Issue JWT tokens, set cookies
});
```

**Twilio Verify pricing for UK:**
- $0.05 per successful verification + $0.0524 per SMS to UK numbers
- Total: ~$0.10 per verification attempt
- At pilot scale (100 users, ~200 verifications): ~$20 total
- Twilio Verify handles code generation, rate limiting, and fraud monitoring -- do not hand-roll this

**Twilio setup requirements:**
1. Create Twilio account + Verify Service in Twilio Console
2. Get Account SID, Auth Token, Verify Service SID
3. For UK SMS: no special number needed -- Twilio handles sender selection
4. Phone numbers must be E.164 format (+44...)

### Pattern 5: MCP Tool Stub Pattern

**What:** Register all 14 tools as properly-typed stubs that return "not implemented" responses.

```typescript
// tools/contributors/get-contributor-profile.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGetContributorProfile(server: McpServer) {
  server.tool(
    "get_contributor_profile",
    "Retrieve a contributor's profile including expertise, skills, availability, and preferences",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
    },
    async ({ contributor_id }) => {
      // Phase 1: stub response
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "NOT_IMPLEMENTED",
            message: "get_contributor_profile will be implemented in Phase 2",
            tool: "get_contributor_profile",
            received: { contributor_id },
          }),
        }],
        isError: true,
      };
    }
  );
}
```

```typescript
// tools/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Import all 14 registration functions
import { registerGetContributorProfile } from "./contributors/get-contributor-profile.js";
// ... 13 more imports

export function registerAllTools(server: McpServer) {
  // Contributors (4 tools)
  registerGetContributorProfile(server);
  registerUpdateContributorProfile(server);
  registerGetContributorCircles(server);
  registerGetContributorImpact(server);

  // Challenges (4 tools)
  registerListChallenges(server);
  registerGetChallengeDetail(server);
  registerExpressInterest(server);
  registerSubmitChallenge(server);

  // Circles (5 tools)
  registerGetCircleDetail(server);
  registerAddCircleNote(server);
  registerGetCircleNotes(server);
  registerSubmitResolution(server);
  registerUpdateSocialLink(server);

  // Wellbeing (1 tool)
  registerSubmitWellbeingCheckin(server);
}
```

```typescript
// mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

export const mcpServer = new McpServer({
  name: "indomitable-unity",
  version: "0.1.0",
});

registerAllTools(mcpServer);
```

**Key insight for stubs:** Each stub should have the FULL Zod schema for its inputs and a descriptive tool description, even though the implementation is a placeholder. This validates the tool contract and lets VANTAGE (or Claude Desktop) discover and attempt to use the tools for testing the MCP connection.

### Pattern 6: Tailwind v4 CSS-First WCAG AAA Design System

**What:** Custom theme via `@theme` directive with WCAG AAA (7:1) contrast ratios and colour-blind safe palette.

```css
/* packages/web/src/styles/app.css */
@import "tailwindcss";

@theme {
  /* === Colour Palette: Warm Defiance === */
  /* Primary: Deep navy -- authority without corporate coldness */
  --color-primary-900: oklch(0.20 0.05 250);
  --color-primary-800: oklch(0.27 0.06 250);
  --color-primary-700: oklch(0.34 0.07 250);
  --color-primary-600: oklch(0.41 0.08 250);
  --color-primary-500: oklch(0.48 0.09 250);

  /* Accent: Warm amber/gold -- warmth, not corporate */
  --color-accent-600: oklch(0.65 0.16 75);
  --color-accent-500: oklch(0.72 0.17 75);
  --color-accent-400: oklch(0.79 0.15 75);

  /* Neutral: Warm greys */
  --color-neutral-950: oklch(0.13 0.01 250);
  --color-neutral-900: oklch(0.18 0.01 250);
  --color-neutral-800: oklch(0.25 0.01 250);
  --color-neutral-200: oklch(0.88 0.005 250);
  --color-neutral-100: oklch(0.93 0.003 250);
  --color-neutral-50: oklch(0.97 0.002 250);

  /* Semantic */
  --color-success: oklch(0.55 0.15 145);
  --color-warning: oklch(0.70 0.15 75);
  --color-error: oklch(0.55 0.20 25);

  /* === Typography === */
  --font-family-sans: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;

  /* Base size 18px (1.125rem) -- legible for 50-75+ demographic */
  --font-size-base: 1.125rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;
  --font-size-2xl: 1.875rem;
  --font-size-3xl: 2.25rem;
  --font-size-sm: 1rem;     /* Smallest allowed text -- never below 16px */

  /* Line heights -- generous for readability */
  --line-height-normal: 1.6;
  --line-height-relaxed: 1.75;

  /* === Spacing === */
  /* Generous padding for touch targets and breathing room */
  --spacing-touch: 3rem;    /* 48px minimum touch target */
}
```

**Contrast verification checklist (must verify with tool like WebAIM):**
- Primary-900 text on Neutral-50 background: target 14:1+
- Primary-700 text on Neutral-100 background: target 7:1+
- Accent-600 text on Primary-900 background: target 7:1+
- Error/Success/Warning text on white: target 7:1+
- Never rely on colour alone -- always pair with icon, shape, or text label

**Typography decision: Inter font family.**
- Highly legible at all sizes, designed for screens
- Excellent x-height ratio (legibility for older eyes)
- Variable weight support (300-800)
- Free, open source, self-hostable
- Fallback chain: Segoe UI (Windows), system-ui

### Pattern 7: GDPR Consent Architecture

**What:** Granular, per-purpose consent tracking with audit trail.

**Database schema for consent:**
```typescript
// Part of db/schema.ts
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  // "profile_processing", "cv_processing", "marketing", "analytics", "cookies_analytics"
  granted: boolean("granted").notNull(),
  policyVersion: varchar("policy_version", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),  // For audit trail
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at").defaultNow(),
  withdrawnAt: timestamp("withdrawn_at"),
});
```

**Consent purposes for Phase 1:**
1. **Essential cookies** -- no consent needed (strictly necessary)
2. **Profile data processing** -- lawful basis: legitimate interests (marketplace matching). Document LIA.
3. **Analytics cookies** -- consent required, default OFF
4. **Marketing emails** -- consent required, separate opt-in, never pre-ticked

**Cookie consent implementation:**
- Use `react-cookie-consent` for the banner UI
- Equal-weight Accept/Reject buttons (ICO requirement as of 2025)
- Category toggles: Essential (always on, greyed out), Analytics (off by default)
- Log consent with timestamp, policy version, and session identifier
- Footer link to "Manage cookies" on every page for one-click withdrawal
- Block all non-essential scripts (analytics) until consent is granted

### Pattern 8: CM-Assisted Account Creation

**What:** Community manager creates accounts on behalf of contributors who cannot self-register.

```typescript
// In auth.service.ts
export async function createAccountForContributor(
  cmId: string,  // authenticated CM's contributor ID
  data: {
    name: string;
    username?: string;        // Generated if not provided
    password?: string;        // Generated if not provided
    phoneNumber?: string;     // Optional
    email?: string;           // Optional -- may not have one
  }
) {
  // Verify CM has admin/cm role
  // Generate username if needed (e.g., firstname.lastname)
  // Generate temporary password if needed
  // Hash password with Argon2id
  // Create contributor record with auth_provider = "cm_created"
  // Return { username, password } for printing on card
}
```

**Database support:** Add `role` column to contributors (or separate `roles` table):
```typescript
export const contributorRole = pgEnum("contributor_role", ["contributor", "community_manager", "admin"]);
```

**Printed card flow:**
- CM creates account -> receives generated username + password
- CM prints card (simple browser print of a receipt-style page)
- Contributor uses username/password to log in
- On first login, prompt to set their own password (optional, not forced)

### Anti-Patterns to Avoid

- **Rolling your own SMS OTP:** Do not generate codes, manage expiry, handle rate limiting, or detect fraud yourself. Twilio Verify does all of this. Hand-rolled OTP is a security vulnerability waiting to happen.
- **Storing JWT in localStorage:** XSS attack vector. Always use httpOnly cookies.
- **Single consent checkbox:** Invalid under UK GDPR. Must be granular per purpose.
- **LinkedIn as primary auth:** 60-day token expiry, no guaranteed refresh tokens. Always offer email/password as fallback.
- **Building the design system incrementally:** Set the AAA contrast palette, 18px base font, and 48px touch targets in the Tailwind theme FIRST. Retrofitting is 5x more expensive.
- **Skipping the shared types package:** Without `@indomitable-unity/shared`, types drift between server and web within weeks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS verification codes | OTP generation + delivery + rate limiting | Twilio Verify API | Fraud detection, carrier routing, retry logic, code expiry -- all handled |
| OAuth state management | State/CSRF token generation + validation | Arctic's generateState() + cookie storage | Subtle CSRF vulnerabilities in hand-rolled implementations |
| Password hashing | Custom hash function or raw bcrypt | argon2 library (Argon2id algorithm) | OWASP recommended, memory-hard, configurable parameters |
| JWT creation/validation | Manual JWT string construction | jose library | Cryptographic edge cases, algorithm confusion attacks |
| Cookie consent UI | Custom consent banner | react-cookie-consent | ICO compliance requirements change frequently, library tracks them |
| Database migrations | Raw SQL ALTER TABLE scripts | drizzle-kit generate + migrate | Tracks migration order, handles rollbacks, generates from schema diff |
| CORS handling | Manual header setting | cors middleware | Preflight requests, credential handling, origin matching |

**Key insight:** Auth is the domain where hand-rolling causes the most security vulnerabilities. Use established libraries for every auth primitive.

## Common Pitfalls

### Pitfall 1: LinkedIn OAuth Token Expiry
**What goes wrong:** LinkedIn access tokens expire after 60 days. No guaranteed refresh tokens.
**Why it happens:** Developers assume all OAuth tokens can be refreshed.
**How to avoid:** Store LinkedIn profile data as snapshot at import time. Email/password is the primary auth path, LinkedIn is optional enrichment. Track token expiry in database. Send reminders at day 50.
**Warning signs:** No email/password alternative, no token expiry tracking.

### Pitfall 2: Arctic v3 State/PKCE Mismatch
**What goes wrong:** Google requires PKCE (codeVerifier), LinkedIn does not. Using the wrong pattern for each provider causes auth failures.
**Why it happens:** Developers copy-paste the Google pattern for LinkedIn or vice versa.
**How to avoid:** Google: `createAuthorizationURL(state, codeVerifier, scopes)`. LinkedIn: `createAuthorizationURL(state, scopes)`. Note the difference in function signatures.
**Warning signs:** OAuth callback returning invalid_grant errors.

### Pitfall 3: Cookie SameSite + OAuth Redirects
**What goes wrong:** OAuth callback redirects fail because the state cookie is not sent back due to SameSite restrictions.
**Why it happens:** `sameSite: "strict"` blocks cookies on cross-origin redirects (which OAuth callbacks are).
**How to avoid:** Use `sameSite: "lax"` for the OAuth state cookie. Lax allows cookies on top-level navigations (which OAuth redirects are) but blocks them on cross-origin subrequests.
**Warning signs:** State mismatch errors after OAuth callback.

### Pitfall 4: Phone Number Format Validation
**What goes wrong:** Users enter phone numbers in local format (07700 900123) but Twilio requires E.164 format (+447700900123).
**Why it happens:** No input normalisation.
**How to avoid:** Validate and normalise all phone numbers to E.164 on the server before sending to Twilio. Strip spaces, add +44 prefix for UK numbers if missing. Display format can remain friendly (07700 900 123).
**Warning signs:** Twilio API errors about invalid phone number format.

### Pitfall 5: GDPR Bundled Consent
**What goes wrong:** One checkbox for everything. ICO rejects it.
**Why it happens:** Developers think "just accept T&Cs" is sufficient.
**How to avoid:** Separate consent per processing purpose. Track consent with timestamp and policy version. Different lawful bases for different data categories.
**Warning signs:** Single consent checkbox, no audit trail, no versioned privacy policy.

### Pitfall 6: Tailwind v4 Config Migration
**What goes wrong:** Developers try to use `tailwind.config.js` (v3 pattern) with Tailwind v4. V4 is CSS-first -- no JS config file.
**Why it happens:** Most tutorials and AI training data reference v3 patterns.
**How to avoid:** Use `@theme { }` directive in CSS. Use `@import "tailwindcss"` not `@tailwind base/components/utilities`. Consult official v4 docs only.
**Warning signs:** tailwind.config.js file exists, `@tailwind` directives in CSS.

### Pitfall 7: Shared Package Import Resolution
**What goes wrong:** TypeScript can't resolve imports from `@indomitable-unity/shared` in the web package.
**Why it happens:** Missing workspace protocol in package.json, or tsconfig paths not configured.
**How to avoid:** Add `"@indomitable-unity/shared": "workspace:*"` to dependencies. In the shared package, set `"main": "src/index.ts"`. Vite resolves workspace deps automatically. For the server (tsx), it also resolves workspace deps natively.
**Warning signs:** Module not found errors, red squiggles on imports from shared.

## Code Examples

### Complete Auth Route Structure

```typescript
// routes/auth.ts
import { Router } from "express";
import * as arctic from "arctic";
import { authService } from "../services/auth.service.js";

const router = Router();

// --- Email/Password ---
router.post("/register", async (req, res) => { /* validate, hash, create, issue JWT */ });
router.post("/login", async (req, res) => { /* validate, verify hash, issue JWT */ });
router.post("/forgot-password", async (req, res) => { /* generate reset token, send email via Resend */ });
router.post("/reset-password", async (req, res) => { /* verify token, update password hash */ });

// --- Google OAuth ---
router.get("/google", async (req, res) => {
  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);
  res.cookie("google_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600000 });
  res.cookie("google_code_verifier", codeVerifier, { httpOnly: true, sameSite: "lax", maxAge: 600000 });
  res.redirect(url.toString());
});

router.get("/callback/google", async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies.google_oauth_state;
  const codeVerifier = req.cookies.google_code_verifier;
  if (state !== storedState) return res.status(400).send("State mismatch");
  const tokens = await google.validateAuthorizationCode(code as string, codeVerifier);
  const claims = arctic.decodeIdToken(tokens.idToken());
  // Find or create contributor from claims
  // Issue JWT, set auth cookies, redirect to dashboard
});

// --- LinkedIn OAuth ---
router.get("/linkedin", async (req, res) => {
  const state = arctic.generateState();
  const url = linkedin.createAuthorizationURL(state, ["openid", "profile", "email"]);
  res.cookie("linkedin_oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600000 });
  res.redirect(url.toString());
});

router.get("/callback/linkedin", async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies.linkedin_oauth_state;
  if (state !== storedState) return res.status(400).send("State mismatch");
  const tokens = await linkedin.validateAuthorizationCode(code as string);
  const claims = arctic.decodeIdToken(tokens.idToken());
  // Find or create contributor from claims
  // Issue JWT, set auth cookies, redirect to dashboard
});

// --- Phone/SMS ---
router.post("/phone/send", async (req, res) => { /* validate phone, send via Twilio Verify */ });
router.post("/phone/verify", async (req, res) => { /* verify code, find/create, issue JWT */ });

// --- Session ---
router.post("/refresh", async (req, res) => { /* verify refresh token, issue new access token */ });
router.post("/logout", async (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
  res.json({ message: "Logged out" });
});

// --- CM Account Creation ---
router.post("/create-account", authMiddleware, requireRole("community_manager"), async (req, res) => {
  // Create account on behalf of contributor
  // Return username + password for printed card
});

export { router as authRoutes };
```

### Drizzle Schema for Phase 1 (Contributors + Auth Only)

```typescript
// db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const authProvider = pgEnum("auth_provider", [
  "email", "google", "linkedin", "phone", "cm_created"
]);

export const contributorRole = pgEnum("contributor_role", [
  "contributor", "community_manager", "admin"
]);

export const contributorStatus = pgEnum("contributor_status", [
  "onboarding", "active", "paused", "inactive"
]);

export const contributors = pgTable("contributors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).unique(),       // nullable -- phone-only users
  username: varchar("username", { length: 100 }).unique(),  // for CM-created accounts
  phoneNumber: varchar("phone_number", { length: 20 }).unique(), // E.164 format
  passwordHash: text("password_hash"),                      // email + cm_created accounts
  authProvider: authProvider("auth_provider").notNull(),
  authProviderId: varchar("auth_provider_id", { length: 255 }), // Google/LinkedIn sub
  role: contributorRole("role").default("contributor"),
  status: contributorStatus("status").default("onboarding"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: uuid("created_by").references((): any => contributors.id), // CM who created
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  tokenHash: text("token_hash").notNull(),    // Hash of the reset token (never store raw)
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// OAuth account linking (supports multiple providers per contributor)
export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  provider: varchar("provider", { length: 20 }).notNull(), // "google", "linkedin"
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  accessToken: text("access_token"),                         // Encrypted at rest
  refreshToken: text("refresh_token"),                       // Encrypted at rest
  tokenExpiresAt: timestamp("token_expires_at"),
  profileSnapshot: jsonb("profile_snapshot"),                 // Name, email, picture at auth time
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GDPR consent tracking
export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id),
  purpose: varchar("purpose", { length: 50 }).notNull(),
  granted: boolean("granted").notNull(),
  policyVersion: varchar("policy_version", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at").defaultNow(),
  withdrawnAt: timestamp("withdrawn_at"),
});
```

**Key schema decisions for Phase 1:**
- `email` is nullable -- phone-only users and CM-created accounts may not have email
- `username` is nullable -- only used for CM-created accounts
- `oauthAccounts` is a separate table (not columns on contributor) to support linking multiple providers
- `passwordResetTokens` stores hashed tokens with expiry -- never raw tokens
- `consentRecords` tracks per-purpose consent with policy version for audit trail
- No sessions table -- JWT is stateless

### Environment Variables Template

```bash
# .env.example

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/indomitable_unity

# Auth - JWT
JWT_SECRET=generate-a-256-bit-secret-here

# Auth - Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Auth - LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/callback/linkedin

# Auth - Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=

# Email
RESEND_API_KEY=

# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS config) | @theme directive in CSS (CSS-first) | Tailwind v4, Jan 2025 | No JS config file. Theme defined in CSS. Most tutorials are outdated. |
| Passport.js for OAuth | Arctic v3 (lightweight, typed clients) | 2024-2025 | No middleware, no session assumptions, smaller deps |
| bcrypt for passwords | Argon2id | OWASP update 2024 | Memory-hard, better GPU resistance |
| jsonwebtoken for JWT | jose | 2024-2025 | Web Crypto API, no deprecated deps |
| npm/yarn for monorepos | pnpm workspaces | 2023-present | Strict isolation, no phantom deps, faster installs |
| server.registerTool() (MCP) | server.tool() (McpServer class) | MCP SDK 1.x | Simpler API, Zod schemas inline |

**Deprecated/outdated:**
- `@tailwind base/components/utilities` directives -- use `@import "tailwindcss"` in v4
- `tailwind.config.js` -- use `@theme {}` in CSS in v4
- Passport.js -- poorly maintained, middleware-heavy
- jsonwebtoken package -- deprecated dependencies

## Open Questions

1. **Colour palette exact values need accessibility testing**
   - What we know: OKLCH values defined in the @theme block above
   - What's unclear: Exact contrast ratios depend on rendering and need verification with WebAIM or similar tool
   - Recommendation: Verify contrast ratios during implementation using browser DevTools or axe. Adjust OKLCH lightness values if any pair falls below 7:1.

2. **Twilio Verify Service setup for UK**
   - What we know: Pricing is ~$0.10 per verification to UK numbers. API is straightforward.
   - What's unclear: Whether Twilio requires specific sender ID registration for UK SMS (UK regulations around Alphanumeric Sender IDs).
   - Recommendation: Create Twilio account, set up Verify Service, test with a UK mobile number before building the full flow.

3. **CM role bootstrapping**
   - What we know: Need at least one community_manager role account to create accounts for others
   - What's unclear: How the first CM account gets created (chicken-and-egg)
   - Recommendation: Seed script that creates an admin/CM account during database migration. `pnpm run db:seed` creates Kirk's account as admin.

4. **Password reset email template**
   - What we know: Resend supports React Email templates
   - What's unclear: Whether to invest in styled email templates in Phase 1 or use plain text
   - Recommendation: Plain text emails in Phase 1. Styled templates can come later.

## Sources

### Primary (HIGH confidence)
- [Arctic v3 - Google Provider](https://arcticjs.dev/providers/google) - Authorization URL, code validation, ID token decoding
- [Arctic v3 - LinkedIn Provider](https://arcticjs.dev/providers/linkedin) - LinkedIn-specific OAuth flow (no PKCE)
- [Arctic v3 - OAuth 2.0 Guide](https://arcticjs.dev/guides/oauth2) - State management, error handling
- [pnpm Workspaces](https://pnpm.io/workspaces) - Workspace protocol, configuration
- [Tailwind CSS v4 - Theme Variables](https://tailwindcss.com/docs/theme) - @theme directive, CSS-first config
- [Tailwind CSS v4 - Custom Colors](https://tailwindcss.com/docs/customizing-colors) - OKLCH format, namespace overrides
- [Twilio Verify API](https://www.twilio.com/docs/verify) - SMS verification flow
- [Twilio SMS Pricing UK](https://www.twilio.com/en-us/sms/pricing/gb) - $0.0524/SMS to UK numbers
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) - UK cookie consent requirements

### Secondary (MEDIUM confidence)
- [Setting up a Monorepo with pnpm and TypeScript](https://brockherion.dev/blog/posts/setting-up-a-monorepo-with-pnpm-and-typescript/) - Practical setup guide
- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk) - Tool registration patterns
- [Anthropic MCP Builder Skills](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/node_mcp_server.md) - Server implementation reference
- [JWT with httpOnly cookies pattern](https://dev.to/wiljeder/secure-authentication-with-jwts-rotating-refresh-tokens-typescript-express-vanilla-js-4f41) - Access/refresh token pattern
- [Drizzle ORM PostgreSQL Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Schema patterns

### Tertiary (LOW confidence)
- OKLCH colour values in the design system -- need verification with contrast checker tools
- Twilio UK Alphanumeric Sender ID requirements -- verify during Twilio account setup

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm/official docs, versions confirmed
- Architecture (monorepo): HIGH - pnpm workspaces are well-documented, pattern is standard
- Architecture (auth): HIGH - Arctic v3 API verified against official docs, patterns are standard
- SMS verification: HIGH - Twilio Verify API is well-documented, pricing confirmed
- Design system: MEDIUM - OKLCH values need contrast verification, Tailwind v4 @theme is new but official
- GDPR consent: HIGH - ICO guidance is explicit, consent architecture is well-established
- MCP tool stubs: HIGH - Based on official SDK patterns

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days -- stable technologies, no fast-moving changes expected)

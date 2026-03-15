# Architecture Patterns

**Domain:** Social enterprise expertise deployment platform (MCP server + web UI marketplace)
**Researched:** 2026-03-10

## Recommended Architecture

### High-Level System Diagram

```
                         MVP                              Future
                    +-----------+                    +-------------+
                    |  React    |                    |  VANTAGE    |
                    |  Web UI   |                    |  AI Agent   |
                    +-----+-----+                    +------+------+
                          |                                 |
                     REST API                          MCP Client
                     (Express)                     (Streamable HTTP)
                          |                                 |
                    +-----+-----+                           |
                    |  Express  +---------------------------+
                    |  Gateway  |
                    +-----+-----+
                          |
                    +-----+-----+
                    |  Domain   |
                    |  Services |
                    +-----+-----+
                          |
          +------+--------+--------+------+
          |      |        |        |      |
        +---+  +---+   +----+  +----+  +----+
        |PG |  |S3 |   |Stripe| |Auth|  |Email|
        +---+  +---+   +------+ +----+  +-----+
```

### The Key Architectural Insight: Domain Services Are the Core

The MCP server and the REST API are both **thin interfaces** over the same domain service layer. This is the critical decision that makes VANTAGE integration seamless later.

```
WRONG:  React UI -> Express REST API -> Database
        VANTAGE  -> MCP Server -> Database (duplicated logic)

RIGHT:  React UI -> Express REST API -> Domain Services -> Database
        VANTAGE  -> MCP Server -------> Domain Services -> Database
```

Domain services contain ALL business logic. The MCP tool handlers and REST route handlers are both thin wrappers that validate input, call a domain service, and format the response.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| React Web UI | User-facing pages, forms, navigation | Express Gateway (REST) |
| Express Gateway | REST routes for web UI, MCP Streamable HTTP endpoint, auth middleware, webhook receiver | Domain Services, Auth Provider, Stripe |
| MCP Server | Exposes 14 tools via MCP protocol for AI clients | Domain Services (same as Express) |
| Domain Services | ALL business logic -- matching, payments, profiles, circles | Database, S3, Stripe API, Email |
| PostgreSQL | Persistent data store for 6 core entities | Domain Services only |
| S3/R2 | CV file storage, attachments | Domain Services only |
| Stripe Connect | Payment processing, connected accounts | Express (webhooks), Domain Services (API calls) |
| Auth Layer | JWT issuance, OAuth flows, session validation | Express Gateway middleware |

### Data Flow

**MVP Flow (Web UI):**
```
User action in React UI
  -> HTTP request to Express REST endpoint
  -> Auth middleware validates JWT
  -> Route handler calls domain service
  -> Domain service executes business logic
  -> Domain service reads/writes PostgreSQL
  -> Response flows back through Express -> React
```

**Future Flow (VANTAGE):**
```
User speaks/types to VANTAGE
  -> VANTAGE decides which MCP tool to call
  -> MCP client sends tool call via Streamable HTTP
  -> MCP server handler calls SAME domain service
  -> Domain service executes business logic
  -> Response flows back through MCP -> VANTAGE -> User
```

**Stripe Payment Flow:**
```
Contributor onboarding:
  React UI -> Express -> Stripe API (create Express account + Account Link)
  -> Redirect to Stripe hosted onboarding -> Webhook confirms account ready

Challenge payment:
  Challenger pays -> Stripe PaymentIntent (destination charge)
  -> Platform takes 25% fee -> 75% to contributor's connected account
  -> Webhook confirms payment -> Domain service updates challenge status
```

**CV Upload Flow:**
```
React UI uploads file
  -> Express route receives multipart upload
  -> Domain service stores raw file in S3/R2
  -> Domain service calls CV parser (pdf-parse + LLM extraction)
  -> Parsed profile stored as JSONB in contributor record
  -> Contributor can edit parsed fields via UI
```

---

## MCP Server Structure: Organizing 14 Tools Across 4 Domains

Use a domain-grouped file structure. Each domain gets its own directory with tool definitions and the domain service it delegates to.

**Confidence: HIGH** -- Based on official MCP TypeScript SDK patterns and community best practices.

### Tool Organization Pattern

```
packages/server/src/
  tools/
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
    index.ts              # Registers all tools with McpServer
  services/
    contributor.service.ts  # Business logic for contributors
    challenge.service.ts    # Business logic for challenges
    circle.service.ts       # Business logic for circles
    wellbeing.service.ts    # Business logic for wellbeing
    matching.service.ts     # Challenge-to-contributor matching
    payment.service.ts      # Stripe Connect operations
    storage.service.ts      # S3/R2 file operations
    cv-parser.service.ts    # CV upload + parse pipeline
    auth.service.ts         # Auth logic
    email.service.ts        # Notification dispatch
  db/
    schema.ts               # Drizzle ORM schema definitions
    migrations/             # SQL migration files
    index.ts                # Database connection pool
  mcp-server.ts             # McpServer instance + tool registration
  express-app.ts            # Express app with REST routes + MCP endpoint
  index.ts                  # Entry point
```

### Tool Definition Pattern

Each tool file exports a registration function. Tools are thin -- they validate input with Zod, call the domain service, and return formatted MCP content.

```typescript
// tools/contributors/get-contributor-profile.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { contributorService } from "../../services/contributor.service";

export function registerGetContributorProfile(server: McpServer) {
  server.tool(
    "get_contributor_profile",
    "Retrieve a contributor's parsed profile including expertise, availability, and preferences",
    {
      contributor_id: z.string().uuid().describe("The contributor's unique ID"),
    },
    async ({ contributor_id }) => {
      const profile = await contributorService.getProfile(contributor_id);
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      };
    }
  );
}
```

### Tool Registration (index.ts)

```typescript
// tools/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { registerGetContributorProfile } from "./contributors/get-contributor-profile";
import { registerUpdateContributorProfile } from "./contributors/update-contributor-profile";
// ... all 14 imports

export function registerAllTools(server: McpServer) {
  // Contributors domain
  registerGetContributorProfile(server);
  registerUpdateContributorProfile(server);
  registerGetContributorCircles(server);
  registerGetContributorImpact(server);

  // Challenges domain
  registerListChallenges(server);
  registerGetChallengeDetail(server);
  registerExpressInterest(server);
  registerSubmitChallenge(server);

  // Circles domain
  registerGetCircleDetail(server);
  registerAddCircleNote(server);
  registerGetCircleNotes(server);
  registerSubmitResolution(server);
  registerUpdateSocialLink(server);

  // Wellbeing domain
  registerSubmitWellbeingCheckin(server);
}
```

---

## Web UI to MCP Server Connection: The Express Gateway Pattern

**Recommendation: Do NOT make the React UI an MCP client.** Use a conventional Express REST API that shares domain services with the MCP server.

**Confidence: HIGH** -- This is the dominant pattern. MCP is designed for AI agent communication, not browser-to-server communication. Web UIs need REST conventions (HTTP verbs, status codes, pagination, auth headers).

### Why Not Direct MCP Client in Browser?

1. MCP Streamable HTTP is designed for AI tool-calling semantics, not CRUD operations
2. React needs standard HTTP patterns -- loading states, error codes, pagination cursors
3. Auth patterns differ -- MCP auth is OAuth 2.1 server-to-server; web UI needs cookie/JWT flows
4. MCP returns `content[]` arrays with text/image types -- web UI needs structured JSON

### The Gateway Pattern

Express serves dual roles in a single process:

```typescript
// express-app.ts
import express from "express";
import { mcpServer } from "./mcp-server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp";
import { contributorRoutes } from "./routes/contributors";
import { challengeRoutes } from "./routes/challenges";
import { circleRoutes } from "./routes/circles";
import { authRoutes } from "./routes/auth";
import { webhookRoutes } from "./routes/webhooks";
import { authMiddleware } from "./middleware/auth";

const app = express();

// --- Stripe webhook route (needs raw body, BEFORE json parser) ---
app.use("/webhooks/stripe", webhookRoutes);

// --- JSON parser for all other routes ---
app.use(express.json());

// --- REST API routes (for React web UI) ---
app.use("/api/auth", authRoutes);
app.use("/api/contributors", authMiddleware, contributorRoutes);
app.use("/api/challenges", authMiddleware, challengeRoutes);
app.use("/api/circles", authMiddleware, circleRoutes);
app.use("/api/wellbeing", authMiddleware, wellbeingRoutes);

// --- MCP endpoint (for VANTAGE / AI clients) ---
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
});

export { app };
```

### REST Route Example (thin wrapper over same service)

```typescript
// routes/contributors.ts
import { Router } from "express";
import { contributorService } from "../services/contributor.service";

const router = Router();

router.get("/:id/profile", async (req, res) => {
  const profile = await contributorService.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  res.json(profile);
});

router.patch("/:id/profile", async (req, res) => {
  const updated = await contributorService.updateProfile(req.params.id, req.body);
  res.json(updated);
});

export { router as contributorRoutes };
```

The MCP tool and the REST route call the SAME `contributorService.getProfile()`. Zero duplicated logic.

---

## Database Schema Organization

**Recommendation: Hybrid approach.** Normalize core relationships. Use JSONB for genuinely variable data (parsed CV profiles, payment config, preferences).

**Confidence: HIGH** -- Standard PostgreSQL best practice confirmed by AWS and PostgreSQL documentation.

### Schema Design Principles

1. **Normalize entities that participate in JOINs** -- contributors, challenges, circles
2. **Use JSONB for truly variable-shape data** -- parsed_profile (varies by CV), preferences, payment config
3. **Never store queryable fields in JSONB** -- if you filter/sort by it, it gets a column
4. **Use proper foreign keys** -- circle_id, contributor_id, challenge_id as real FK constraints
5. **Use UUIDs** -- v7 (time-sortable) for primary keys

### Recommended Schema (Drizzle ORM)

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, integer, varchar, pgEnum } from "drizzle-orm/pg-core";

export const contributorStatus = pgEnum("contributor_status", ["onboarding", "active", "paused", "inactive"]);

export const contributors = pgTable("contributors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  authProvider: varchar("auth_provider", { length: 20 }).notNull(), // "google", "linkedin", "email"
  authProviderId: varchar("auth_provider_id", { length: 255 }),
  passwordHash: text("password_hash"),                              // Only for email auth
  cvFileUrl: text("cv_file_url"),
  parsedProfile: jsonb("parsed_profile"),                           // Variable-shape CV data
  availability: varchar("availability", { length: 50 }),            // "full-time", "part-time", "adhoc"
  preferences: jsonb("preferences"),                                // Notification prefs, etc.
  stripeConnectId: varchar("stripe_connect_id", { length: 255 }),
  stripeOnboardingComplete: integer("stripe_onboarding_complete").default(0),
  status: contributorStatus("status").default("onboarding"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const challengeType = pgEnum("challenge_type", ["community", "premium", "knowledge_transition"]);
export const challengeStatus = pgEnum("challenge_status", ["draft", "open", "matching", "active", "completed", "cancelled"]);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  brief: text("brief").notNull(),
  domain: varchar("domain", { length: 100 }),
  skillsNeeded: text("skills_needed").array(),                      // Array column, not JSONB
  perspectivesNeeded: text("perspectives_needed").array(),
  type: challengeType("type").notNull(),
  payment: jsonb("payment"),                                         // { model, amount, split, currency }
  challengerName: varchar("challenger_name", { length: 255 }),
  challengerEmail: varchar("challenger_email", { length: 255 }),
  challengerOrg: varchar("challenger_org", { length: 255 }),
  deadline: timestamp("deadline"),
  status: challengeStatus("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const circleStatus = pgEnum("circle_status", ["forming", "active", "completed", "dissolved"]);

export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").references(() => challenges.id).notNull(),
  maxMembers: integer("max_members").default(5),
  socialChannel: jsonb("social_channel"),                             // { platform, url }
  status: circleStatus("status").default("forming"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for circle membership (NOT a JSON array)
export const circleMembers = pgTable("circle_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  role: varchar("role", { length: 50 }).default("member"),           // "member", "lead"
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const noteType = pgEnum("note_type", ["note", "file", "decision", "milestone"]);

export const circleNotes = pgTable("circle_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments"),                                  // [{ url, filename, type }]
  type: noteType("type").default("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resolutions = pgTable("resolutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").references(() => circles.id).notNull(),
  challengeId: uuid("challenge_id").references(() => challenges.id).notNull(),
  content: jsonb("content").notNull(),                                // { recommendations, summary, ... }
  feedback: jsonb("feedback"),                                        // { rating, comments }
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const wellbeingCheckins = pgTable("wellbeing_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  uclaLonelinessScore: integer("ucla_loneliness_score"),
  wemwbsScore: integer("wemwbs_score"),
  freetextNote: text("freetext_note"),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Track challenge interest expressions
export const challengeInterests = pgTable("challenge_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").references(() => challenges.id).notNull(),
  contributorId: uuid("contributor_id").references(() => contributors.id).notNull(),
  message: text("message"),
  status: varchar("status", { length: 20 }).default("pending"),      // "pending", "accepted", "declined"
  createdAt: timestamp("created_at").defaultNow(),
});

// Stripe webhook event log (idempotency)
export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id", { length: 255 }).primaryKey(),                   // Stripe event ID
  type: varchar("type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
});
```

### Key Schema Decisions

| Decision | Rationale |
|----------|-----------|
| `circle_members` junction table instead of JSON array | Enables JOINs, COUNT queries, membership constraints |
| `challenge_interests` separate table | Track interest status per contributor, not buried in JSON |
| `stripe_events` table | Webhook idempotency -- check if event already processed |
| `skills_needed` as text array, not JSONB | PostgreSQL array supports `@>` containment queries |
| `parsed_profile` as JSONB | Genuinely variable shape depending on CV content |
| `payment` as JSONB | Variable structure per challenge type (retainer vs stipend vs free) |
| pgEnums for status fields | Database-enforced valid states, better than varchar |

---

## Stripe Connect Integration Architecture

**Recommendation: Use Express connected accounts with Stripe-hosted onboarding.** This minimizes compliance burden while giving contributors a clean onboarding experience.

**Confidence: MEDIUM** -- Based on Stripe documentation patterns. Specific API versions and features should be verified at implementation time.

### Account Type: Express

Express accounts let Stripe handle identity verification, compliance, and the onboarding UI. Your platform controls the payment flow. Contributors see a lightweight Stripe Express Dashboard for payouts.

### Payment Architecture

```
Challenge Payment Flow:
1. Challenger submits challenge with payment (or platform creates on behalf)
2. Platform creates Stripe PaymentIntent with destination charge
3. PaymentIntent specifies:
   - amount: full challenge fee
   - application_fee_amount: 25% platform cut
   - transfer_data.destination: contributor's connected account
4. On success, webhook updates challenge/circle status

Knowledge Transition Retainer Flow:
1. Platform creates Stripe Subscription for challenger
2. Monthly invoice auto-charges
3. Each invoice payment triggers transfer to contributor (75%)
4. Platform retains 25% as application fee
```

### Critical Webhooks to Handle

| Webhook Event | Action |
|---------------|--------|
| `account.updated` | Check if onboarding complete, update contributor record |
| `payment_intent.succeeded` | Mark challenge as funded, trigger circle formation |
| `payment_intent.payment_failed` | Notify challenger, pause challenge |
| `invoice.paid` | Process KT retainer payment, transfer to contributor |
| `payout.failed` | Alert contributor about bank account issue |

### Webhook Handler Pattern

```typescript
// routes/webhooks.ts -- must use raw body parser
import { Router } from "express";
import express from "express";
import Stripe from "stripe";
import { paymentService } from "../services/payment.service";
import { db } from "../db";
import { stripeEvents } from "../db/schema";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post("/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      return res.status(400).send("Webhook signature verification failed");
    }

    // Idempotency check
    const existing = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id));
    if (existing.length > 0) return res.json({ received: true });

    // Process event
    switch (event.type) {
      case "account.updated":
        await paymentService.handleAccountUpdate(event.data.object);
        break;
      case "payment_intent.succeeded":
        await paymentService.handlePaymentSuccess(event.data.object);
        break;
      // ... other handlers
    }

    // Record processed event
    await db.insert(stripeEvents).values({ id: event.id, type: event.type });
    res.json({ received: true });
  }
);

export { router as webhookRoutes };
```

---

## Auth Flow Architecture

**Recommendation: OAuth (Google + LinkedIn) + email/password, with JWT tokens stored in httpOnly cookies.**

**Confidence: HIGH** -- Standard pattern for web apps with OAuth providers.

### Flow

```
OAuth Flow:
  React UI -> "Sign in with Google/LinkedIn" button
  -> Redirect to provider's OAuth consent screen
  -> Provider redirects back to /api/auth/callback/:provider
  -> Express verifies OAuth token, creates/finds contributor
  -> Issues JWT, sets httpOnly cookie
  -> Redirects to React app

Email/Password Flow:
  React UI -> POST /api/auth/register { email, password, name }
  -> Express hashes password (bcrypt), creates contributor
  -> Issues JWT, sets httpOnly cookie
  -> Returns contributor profile

MCP Auth (Future - VANTAGE):
  VANTAGE -> MCP Streamable HTTP with Bearer token
  -> Express middleware validates token
  -> MCP server processes tool calls with authenticated context
```

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| httpOnly cookies over localStorage | XSS protection -- JS cannot read the token |
| JWT (not sessions) | Stateless, works with MCP auth later |
| Short-lived access token + refresh token | 15min access, 7-day refresh, limits damage from token leak |
| Passport.js for OAuth | Battle-tested, Kirk's stack is Node/Express |
| bcrypt for passwords | Industry standard, auto-salting |

---

## CV Upload Pipeline

**Confidence: MEDIUM** -- The parsing approach (pdf-parse + LLM extraction) needs validation at implementation time. CV parsing quality varies wildly.

### Pipeline Steps

```
1. User selects CV file (PDF, DOCX)
2. React UI uploads via multipart POST to /api/contributors/:id/cv
3. Express middleware validates file type and size (max 10MB)
4. Domain service uploads raw file to S3/R2, stores URL in contributor record
5. Domain service extracts text:
   - PDF: pdf-parse library
   - DOCX: mammoth library
6. Domain service sends extracted text to LLM for structured extraction:
   - Professional summary
   - Skills array
   - Work history array
   - Education array
   - Certifications array
   - Industries array
7. Structured profile stored as JSONB in contributors.parsed_profile
8. Contributor reviews and edits parsed fields via web UI
```

### S3/R2 Configuration

Use Cloudflare R2 over AWS S3 because: no egress fees, S3-compatible API, simpler pricing. Use presigned URLs if you need direct browser uploads later, but for MVP a simple server-side upload is fine.

---

## Monorepo Folder Structure

**Recommendation: pnpm workspaces with a simple packages/ layout. No Turborepo initially -- overkill for 2 packages.**

**Confidence: HIGH** -- Based on established pnpm workspace patterns and Kirk's existing experience with Node/React projects.

```
indomitable-unity/
  package.json                    # Root -- workspace config, shared scripts
  pnpm-workspace.yaml             # Declares workspace packages
  tsconfig.base.json              # Shared TypeScript config
  .env.example                    # Environment variables template
  .gitignore
  BUILD_OVERVIEW.md
  .planning/                      # GSD planning files

  packages/
    server/                        # MCP server + Express API (single deployable)
      package.json
      tsconfig.json
      src/
        index.ts                   # Entry point -- starts Express
        express-app.ts             # Express app setup
        mcp-server.ts              # McpServer instance
        middleware/
          auth.ts                  # JWT verification, OAuth callbacks
          error-handler.ts         # Global error handling
          rate-limiter.ts          # Rate limiting
        routes/
          auth.ts                  # /api/auth/*
          contributors.ts          # /api/contributors/*
          challenges.ts            # /api/challenges/*
          circles.ts               # /api/circles/*
          wellbeing.ts             # /api/wellbeing/*
          webhooks.ts              # /webhooks/stripe
          uploads.ts               # /api/uploads/*
        tools/                     # MCP tool definitions (14 tools, 4 domains)
          contributors/
          challenges/
          circles/
          wellbeing/
          index.ts
        services/                  # Domain services (shared by routes + tools)
          contributor.service.ts
          challenge.service.ts
          circle.service.ts
          wellbeing.service.ts
          matching.service.ts
          payment.service.ts
          storage.service.ts
          cv-parser.service.ts
          auth.service.ts
          email.service.ts
        db/
          schema.ts                # Drizzle schema
          migrations/
          index.ts                 # Connection pool
        types/                     # Shared TypeScript types
          contributor.ts
          challenge.ts
          circle.ts

    web/                           # React/Vite web UI
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx
        App.tsx
        api/                       # API client functions
          client.ts                # Axios/fetch wrapper with auth
          contributors.ts
          challenges.ts
          circles.ts
        pages/
          Login.tsx
          Onboarding.tsx           # CV upload + profile review
          Dashboard.tsx            # Contributor home
          ChallengeBoard.tsx       # Browse challenges
          ChallengeDetail.tsx
          CircleWorkspace.tsx      # Notes, members, resolution
          WellbeingCheckin.tsx
          Profile.tsx
        components/
          Layout.tsx
          Navbar.tsx
          ChallengeCard.tsx
          CircleMemberList.tsx
          CVUploader.tsx
          WellbeingForm.tsx
        hooks/
          useAuth.ts
          useContributor.ts
        lib/
          auth.ts                  # Auth state management
        styles/
          globals.css              # Tailwind base

    shared/                        # Shared types between server and web
      package.json
      src/
        types.ts                   # Contributor, Challenge, Circle interfaces
        constants.ts               # Status enums, domain constants
        validation.ts              # Shared Zod schemas
```

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

### Why This Structure

| Decision | Rationale |
|----------|-----------|
| Single `server` package (Express + MCP) | One deployable process, shared domain services, simpler deployment |
| `shared` package for types | Web and server both import from `@indomitable-unity/shared` -- type safety across the stack |
| No Turborepo | Only 2 packages. Add it later if build times become a problem |
| Services separate from routes/tools | This is the core principle -- domain logic is interface-agnostic |

---

## VANTAGE Integration Path (Future)

**Confidence: MEDIUM** -- The MCP Streamable HTTP pattern is well-documented, but VANTAGE's specific client implementation will determine exact integration details.

### How VANTAGE Connects

VANTAGE is an MCP client. It connects to the same Express server via the `/mcp` Streamable HTTP endpoint. It authenticates via Bearer token (JWT or API key). It calls the same 14 tools that the web UI accesses through REST routes.

```
VANTAGE MCP Client
  -> POST /mcp (Streamable HTTP)
  -> Auth middleware validates Bearer token
  -> MCP server routes tool call to handler
  -> Handler calls domain service
  -> Response returned via MCP protocol
```

### What Changes When VANTAGE Arrives

1. **Nothing in domain services** -- they already work
2. **MCP auth middleware** -- add Bearer token validation on `/mcp` endpoint
3. **MCP session management** -- handle multiple concurrent VANTAGE sessions
4. **Tool descriptions get richer** -- better descriptions help VANTAGE choose the right tool
5. **Web UI becomes optional** -- VANTAGE is the primary interface, web UI becomes admin/fallback

### Preparing for VANTAGE Now

- Write thorough tool descriptions (these become VANTAGE's understanding of what each tool does)
- Return structured data from domain services (not HTML or formatted strings)
- Keep tool granularity at the right level (14 tools, not 50 micro-operations)
- Use consistent error patterns so VANTAGE can handle failures gracefully

---

## Patterns to Follow

### Pattern 1: Domain Service as Single Source of Truth
**What:** All business logic lives in service files. Routes and MCP tools are thin wrappers.
**When:** Always. Every database query, validation rule, and side effect goes through a service.
**Example:**
```typescript
// services/challenge.service.ts
export const challengeService = {
  async listChallenges(filters: ChallengeFilters) {
    // Business logic: filtering, sorting, pagination
    // Database query via Drizzle
    // Returns typed result
  },

  async expressInterest(challengeId: string, contributorId: string, message?: string) {
    // Validate contributor can express interest
    // Check challenge status is "open"
    // Check contributor hasn't already expressed interest
    // Insert into challenge_interests
    // Trigger notification to challenge owner
  },
};
```

### Pattern 2: Error Boundaries at the Interface Layer
**What:** Domain services throw typed errors. Routes catch and convert to HTTP status codes. MCP tools catch and convert to MCP error responses.
**When:** Always.
**Example:**
```typescript
// services/errors.ts
export class NotFoundError extends Error { statusCode = 404; }
export class ForbiddenError extends Error { statusCode = 403; }
export class ValidationError extends Error { statusCode = 400; }

// In Express route:
try {
  const result = await challengeService.expressInterest(id, userId);
  res.json(result);
} catch (err) {
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  // ...
}

// In MCP tool:
try {
  const result = await challengeService.expressInterest(id, userId);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (err) {
  return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
}
```

### Pattern 3: Dependency Injection via Factory Functions
**What:** Services accept their dependencies (db, stripe, s3) as constructor/factory params.
**When:** For testability and flexibility.
**Example:**
```typescript
export function createContributorService(db: Database, storage: StorageService) {
  return {
    async getProfile(id: string) { /* uses db and storage */ },
  };
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicating Logic in Route and Tool Handlers
**What:** Writing database queries directly in Express routes AND in MCP tool handlers.
**Why bad:** Two places to maintain. They drift apart. Bugs get fixed in one but not the other.
**Instead:** Both call the same domain service function.

### Anti-Pattern 2: Storing Circle Members as JSON Array
**What:** `members: jsonb("members")` containing `["uuid1", "uuid2"]`.
**Why bad:** Cannot JOIN, cannot enforce foreign keys, cannot query "which circles is contributor X in?" efficiently.
**Instead:** Use the `circle_members` junction table.

### Anti-Pattern 3: Building a Custom MCP Transport
**What:** Writing your own HTTP handler for MCP protocol messages.
**Why bad:** The protocol is complex (JSON-RPC, session management, SSE). Bugs are subtle.
**Instead:** Use `@modelcontextprotocol/express` middleware and `StreamableHTTPServerTransport` from the official SDK.

### Anti-Pattern 4: Making the Web UI an MCP Client
**What:** Having React use an MCP client library to call tools directly.
**Why bad:** MCP semantics don't map to web UI needs (pagination, HTTP caching, error codes, form validation).
**Instead:** Standard REST API for the web UI. MCP endpoint for AI clients only.

---

## Scalability Considerations

| Concern | At 100 users (Pilot) | At 10K users | At 1M users |
|---------|---------------------|--------------|-------------|
| Database | Single managed PostgreSQL instance | Read replicas, connection pooling (PgBouncer) | Sharding by region |
| File storage | S3/R2 direct uploads | Presigned URLs for direct browser-to-S3 upload | CDN for CV downloads |
| Payments | Single Stripe account | Same -- Stripe scales automatically | Same |
| MCP connections | Single VANTAGE instance | Multiple VANTAGE instances with session management | Load balancer + horizontal scaling |
| Search/matching | PostgreSQL full-text search | pg_trgm + GIN indexes | Dedicated search service (Typesense) |
| Server | Single Railway/Vercel instance | Horizontal scaling behind load balancer | Kubernetes or serverless |

For the pilot (50-100 contributors), a single Railway instance with managed PostgreSQL handles everything comfortably. Do not over-engineer.

---

## Suggested Build Order (Based on Dependencies)

```
Phase 1: Foundation (no dependencies)
  1. Monorepo setup (pnpm workspace, tsconfig, packages)
  2. Database schema + Drizzle ORM setup + migrations
  3. Express app skeleton with error handling
  4. Auth flow (OAuth + email/password + JWT)
  5. Basic React app with auth pages

Phase 2: Core Domain (depends on Phase 1)
  6. Contributor service + CV upload pipeline
  7. Challenge service + challenge board
  8. MCP server skeleton + first tools registered
  9. Matching service (simple scoring)
  10. Circle formation + workspace

Phase 3: Money (depends on Phases 1-2)
  11. Stripe Connect account creation + onboarding
  12. Payment flows (destination charges, subscriptions)
  13. Webhook handler + idempotency

Phase 4: Polish (depends on Phases 1-3)
  14. Wellbeing check-in flow
  15. Impact tracking / dashboard
  16. Notifications (email via SendGrid/Postmark)
  17. PWA configuration

Phase 5: VANTAGE (depends on Phase 2 MCP server)
  18. MCP auth for AI clients
  19. Connect VANTAGE as MCP client
  20. Test all 14 tools via VANTAGE
```

The critical dependency chain: Database schema -> Domain services -> REST routes AND MCP tools (parallel) -> Stripe integration -> VANTAGE connection.

---

## Sources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- Official SDK, Express middleware, Streamable HTTP transport (HIGH confidence)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) -- Protocol spec (HIGH confidence)
- [MCP Build Server Guide](https://modelcontextprotocol.io/docs/develop/build-server) -- Official tool definition patterns (HIGH confidence)
- [Anthropic MCP Builder Skills](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/node_mcp_server.md) -- Node.js MCP reference implementation (HIGH confidence)
- [Stripe Connect Documentation](https://docs.stripe.com/connect) -- Express accounts, marketplace patterns (HIGH confidence)
- [Stripe End-to-End Marketplace Guide](https://docs.stripe.com/connect/end-to-end-marketplace) -- Payment flows, onboarding (HIGH confidence)
- [Stripe Webhook Setup](https://docs.stripe.com/webhooks/quickstart?lang=node) -- Node.js webhook patterns (HIGH confidence)
- [PostgreSQL JSONB Best Practices (AWS)](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/) -- Hybrid schema approach (HIGH confidence)
- [MCP Streamable HTTP Starter](https://github.com/ferrants/mcp-streamable-http-typescript-server) -- Reference implementation (MEDIUM confidence)
- [MCP Transport Future Blog](http://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/) -- Transport evolution (MEDIUM confidence)
- [pnpm Workspaces Guide](https://jsdev.space/complete-monorepo-guide/) -- Monorepo setup patterns (MEDIUM confidence)

# Technology Stack

**Project:** Age No Concern
**Researched:** 2026-03-10
**Stack Philosophy:** Match iLearn LSS patterns (React/Vite + Tailwind + Node/Express + PostgreSQL) for consistency across Kirk's projects. Prefer lightweight, well-typed libraries over heavy frameworks.

---

## Recommended Stack

### MCP Server (Backend Core)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @modelcontextprotocol/sdk | ^1.27.x | MCP server framework | Official TypeScript SDK. Provides McpServer class, tool/resource/prompt registration, stdio + Streamable HTTP transports. Required for VANTAGE AI agent integration later. | HIGH |
| Express | ^4.21.x | HTTP server for web UI API routes | MCP SDK handles tool calls; Express handles REST API for the web UI (auth endpoints, file uploads, webhooks). Kirk already uses Express in iLearn LSS. | HIGH |
| zod | ^3.24.x (Zod 4 for MCP) | Schema validation | Required peer dependency of MCP SDK. Use for all input validation across both MCP tools and REST endpoints. Single validation library everywhere. | HIGH |
| TypeScript | ^5.7.x | Type safety | Required by MCP SDK (target ES2022, module Node16). Catches bugs at compile time. | HIGH |
| Node.js | ^22.x LTS | Runtime | LTS with built-in type stripping (v22.18+) for dev-time convenience. Required by MCP SDK. | HIGH |

**MCP Server Architecture Note:** The MCP server exposes 14 tools across 4 domains. Express runs alongside for the web UI REST API. Both share the same database connection pool and service layer. The MCP server uses stdio transport for local Claude Desktop / VANTAGE integration, and Streamable HTTP for remote access.

### Frontend (Web UI)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^19.x | UI framework | Kirk already uses React. v19 is stable with improved performance. Consistent with iLearn LSS. | HIGH |
| Vite | ^6.x | Build tool + dev server | Fast HMR, native ESM. Kirk already uses Vite. v6 is current stable. | HIGH |
| Tailwind CSS | ^4.x | Styling | Utility-first CSS. Kirk already uses Tailwind. v4 shipped with new engine, CSS-first config. Consistent with iLearn LSS. | MEDIUM |
| React Router | ^7.x | Client-side routing | Standard React routing. v7 is the current major version (evolved from Remix merger). | MEDIUM |
| TanStack Query | ^5.x | Server state management | Handles caching, refetching, loading/error states for API calls. Better than raw useEffect + fetch. | HIGH |
| vite-plugin-pwa | ^1.1.x | PWA support | Zero-config PWA plugin for Vite. Handles service worker generation via Workbox, web app manifest, offline caching. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16.x | Primary database | Kirk already runs PostgreSQL for iLearn LSS. Mature, reliable, excellent JSON support for flexible CV data. | HIGH |
| Drizzle ORM | ^0.45.x | Database ORM | SQL-like syntax gives full control over queries. Tiny bundle (~7.4kb). TypeScript-first schema definitions. No binary engine (unlike Prisma). Generates clean, predictable SQL. | HIGH |
| drizzle-kit | latest | Migrations CLI | Generates SQL migration files from schema changes. `drizzle-kit push` for dev, `drizzle-kit generate` + `drizzle-kit migrate` for production. | HIGH |
| postgres (porsager) | ^3.4.x | PostgreSQL driver | Lightweight, pure JS PostgreSQL client. Pairs with Drizzle. No native bindings to compile on Windows. | MEDIUM |

**Why Drizzle over Prisma:**
- No Rust binary engine = simpler deployment, no cold-start overhead
- SQL-like API means you write what you mean (no Prisma query language translation)
- 85% smaller bundle than Prisma 7
- Kirk's project is a marketplace with specific query patterns (contributor search, skills matching, availability filtering) -- Drizzle lets you write exactly the SQL you need
- Prisma 7 closed the performance gap significantly, but Drizzle's simplicity wins for a project of this scale

**Why not raw SQL:**
- Drizzle provides type-safe queries with zero overhead -- you get the safety of an ORM with the transparency of SQL
- Migration management via drizzle-kit is essential for a production app

### Payments (Stripe Connect)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| stripe | ^17.x | Stripe Node.js SDK | Official SDK. Handles Connect account creation, payment intents, application fees, webhooks. | HIGH |

**Stripe Connect Architecture:**

- **Account type:** Express accounts. Stripe handles KYC/identity verification and provides a lightweight dashboard for contributors to see their payouts. Minimal integration effort.
- **Charge model:** Destination charges with application fee. Client pays full amount, Stripe routes 75% to contributor's Express account, platform retains 25% as application fee.
- **Onboarding:** Use Stripe-hosted onboarding (Account Links API). Generates a URL, redirect contributor there, Stripe collects bank details and identity docs. No custom forms needed.
- **Accounts v2 API:** Stripe released Accounts v2 in late 2025. Use it for new integrations -- it shares KYC across connected account and customer identities, improving onboarding conversion. However, Express accounts with v1 API is battle-tested and simpler for MVP. **Recommendation: Start with Express + v1 for MVP, migrate to v2 when scaling.**
- **UK considerations:** Stripe Connect is fully supported in the UK. Contributors will need UK bank accounts. GBP as primary currency.

**Implementation pattern:**
```typescript
// Create Express connected account
const account = await stripe.accounts.create({ type: 'express', country: 'GB' });

// Generate onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://app.agenoconcern.org/onboarding/refresh',
  return_url: 'https://app.agenoconcern.org/onboarding/complete',
  type: 'account_onboarding',
});

// Destination charge with 25% platform fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // GBP100.00 in pence
  currency: 'gbp',
  application_fee_amount: 2500, // 25% platform fee
  transfer_data: { destination: contributorStripeAccountId },
});
```

### File Storage (S3)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @aws-sdk/client-s3 | ^3.x | S3 operations | Official AWS SDK v3. Modular (only import what you need). Tree-shakeable. | HIGH |
| @aws-sdk/s3-request-presigner | ^3.x | Presigned URLs | Generate time-limited upload/download URLs. Client uploads directly to S3, bypassing your server for large files. | HIGH |

**Storage strategy:**
- CVs uploaded via presigned PUT URL (expires in 15 minutes)
- Server generates presigned GET URLs for download (expires in 1 hour)
- Bucket policy: private, no public access
- Store S3 key in database, never the full URL
- **S3-compatible alternative:** If not using AWS, MinIO or Cloudflare R2 are drop-in replacements using the same SDK. R2 has zero egress fees.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| arctic | ^3.7.x | OAuth 2.0 clients | Lightweight, fully-typed OAuth client for Google + LinkedIn. No middleware bloat. Built on Fetch API. Runtime-agnostic. | MEDIUM |
| argon2 | ^0.41.x | Password hashing | Modern, memory-hard hashing (Argon2id). OWASP recommended over bcrypt for new projects. Resists GPU/ASIC attacks. | HIGH |
| jose | ^6.x | JWT creation/verification | Lightweight JWT library. No deprecated dependencies (unlike jsonwebtoken). Web Crypto API based. | MEDIUM |

**Why Arctic over Passport.js:**
- Passport.js is middleware-heavy with session assumptions baked in
- Arctic is just OAuth clients -- you control the flow
- Fully typed, no `@types/` packages needed
- 50+ providers supported including Google and LinkedIn
- Much smaller dependency tree
- Kirk's app needs OAuth for social login + email/password -- Arctic handles the OAuth part, you handle email/password yourself with argon2 + jose

**Why not Passport.js:**
- Passport's strategy pattern adds complexity for only 2 OAuth providers
- Session middleware assumptions conflict with JWT-based auth
- Poorly maintained -- sparse updates, unresolved issues

**Auth flow:**
1. **Email/password:** Register with email + password (hashed with Argon2id). Login returns JWT (access + refresh token pair).
2. **Google OAuth:** Arctic handles authorization URL + code validation. Create/link user account, return JWT.
3. **LinkedIn OAuth:** Same pattern as Google via Arctic.
4. **JWT storage:** httpOnly cookies for web UI. Bearer token for MCP/API access.

### CV Parsing (KEY RESEARCH AREA)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pdf-parse | ^2.4.x | PDF text extraction | Pure JS, zero native dependencies. Extracts raw text from PDF files. Handles most CV PDF formats reliably. | HIGH |
| mammoth | ^1.8.x | DOCX text extraction | Converts .docx to HTML or raw text. Well-maintained, pure JS. `mammoth.extractRawText()` for CV text. | HIGH |
| Anthropic SDK / OpenAI SDK | latest | LLM-assisted structured extraction | Send extracted text to Claude/GPT with a JSON schema prompt. LLM interprets unstructured CV text into structured fields. | HIGH |
| zod | (shared) | Output validation | Validate LLM JSON output against a Zod schema. Never trust raw LLM output. | HIGH |

**CV Parsing Strategy -- Two-Stage Pipeline:**

This is the critical insight from research: **Do NOT use dedicated resume-parsing npm packages.** The open-source Node.js resume parsers (resume-parser, simple-resume-parser, easy-resume-parser) are all pattern/regex-based, poorly maintained (last updates 1-3 years ago), and produce unreliable results on varied CV formats. They cannot handle the diversity of real-world CVs from 50-75 year old professionals who may use unconventional formats.

**Instead, use a two-stage approach:**

**Stage 1: Text Extraction (deterministic)**
```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}
```

**Stage 2: LLM Structured Extraction (intelligent)**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const CVSchema = z.object({
  fullName: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.object({
    name: z.string(),
    category: z.string().optional(),
    yearsExperience: z.number().optional(),
  })),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    description: z.string().optional(),
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string().optional(),
    year: z.string().optional(),
  })),
  certifications: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
});

type ParsedCV = z.infer<typeof CVSchema>;

async function parseCV(rawText: string): Promise<ParsedCV> {
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Extract structured data from this CV/resume text. Return ONLY valid JSON matching this schema. Focus on identifying skills, industries, and years of experience accurately.

CV TEXT:
${rawText}

Return JSON with these fields: fullName, email, phone, location, summary, skills (array of {name, category, yearsExperience}), experience (array of {title, company, startDate, endDate, description}), education (array of {institution, degree, year}), certifications (array of strings), industries (array of strings).`
    }],
  });

  const jsonStr = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(jsonStr);
  return CVSchema.parse(parsed); // Validate with Zod
}
```

**Why this approach:**
- pdf-parse and mammoth are reliable, well-maintained text extractors
- LLMs handle the messy, varied formats of real CVs far better than regex patterns
- Zod validation catches malformed LLM output before it enters the database
- Cost per parse: ~$0.003-0.01 with Claude Sonnet (acceptable for 50-100 pilot users)
- Can swap LLM provider without changing extraction logic
- Claude's structured output / tool use can enforce JSON schema compliance

**Cost consideration for scale:**
At 50-100 pilot contributors, LLM parsing cost is negligible (~$0.50-1.00 total). At 10,000+ contributors, consider caching parsed results and only re-parsing on CV update. Or use Claude Haiku for cheaper extraction on straightforward CVs.

### PWA Configuration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| vite-plugin-pwa | ^1.1.x | PWA setup | Zero-config PWA for Vite. Generates service worker via Workbox, handles manifest, precaching. registerType: 'autoUpdate' for seamless updates. | HIGH |
| web-push | ^3.6.x | Push notifications | Node.js library for sending Web Push notifications. VAPID key support. | MEDIUM |
| workbox (via plugin) | ^7.x | Service worker strategies | Bundled with vite-plugin-pwa. Handles caching strategies (stale-while-revalidate for API, cache-first for static assets). | HIGH |

**PWA configuration approach:**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Age No Concern',
        short_name: 'ANC',
        description: 'Deploying experienced professionals into advisory work',
        theme_color: '#1e3a5f',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.agenoconcern\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
});
```

**Push notifications:** Use `injectManifest` strategy if custom push notification handling is needed. For MVP, `generateSW` (default) with basic notification support is sufficient.

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| resend | ^6.9.x | Transactional email | Modern API, best DX, React Email integration for templates. 3,000 emails/month free tier covers MVP pilot. $20/month for 50K emails when scaling. | HIGH |

**Why Resend over SendGrid/Postmark:**
- **Over SendGrid:** SendGrid removed their permanent free tier. Twilio acquisition degraded DX. Resend's API is cleaner and more modern.
- **Over Postmark:** Postmark has better deliverability at scale, but costs $15/month from day one. Resend's free tier (3,000 emails/month) is perfect for a 50-100 user pilot. Postmark is the upgrade path if deliverability becomes critical.
- **React Email integration:** Resend is built by the React Email team. Write email templates as React components -- consistent with the React frontend. No wrestling with table-based HTML.

**Email types for Age No Concern:**
- Welcome / account verification
- Engagement match notifications (contributor matched with opportunity)
- Payment confirmations (Stripe webhook triggered)
- Password reset
- Weekly digest (deferred, not MVP)

### Dev Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tsx | ^4.x | TypeScript execution | Run .ts files directly in development. Faster than ts-node. Uses esbuild. | HIGH |
| vitest | ^3.x | Testing | Vite-native test runner. Same config as Vite. Fast, compatible with Jest API. | HIGH |
| eslint | ^9.x | Linting | Flat config format (eslint.config.js). TypeScript support via typescript-eslint. | MEDIUM |
| prettier | ^3.x | Formatting | Consistent code formatting. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle | Prisma | Binary engine, larger bundle, query language abstraction unnecessary for this project |
| ORM | Drizzle | TypeORM | Decorator-heavy, weaker TypeScript inference, less active development |
| ORM | Drizzle | Raw SQL (pg) | No type safety, no migration management, error-prone for team/maintenance |
| Auth | Arctic + custom | Passport.js | Middleware bloat, session assumptions, poorly maintained for only 2 OAuth providers |
| Auth | Arctic + custom | Auth0/Clerk | Third-party dependency for auth = vendor lock-in, recurring cost, overkill for MVP |
| Auth | Arctic + custom | NextAuth/Auth.js | Designed for Next.js, not Express. Wrong framework. |
| Email | Resend | SendGrid | No free tier anymore, degraded DX post-Twilio acquisition |
| Email | Resend | Postmark | No free tier ($15/mo minimum), overkill for 50-100 user pilot |
| Email | Resend | Nodemailer + SMTP | Self-managed deliverability, IP warming, spam filtering -- not worth it |
| CV Parsing | pdf-parse + LLM | resume-parser (npm) | Pattern-based, poorly maintained, unreliable on varied CV formats |
| CV Parsing | pdf-parse + LLM | Affinda/Sovren API | Expensive SaaS, vendor lock-in, LLM approach is cheaper and more flexible |
| Frontend | React/Vite | Next.js | SSR unnecessary for this app, adds complexity, Kirk already uses Vite |
| Frontend | React/Vite | Remix | Overcomplicated for a basic web UI that will be overlaid by VANTAGE later |
| Password Hash | Argon2 | bcrypt | Argon2id is OWASP recommended for new projects, better GPU/ASIC resistance |
| JWT | jose | jsonwebtoken | jsonwebtoken has deprecated dependencies, jose uses Web Crypto API |
| Storage | AWS S3 SDK v3 | Multer + local | Not scalable, no CDN, no presigned URLs for direct upload |

---

## Installation

```bash
# Create project
mkdir agenoconcern && cd agenoconcern
npm init -y

# Core backend
npm install @modelcontextprotocol/sdk zod express cors
npm install drizzle-orm postgres
npm install stripe
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install arctic argon2 jose
npm install pdf-parse mammoth
npm install @anthropic-ai/sdk
npm install resend
npm install web-push

# Core frontend (in client/ directory)
npm install react react-dom react-router
npm install @tanstack/react-query

# Dev dependencies
npm install -D typescript @types/node @types/express @types/cors
npm install -D drizzle-kit
npm install -D tsx vitest
npm install -D vite @vitejs/plugin-react vite-plugin-pwa
npm install -D tailwindcss @tailwindcss/vite
npm install -D eslint prettier
```

---

## Version Verification Notes

| Package | Version Claimed | Verification Source | Confidence |
|---------|----------------|--------------------|----|
| @modelcontextprotocol/sdk | ^1.27.x | npm search results (1.27.1 published ~13 days ago as of search) | HIGH |
| drizzle-orm | ^0.45.x | npm (0.45.1 published ~3 months ago as of search) | HIGH |
| arctic | ^3.7.x | npm (3.7.0 published ~9 months ago as of search) | HIGH |
| resend | ^6.9.x | npm (6.9.3 published ~9 days ago as of search) | HIGH |
| pdf-parse | ^2.4.x | npm (2.4.5 published ~5 months ago as of search) | HIGH |
| vite-plugin-pwa | ^1.1.x | npm (1.1.0) | HIGH |
| stripe | ^17.x | Training data (verify at install time) | MEDIUM |
| Tailwind CSS | ^4.x | Training data - v4 released, verify exact version | MEDIUM |
| React | ^19.x | Training data - v19 stable, verify exact version | MEDIUM |

---

## Sources

- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK repository
- [MCP SDK - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Package registry (v1.27.1)
- [Drizzle ORM - PostgreSQL getting started](https://orm.drizzle.team/docs/get-started-postgresql) - Official docs
- [Drizzle ORM - npm](https://www.npmjs.com/package/drizzle-orm) - Package registry (v0.45.1)
- [Drizzle vs Prisma 2026 comparison - Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/) - Detailed comparison
- [Drizzle vs Prisma 2026 - MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) - Performance benchmarks
- [Arctic v3 documentation](https://arcticjs.dev/) - Official docs, Google + LinkedIn providers
- [Arctic - npm](https://www.npmjs.com/package/arctic) - Package registry (v3.7.0)
- [Stripe Connect documentation](https://docs.stripe.com/connect) - Official Connect docs
- [Stripe Connect account types](https://docs.stripe.com/connect/accounts) - Express vs Custom vs Standard
- [Stripe Connect Accounts v2](https://docs.stripe.com/connect/accounts-v2) - New API (Dec 2025)
- [AWS S3 presigned URLs - AWS Blog](https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/) - Official SDK v3 guide
- [pdf-parse - npm](https://www.npmjs.com/package/pdf-parse) - Package registry (v2.4.5)
- [mammoth.js - GitHub](https://github.com/mwilliamson/mammoth.js) - DOCX extraction
- [LLM structured extraction for resumes - Datumo](https://www.datumo.io/blog/parsing-resumes-with-llms-a-guide-to-structuring-cvs-for-hr-automation) - LLM CV parsing guide
- [Extracting structured JSON from LLMs - Collabnix](https://collabnix.com/extracting-structured-json-from-large-language-models-a-deep-dive-into-openai-claude-and-gemini/) - Claude structured output
- [vite-plugin-pwa - Getting Started](https://vite-pwa-org.netlify.app/guide/) - Official docs
- [Resend - npm](https://www.npmjs.com/package/resend) - Package registry (v6.9.3)
- [Resend pricing](https://resend.com/pricing) - Free tier details
- [SendGrid vs Postmark vs Resend comparison](https://www.buildmvpfast.com/api-costs/email) - Email API pricing comparison
- [Password hashing guide 2025 - Argon2 vs bcrypt](https://guptadeepak.com/the-complete-guide-to-password-hashing-argon2-vs-bcrypt-vs-scrypt-vs-pbkdf2-2026/) - OWASP recommendations

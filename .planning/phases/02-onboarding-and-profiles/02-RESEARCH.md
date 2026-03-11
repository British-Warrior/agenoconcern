# Phase 2: Onboarding and Profiles - Research

**Researched:** 2026-03-11
**Domain:** CV upload, OCR, LLM parsing, profile data model, Stripe Connect
**Confidence:** HIGH (stack verified against official docs and Context7; patterns cross-referenced)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CV Upload Experience**
- Accept PDF, DOCX, TXT files **plus** JPG/PNG images of paper CVs (OCR path)
- OCR extracts text from photo/scan before LLM parsing — covers contributors without electronic copies
- LLM makes best-guess for all fields — no flagging of uncertain fields, user corrects during review
- Upload UI: drag-and-drop + file picker (Claude's discretion on exact approach)

**Profile Review Flow**
- Parsed profile includes core fields (name, roles/titles, skills, qualifications, sectors, years of experience) **plus auto-generated professional summary**
- Layout and flow structure: Claude's discretion (cards vs form, single page vs wizard)
- After confirmation: **affirming tone with personalised messaging** based on parsed CV data — the LLM highlights what makes their experience valuable (e.g., "30 years of engineering leadership — that's exactly what communities need")
- This is the first "you're in" moment — treat it as a self-affirmation opportunity

**Availability & Preferences**
- Timing of collection: Claude's discretion (during onboarding flow or post-confirmation)
- **Max Circles: self-set with sensible default (e.g., 3), contributor can change anytime, platform enforces their stated limit** — protective, not paternalistic
- Domain preferences: **fixed taxonomy with free-text "Other" option** — validates specialised expertise and provides data for taxonomy expansion
- Communication preferences: **channel (email/phone) + frequency (immediate, daily, weekly)**
- Mentoring willingness: captured during preferences

**Stripe Connect**
- **Offered during onboarding but clearly skippable** ("Set up later" option)
- Framing: **choice-focused** — "Some challenges offer paid advisory roles. Want to be eligible?" — neutral, no pressure
- If skipped: **prompt only when matched to a paid challenge** — contextual and motivating, not nagging
- Incomplete Stripe onboarding handling: Claude's discretion

### Claude's Discretion
- Upload UI pattern (drag-and-drop zone vs simple picker)
- Wait state during LLM parsing (progress steps vs spinner)
- Profile review layout (cards vs form, single page vs wizard)
- Timing of availability/preferences collection within the flow
- Handling of incomplete Stripe Connect onboarding

### Deferred Ideas (OUT OF SCOPE)
- **Conversational profile building** — Instead of CV upload, a guided conversation asking about life experiences. Powerful for self-affirmation. Significant new onboarding path — its own phase.
- **Adaptive Circle limits via cognitive assessment** — iThink (Kirk's existing non-diagnostic app) could inform Circle limits based on cognitive profile. Needs Phase 6 wellbeing/GDPR infrastructure first.
- **iThink integration** — Existing app could bridge the gap for cognitive-informed personalisation without building assessment into ANC.
- **Wellbeing-aware AI model** — Factor emotional state into all platform interactions. Broader capability tied to Phase 6.
</user_constraints>

---

## Summary

Phase 2 has four distinct technical domains that must integrate sequentially: (1) file upload to S3, (2) text extraction (pdf-parse/mammoth for electronic files, Tesseract.js for images), (3) LLM parsing via OpenAI Structured Outputs into a typed Zod schema, and (4) profile persistence with Drizzle ORM. The Stripe Connect integration is a separate, optional side-branch of the onboarding flow.

The critical architectural decision is that LLM parsing is asynchronous and takes 5–30 seconds. The client must poll for job status rather than awaiting a synchronous response. The project already uses TanStack Query v5 which has first-class `refetchInterval` support for this pattern. The existing stack (Express, Drizzle, Zod, React 19, TanStack Query v5, Tailwind v4) requires no new framework additions — only new library installs for file handling.

The 5-minute SLA (ONBD-08) is achievable if: (a) S3 upload uses presigned URLs to skip the server as a proxy, (b) LLM parsing starts immediately after S3 confirms upload, and (c) the UI shows meaningful progress rather than a frozen spinner.

**Primary recommendation:** Use presigned PUT upload to S3, async job processing (inline Express async function — BullMQ adds Redis dependency that is unwarranted at MVP scale), OpenAI Structured Outputs with `zodResponseFormat()`, and TanStack Query polling on the frontend.

---

## Standard Stack

### Core (all already installed or direct additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-s3` | ^3.x | S3 bucket operations | AWS SDK v3 is modular, tree-shakeable |
| `@aws-sdk/s3-request-presigner` | ^3.x | Generate presigned PUT URLs | Keeps AWS credentials server-side only |
| `multer` | ^1.4.5-lts.1 | Server-side multipart for OCR path | CV images cannot use presigned PUTs (need preprocessing) |
| `pdf-parse` | ^1.1.1 | Extract text from PDF files | Pure Node, no native deps, widely used |
| `mammoth` | ^1.x | Extract raw text from DOCX | Purpose-built for Word docs, extractRawText() API |
| `tesseract.js` | ^5.x | OCR JPG/PNG image files | Pure JS, runs server-side in Node 16+, 100+ languages |
| `openai` | ^4.x | LLM parsing via Structured Outputs | Official SDK, zodResponseFormat() helper included |
| `stripe` | ^17.x | Stripe Connect account creation and account links | Official SDK |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-dropzone` | ^14.x | Drag-and-drop file upload zone (React hook) | Chosen for discretion area — best-in-class hook, 2025 active |
| `@types/multer` | ^1.4.x | TypeScript types for multer | Required in TypeScript projects |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pdf-parse` | `pdfjs-dist` | pdfjs is heavier (browser-focused), pdf-parse is server-optimised |
| `tesseract.js` | Cloud Vision API / AWS Textract | Cloud OCR is more accurate but adds cost, latency, and a third-party dependency; Tesseract.js is free and sufficient for printed CVs |
| Inline async processing | BullMQ + Redis | BullMQ adds Redis dependency. Inline processing with timeout guard is sufficient at MVP scale. Add BullMQ when concurrent load demands it. |
| Presigned PUT | Multer-proxy for all files | Multer-proxy doubles bandwidth cost. Use presigned PUT for PDF/DOCX/TXT; multer only for image OCR path which needs server preprocessing. |

**Installation (server):**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer pdf-parse mammoth tesseract.js openai stripe
npm install -D @types/multer
```

**Installation (web):**
```bash
npm install react-dropzone
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/server/src/
├── routes/
│   ├── auth.ts                # existing
│   ├── onboarding.ts          # NEW: /api/onboarding/* routes
│   └── profile.ts             # NEW: /api/profile/* routes
├── services/
│   ├── auth.service.ts        # existing
│   ├── cv.service.ts          # NEW: text extraction pipeline
│   ├── llm.service.ts         # NEW: OpenAI structured parsing
│   ├── s3.service.ts          # NEW: presigned URL generation, S3 ops
│   └── stripe.service.ts      # NEW: Connect account management
├── db/
│   ├── schema.ts              # extend with profile tables
│   └── migrations/            # generated by drizzle-kit
└── config/
    └── env.ts                 # extend with AWS, OpenAI, Stripe env vars

packages/web/src/
├── pages/
│   ├── onboarding/
│   │   ├── UploadCV.tsx       # Step 1: file upload
│   │   ├── Parsing.tsx        # Step 2: animated wait state
│   │   ├── ReviewProfile.tsx  # Step 3: editable draft profile
│   │   ├── Affirmation.tsx    # Step 4: personalised "you're in" moment
│   │   ├── Preferences.tsx    # Step 5: availability + preferences
│   │   └── StripeConnect.tsx  # Step 6: optional Stripe prompt
│   └── Dashboard.tsx          # existing (updated to check status)
├── api/
│   ├── onboarding.ts          # NEW: API calls for onboarding endpoints
│   └── profile.ts             # NEW: API calls for profile endpoints
└── hooks/
    ├── useAuth.ts             # existing
    └── useOnboarding.ts       # NEW: onboarding state + polling hook
```

### Pattern 1: Server-Side Presigned URL Upload (PDF/DOCX/TXT)

**What:** Server generates a temporary S3 PUT URL; client uploads directly to S3; S3 key is returned to server to trigger processing.
**When to use:** Electronic CV files (PDF, DOCX, TXT). Keeps server out of the upload bandwidth path.

```typescript
// Source: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
// packages/server/src/services/s3.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../config/env.js";

const s3 = new S3Client({ region: getEnv().AWS_REGION });

export async function generateUploadUrl(
  contributorId: string,
  fileName: string,
  mimeType: string,
): Promise<{ uploadUrl: string; s3Key: string }> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const s3Key = `cvs/${contributorId}/${Date.now()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: getEnv().S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min
  return { uploadUrl, s3Key };
}
```

### Pattern 2: Server-Side Multer Upload for Image OCR

**What:** JPG/PNG files route through multer (memory storage) → Tesseract.js OCR → text extracted → LLM parsing.
**When to use:** Photo/scan of paper CV (JPG, PNG).

```typescript
// packages/server/src/routes/onboarding.ts
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload-image", authMiddleware, upload.single("file"), async (req, res) => {
  const imageBuffer = req.file!.buffer;
  const text = await ocrImage(imageBuffer);
  // proceed to LLM parsing...
});
```

```typescript
// packages/server/src/services/cv.service.ts
import Tesseract from "tesseract.js";

export async function ocrImage(buffer: Buffer): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(buffer, "eng");
  return text;
}
```

### Pattern 3: Text Extraction Pipeline

**What:** Unified function dispatches to the correct extractor based on MIME type or file extension.
**When to use:** After S3 upload confirmed, before LLM parsing.

```typescript
// packages/server/src/services/cv.service.ts
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
```

### Pattern 4: OpenAI Structured Outputs with zodResponseFormat

**What:** Zod schema defines the exact shape of parsed profile. OpenAI SDK's `zodResponseFormat()` guarantees structured JSON output matching the schema exactly.
**When to use:** After text extraction.

```typescript
// Source: https://platform.openai.com/docs/guides/structured-outputs
// packages/server/src/services/llm.service.ts
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getEnv } from "../config/env.js";

const client = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });

export const parsedCvSchema = z.object({
  name: z.string(),
  rolesAndTitles: z.array(z.string()),
  skills: z.array(z.string()),
  qualifications: z.array(z.string()),
  sectors: z.array(z.string()),
  yearsOfExperience: z.number(),
  professionalSummary: z.string(),
  affirmationMessage: z.string(), // LLM-generated personalised message
});

export type ParsedCV = z.infer<typeof parsedCvSchema>;

export async function parseCvText(cvText: string): Promise<ParsedCV> {
  const response = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert CV parser for a platform that values experienced professionals aged 50-75.
Extract all fields from the CV text provided. For affirmationMessage, write one warm, specific sentence that highlights
what makes this person's experience genuinely valuable to communities — e.g. "30 years of engineering leadership — that's exactly what communities need."
Make your best guess for all fields. Never leave a field empty.`,
      },
      { role: "user", content: cvText },
    ],
    response_format: zodResponseFormat(parsedCvSchema, "parsed_cv"),
  });

  const result = response.choices[0].message.parsed;
  if (!result) throw new Error("LLM returned null parsed result");
  return result;
}
```

### Pattern 5: Async Job Status Polling (Frontend)

**What:** useMutation starts the parse job; useQuery polls `/api/onboarding/parse-status/:jobId` until complete.
**When to use:** Bridging the 5–30 second LLM processing wait on the frontend.

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/reference/useQuery
// packages/web/src/hooks/useOnboarding.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { onboardingApi } from "../api/onboarding.js";

export function useCvParsing(jobId: string | null) {
  return useQuery({
    queryKey: ["cv-parse-status", jobId],
    queryFn: () => onboardingApi.getParseStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") return false;
      return 2000; // poll every 2 seconds while pending
    },
  });
}
```

### Pattern 6: Stripe Connect Express Account + Account Link

**What:** Create an Express connected account, generate a single-use account link URL, redirect contributor. After return, check `details_submitted` and `charges_enabled` to determine completion state.
**When to use:** When contributor opts into paid work eligibility.

```typescript
// Source: https://docs.stripe.com/connect/express-accounts
// packages/server/src/services/stripe.service.ts
import Stripe from "stripe";
import { getEnv } from "../config/env.js";

const stripe = new Stripe(getEnv().STRIPE_SECRET_KEY);

export async function createConnectAccount(contributorId: string, email?: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    metadata: { contributorId },
  });
  return account.id;
}

export async function createAccountLink(
  stripeAccountId: string,
  refreshUrl: string,
  returnUrl: string,
) {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return accountLink.url;
}

export async function getAccountStatus(stripeAccountId: string) {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  };
}
```

### Pattern 7: Database Schema Extension (Drizzle)

**What:** New tables extending existing `contributors` table with profile, preferences, and Stripe data.

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
// packages/server/src/db/schema.ts (additions)
import { integer, smallint, pgEnum } from "drizzle-orm/pg-core";

export const availabilityEnum = pgEnum("availability", [
  "full_time", "part_time", "occasional", "project_only",
]);

export const commFrequencyEnum = pgEnum("comm_frequency", [
  "immediate", "daily", "weekly",
]);

export const commChannelEnum = pgEnum("comm_channel", [
  "email", "phone",
]);

export const stripeStatusEnum = pgEnum("stripe_status", [
  "not_started", "pending", "complete",
]);

export const cvParseStatusEnum = pgEnum("cv_parse_status", [
  "pending", "processing", "complete", "failed",
]);

// Profile table: stores LLM-parsed and user-edited fields
export const contributorProfiles = pgTable("contributor_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .unique()
    .references(() => contributors.id, { onDelete: "cascade" }),
  // CV storage
  cvS3Key: text("cv_s3_key"),
  cvParseStatus: cvParseStatusEnum("cv_parse_status").default("pending").notNull(),
  // Parsed fields (all editable by user)
  rolesAndTitles: jsonb("roles_and_titles").$type<string[]>().default([]),
  skills: jsonb("skills").$type<string[]>().default([]),
  qualifications: jsonb("qualifications").$type<string[]>().default([]),
  sectors: jsonb("sectors").$type<string[]>().default([]),
  yearsOfExperience: smallint("years_of_experience"),
  professionalSummary: text("professional_summary"),
  affirmationMessage: text("affirmation_message"),
  // Availability & preferences
  availability: availabilityEnum("availability"),
  maxCircles: smallint("max_circles").default(3).notNull(),
  domainPreferences: jsonb("domain_preferences").$type<string[]>().default([]),
  domainOther: text("domain_other"),
  willingToMentor: boolean("willing_to_mentor").default(false).notNull(),
  commChannel: commChannelEnum("comm_channel"),
  commFrequency: commFrequencyEnum("comm_frequency"),
  // Stripe Connect
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeStatus: stripeStatusEnum("stripe_status").default("not_started").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// CV parse jobs: tracks async LLM parse state
export const cvParseJobs = pgTable("cv_parse_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  status: cvParseStatusEnum("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Recommended Onboarding Flow

```
Register/Login → [status: onboarding]
  Step 1: Upload CV (UploadCV.tsx)
    - react-dropzone with accept: {pdf, docx, txt, jpg, png}
    - Electronic files: GET presigned URL → PUT to S3 → POST /api/onboarding/start-parse
    - Image files: POST /api/onboarding/upload-image (multer) → OCR server-side → same parse pipeline
  Step 2: Wait (Parsing.tsx)
    - Animated step-by-step progress labels ("Reading your CV...", "Finding your expertise...")
    - TanStack Query polls /api/onboarding/parse-status/:jobId every 2s
  Step 3: Review Profile (ReviewProfile.tsx)
    - Editable cards: one section per field group
    - "These look right" confirms; individual fields can be edited inline
  Step 4: Affirmation (Affirmation.tsx)
    - Full-screen moment with LLM-generated personalised message
    - "Continue" advances to preferences
  Step 5: Preferences (Preferences.tsx)
    - Availability, domains, max Circles, mentoring, communication prefs
  Step 6: Stripe Prompt (StripeConnect.tsx)
    - Choice-focused framing, skip button prominent
    - On "Set up" → redirect to Stripe Connect; on return, check status
  → [status: active] → Dashboard
```

### Anti-Patterns to Avoid

- **Blocking the server during LLM call:** Never `await parseCvText()` inside an Express request handler that returns the result synchronously. Kick off processing, return a jobId, poll.
- **Storing CV text in the database:** Extract text, parse it, store the structured result. The CV binary lives in S3; text is ephemeral.
- **Presigned URL for image OCR:** JPG/PNG must go through the server for Tesseract processing. Only electronic files use presigned PUT.
- **Single LLM prompt for all tasks:** Separate the parsing call from the affirmation message generation, or include it explicitly in the schema as a dedicated field — the current pattern includes it in the Zod schema which is correct.
- **Assuming Stripe onboarding is complete on `return_url`:** Always call `stripe.accounts.retrieve()` to check `details_submitted` on return. The contributor may have exited early.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | `pdf-parse` | PDF spec is complex; encoding, fonts, rotation edge cases |
| DOCX text extraction | Manual XML unzip | `mammoth.extractRawText()` | Word XML has dozens of format variants |
| Image OCR | Custom CV/ML model | `tesseract.js` | 100+ languages, handles skew, printed text; free |
| Structured LLM output | JSON.parse() on LLM text | `zodResponseFormat()` + `completions.parse()` | Guarantees schema adherence; no hallucinated fields |
| Drag-and-drop upload zone | Custom drag events | `react-dropzone` (useDropzone hook) | Handles all edge cases: drag over, drop rejection, multiple |
| Async job polling | WebSocket / SSE | TanStack Query `refetchInterval` | No new server infrastructure; clean query invalidation |
| Stripe KYC flow | Custom KYC form | Stripe Connect hosted onboarding | Regulatory compliance, identity verification, PCI scope |

**Key insight:** Every item in this list looks simple but has significant hidden complexity. The CV parsing pipeline alone (PDF encoding bugs, DOCX compatibility, OCR accuracy, LLM JSON reliability) could consume a sprint if hand-rolled.

---

## Common Pitfalls

### Pitfall 1: Tesseract.js Server-Side — Local Files Only

**What goes wrong:** Tesseract.js server-side does not fetch remote URLs. Passing an S3 URL directly will fail silently or throw a cryptic error.
**Why it happens:** The server-side Node.js build of Tesseract.js requires local buffers or file paths.
**How to avoid:** For image files, use multer memory storage. Buffer is available as `req.file.buffer`. Pass the buffer directly to `Tesseract.recognize(buffer, "eng")`.
**Warning signs:** `Error: Input file does not exist` despite passing what looks like a valid path.

### Pitfall 2: Stripe Account Link Is Single-Use

**What goes wrong:** Generating one account link URL and storing it (e.g., in the database or email) means the contributor gets an expired link error on second attempt.
**Why it happens:** Stripe invalidates account link URLs after first use or expiry.
**How to avoid:** Never cache account link URLs. Always call `stripe.accountLinks.create()` at the moment of redirect. Store only the `stripeAccountId` (the connected account ID), not the link URL.
**Warning signs:** Stripe returns 400 with "This link has already been used."

### Pitfall 3: Assuming Stripe Onboarding Is Complete on Return

**What goes wrong:** Contributor clicks "Submit" in Stripe, browser returns to `return_url`, but payout capability is not yet enabled. Platform marks them as "Stripe complete" prematurely.
**Why it happens:** Stripe's `return_url` fires on any exit from the onboarding flow, not just completion.
**How to avoid:** On `return_url` handler, call `stripe.accounts.retrieve(accountId)` and check `account.details_submitted && account.charges_enabled`. If false, update `stripeStatus` to `"pending"` not `"complete"`.
**Warning signs:** Contributor can see paid challenges but Stripe rejects payouts.

### Pitfall 4: pdf-parse Hanging on Encrypted or Corrupted PDFs

**What goes wrong:** `pdf-parse` hangs indefinitely (no timeout) on encrypted PDFs or certain malformed files.
**Why it happens:** The underlying `pdfjs-dist` parser can enter an infinite loop on bad input.
**How to avoid:** Wrap the `pdf-parse` call in a `Promise.race()` with a timeout (e.g., 15 seconds). Log and return a user-friendly error if it fires.
**Warning signs:** Parsing job stays in `"processing"` status forever.

### Pitfall 5: LLM Token Limit on Long CVs

**What goes wrong:** CVs with 10+ years of verbose experience can exceed `gpt-4o-mini`'s context. The API returns a truncated response that fails schema validation.
**Why it happens:** `gpt-4o-mini` context is 128k tokens, but extremely long CV text can also inflate the structured output token budget.
**How to avoid:** Truncate extracted CV text to a safe maximum (e.g., 8,000 characters) before sending to LLM. For very long documents, summarise the later sections. Log truncation events.
**Warning signs:** OpenAI API returns `finish_reason: "length"` instead of `"stop"`.

### Pitfall 6: Contributor Status Not Progressed After Onboarding

**What goes wrong:** Contributor completes all onboarding steps but `contributors.status` remains `"onboarding"`, locking them out of active features.
**Why it happens:** Missing the final step that transitions `status` to `"active"`.
**How to avoid:** The final step of onboarding (preferences confirmation, or Stripe skip) must call `UPDATE contributors SET status = 'active'`. Make this transactional with the final preferences write.
**Warning signs:** Dashboard shows "complete" but user is redirected back to onboarding on next login.

### Pitfall 7: File Type Validation Client-Only

**What goes wrong:** Accepting file type only by extension in the browser allows bypass by renaming a malicious file.
**Why it happens:** Client-side MIME checks are advisory.
**How to avoid:** Validate MIME type server-side using the actual file bytes (or at minimum, the `Content-Type` header from multer). For presigned URL path, generate the URL only after validating the requested `mimeType` against an allowlist.
**Warning signs:** S3 bucket receives files with unexpected content types.

---

## Code Examples

### Generating a Presigned Upload URL (Server Route)

```typescript
// packages/server/src/routes/onboarding.ts
router.post("/upload-url", authMiddleware, async (req, res) => {
  const { fileName, mimeType } = req.body as { fileName: string; mimeType: string };
  const allowedMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowedMimeTypes.includes(mimeType)) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }
  const { uploadUrl, s3Key } = await generateUploadUrl(
    req.contributor!.id, fileName, mimeType,
  );
  res.json({ uploadUrl, s3Key });
});
```

### Client-Side Upload with react-dropzone

```typescript
// Source: https://react-dropzone.js.org/
// packages/web/src/pages/onboarding/UploadCV.tsx
import { useDropzone } from "react-dropzone";

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

export function UploadCV({ onUploadComplete }: { onUploadComplete: (jobId: string) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    onDropAccepted: async ([file]) => {
      await handleUpload(file);
    },
  });
  // ...
}
```

### Polling Parse Status

```typescript
// packages/web/src/hooks/useOnboarding.ts
export function useCvParseStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["cv-parse-status", jobId],
    queryFn: () => onboardingApi.getParseStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "complete" || status === "failed" ? false : 2000;
    },
  });
}
```

### Checking Stripe Return Status

```typescript
// packages/server/src/routes/onboarding.ts
router.get("/stripe/return", authMiddleware, async (req, res) => {
  const env = getEnv();
  const db = getDb();
  const [profile] = await db
    .select({ stripeAccountId: contributorProfiles.stripeAccountId })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, req.contributor!.id))
    .limit(1);

  if (!profile?.stripeAccountId) {
    res.redirect(`${env.CLIENT_URL}/onboarding/stripe?error=no_account`);
    return;
  }

  const status = await getAccountStatus(profile.stripeAccountId);
  const stripeStatus = status.detailsSubmitted && status.chargesEnabled
    ? "complete" : "pending";

  await db
    .update(contributorProfiles)
    .set({ stripeStatus, updatedAt: new Date() })
    .where(eq(contributorProfiles.contributorId, req.contributor!.id));

  res.redirect(`${env.CLIENT_URL}/onboarding/complete`);
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `aws-sdk` v2 (monolithic) | `@aws-sdk/client-s3` v3 (modular) | 2020 | Tree-shakeable; required for modern Node ESM projects |
| OpenAI JSON mode (`json_object`) | Structured Outputs (`json_schema` + Zod) | Aug 2024 | Guarantees schema adherence; eliminates post-parse validation |
| Bull (Redis queue) | BullMQ (Redis queue, TypeScript rewrite) | 2021 (skip for MVP) | BullMQ is current; but Redis dependency is unjustified at MVP scale |
| Multer v1 for all uploads | Presigned PUT URLs for electronic files | Pattern matured ~2022 | Halves bandwidth cost; server never touches file bytes |

**Deprecated/outdated:**
- `aws-sdk` v2: Do not use. AWS SDK v3 is the current standard. All new packages must use `@aws-sdk/client-s3` and related v3 packages.
- OpenAI `json_object` mode: Superseded by Structured Outputs. Does not guarantee schema adherence; use `zodResponseFormat()` instead.
- `node-tesseract-ocr` (system Tesseract wrapper): Requires system-level Tesseract install. Use `tesseract.js` (pure JS, no system deps).

---

## Open Questions

1. **S3 Bucket — New or Existing?**
   - What we know: Project uses AWS (implied by S3 requirement)
   - What's unclear: Whether an S3 bucket exists or needs provisioning
   - Recommendation: Add `S3_BUCKET` and `AWS_REGION` to `env.ts` with local no-op stubs for dev; planner should include a task for S3 bucket setup

2. **OpenAI API Key Availability**
   - What we know: Not yet in `env.ts`
   - What's unclear: Whether key is already provisioned
   - Recommendation: Add `OPENAI_API_KEY` to `env.ts`; planner should flag as infrastructure prerequisite

3. **Stripe Secret Key + Connect Configuration**
   - What we know: Not in `env.ts`; Stripe Connect requires platform account setup in Stripe Dashboard
   - What's unclear: Whether the Stripe platform account is configured for Express connected accounts
   - Recommendation: Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to `env.ts`; platform Connect settings must be enabled before code can work

4. **CV Text Truncation Threshold**
   - What we know: gpt-4o-mini has 128k context; CVs rarely exceed 3,000 words
   - What's unclear: Whether 8,000 characters is the right truncation limit or if more is needed for complex CVs
   - Recommendation: Start with 8,000 characters; adjust in testing

5. **Domain Taxonomy**
   - What we know: "Fixed taxonomy with free-text Other option" is locked
   - What's unclear: The actual taxonomy values are not defined in the context
   - Recommendation: Planner should include a task to define initial domain taxonomy as a constant in the shared package

---

## Sources

### Primary (HIGH confidence)
- AWS SDK v3 S3 Request Presigner official docs — presigned URL pattern, `getSignedUrl()` API
  https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/
- Stripe Connect Express Accounts official docs — account creation, account links, return/refresh URLs, incomplete onboarding handling
  https://docs.stripe.com/connect/express-accounts
- OpenAI Structured Outputs — `zodResponseFormat()`, `completions.parse()`, supported models
  https://platform.openai.com/docs/guides/structured-outputs
- Drizzle ORM PostgreSQL column types — `jsonb`, `pgEnum`, `smallint`
  https://orm.drizzle.team/docs/column-types/pg
- TanStack Query v5 `useQuery` — `refetchInterval` function signature
  https://tanstack.com/query/latest/docs/framework/react/reference/useQuery

### Secondary (MEDIUM confidence)
- react-dropzone official docs and GitHub — `useDropzone` hook, `accept` format, `maxSize`
  https://react-dropzone.js.org/ | https://github.com/react-dropzone/react-dropzone
- mammoth npm — `extractRawText({ buffer })` API confirmed
  https://www.npmjs.com/package/mammoth
- pdf-parse npm — `pdf-parse(buffer)` returning `{ text }` confirmed
  https://www.npmjs.com/package/pdf-parse
- Tesseract.js GitHub — server-side Node.js usage confirmed, local buffer requirement noted
  https://github.com/naptha/tesseract.js/
- multer-s3 npm — AWS SDK v3 compatible via `@aws-sdk/lib-storage`
  https://www.npmjs.com/package/multer-s3

### Tertiary (LOW confidence — validate before use)
- BullMQ for async jobs: Mentioned as the current standard, but explicitly deferred to post-MVP due to Redis dependency. Decision to use inline async processing at MVP scale is based on project context, not benchmarked.
- Stripe `details_submitted` + `charges_enabled` as completion signals: Inferred from Stripe docs; exact field names should be confirmed via `stripe.accounts.retrieve()` TypeScript types.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs or npm registry
- Architecture: HIGH — patterns derived from official docs and existing codebase conventions
- Pitfalls: MEDIUM — items 1, 2, 3 verified against official docs; items 4, 5, 6, 7 are well-documented community patterns
- Database schema: HIGH — Drizzle column types verified against official docs; enum values match CONTEXT.md decisions

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable libraries; Stripe and OpenAI APIs evolve but breaking changes are infrequent)

# Phase 4: Circles and Collaboration - Research

**Researched:** 2026-03-13
**Domain:** Collaborative workspace — Circle formation, notes feed with file attachments, social deep links, resolution submission, rating/feedback
**Confidence:** HIGH (stack is the established codebase; patterns derived directly from existing Phase 1-3 code; social link URL formats verified against official docs)

---

## Summary

Phase 4 builds the collaboration layer on top of the existing challenge and matching infrastructure from Phase 3. The core object is a Circle: a group of 3-7 contributors linked to one challenge, with a shared workspace (pinned brief, notes feed, member list, external social link). Everything runs on the existing Express/Drizzle/React/TanStack Query stack — no new infrastructure is required.

The main new technical areas are: (1) the Circle entity and its membership model, (2) a notes feed with S3 file attachments using the presigned-URL pattern already established for CVs, (3) external social channel storage and deep-link validation, (4) a structured resolution submission with a 5-field document, and (5) a challenger rating flow. The challenge interest list already carries the candidate pool; the CM "Select this team" action in Phase 3 was deliberately left as local state, so Phase 4 must wire that selection into an actual POST /api/circles endpoint.

File attachments on notes use the same presigned PUT URL pattern as CV upload — browser requests a presigned URL from the server, uploads directly to S3, then POSTs the resulting S3 key alongside the note. Social channel links are opaque user-supplied URLs (WhatsApp group links, Slack workspace/channel deep links, Discord invite links, Teams deep links, Signal group invite links); the app stores them as-is and opens them with `window.open(url, '_blank')` — no parsing or platform-specific SDK is required.

**Primary recommendation:** Extend the existing Express router, Drizzle schema, shared types, TanStack Query hooks, and Tailwind/Radix UI component patterns exactly as established in Phases 1-3. No new libraries are needed. The one nuance is file attachments on notes — reuse the presigned S3 URL approach rather than piping files through Express.

---

## Standard Stack

No new libraries are required for Phase 4. All features are implemented with the already-installed stack.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.38.0 | New tables: circles, circle_members, circle_notes, note_attachments, circle_resolutions, resolution_ratings | Already in use for all tables |
| @aws-sdk/client-s3 + s3-request-presigner | ^3.1006.0 | Presigned PUT URLs for note file attachments | Already in use for CV upload |
| multer | ^2.1.1 | NOT used for file uploads — presigned URL pattern avoids it | Already installed but not needed for attachments |
| zod | ^3.24.0 | Shared schemas for Circle creation, note input, resolution, rating | Already in use for all schemas |
| @tanstack/react-query | ^5.62.0 | useQuery/useMutation hooks for circles data | Already in use for challenges |
| @radix-ui/react-accordion | ^1.2.12 | Circle workspace sections | Already in use for challenge feed |
| react-dropzone | ^15.0.0 | File picker for note attachments | Already installed for CV upload |
| tailwindcss | ^4.0.0 | Styling with existing @theme tokens | Already in use |

### No New Installations Required

All Phase 4 features are achievable with the current `packages/web/package.json` and `packages/server/package.json`. Do NOT add new libraries.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
packages/shared/src/
├── types/circle.ts          # Circle, CircleMember, CircleNote, NoteAttachment, CircleResolution, ResolutionRating types
├── schemas/circle.ts        # Zod schemas: createCircleSchema, postNoteSchema, submitResolutionSchema, rateResolutionSchema, setSocialChannelSchema
└── index.ts                 # Re-export new types and schemas

packages/server/src/
├── db/schema.ts             # Add: circles, circleMembers, circleNotes, noteAttachments, circleResolutions, resolutionRatings tables + enums
├── routes/circles.ts        # New router: /api/circles/* — formation, workspace, notes, social, resolution, rating
└── express-app.ts           # Register: app.use('/api/circles', circleRoutes)

packages/web/src/
├── api/circles.ts           # API client functions for all circle endpoints
├── hooks/useCircles.ts      # TanStack Query hooks
├── pages/circles/
│   └── CircleWorkspace.tsx  # Main workspace page (route: /circles/:id)
└── components/circles/
    ├── CircleFormationModal.tsx    # CM: form to create circle from selected team
    ├── CircleWorkspaceShell.tsx    # Layout: pinned brief, member list, social link, notes feed
    ├── NoteComposer.tsx            # Post note with text + optional file attachment
    ├── NoteCard.tsx                # Render single note with attachment download link
    ├── SocialChannelEditor.tsx     # Set/change external social channel link
    ├── ResolutionForm.tsx          # 5-field structured resolution form
    └── ResolutionCard.tsx          # Display submitted resolution; challenger sees rating UI
```

### Pattern 1: Database Schema Extension

**What:** Add six new tables to `packages/server/src/db/schema.ts` following the exact existing conventions: `pgTable`, `uuid().primaryKey().defaultRandom()`, `timestamp(..., { withTimezone: true }).defaultNow()`, `references(() => table.id, { onDelete: ... })`, `jsonb` for structured fields.

**Key tables:**

```typescript
// Source: existing schema.ts conventions

export const circleStatusEnum = pgEnum("circle_status", [
  "forming",     // CM created, waiting for members to join
  "active",      // 3+ members, work in progress
  "submitted",   // resolution submitted, awaiting rating
  "completed",   // resolution rated
  "dissolved",   // closed without resolution
]);

export const socialChannelEnum = pgEnum("social_channel", [
  "whatsapp", "slack", "discord", "teams", "signal",
]);

export const circles = pgTable("circles", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "restrict" }),
  createdBy: uuid("created_by").notNull().references(() => contributors.id, { onDelete: "restrict" }),
  status: circleStatusEnum("status").notNull().default("forming"),
  socialChannel: socialChannelEnum("social_channel"),
  socialChannelUrl: text("social_channel_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const circleMembers = pgTable(
  "circle_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    circleId: uuid("circle_id").notNull().references(() => circles.id, { onDelete: "cascade" }),
    contributorId: uuid("contributor_id").notNull().references(() => contributors.id, { onDelete: "restrict" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("circle_members_unique").on(table.circleId, table.contributorId)],
);

export const circleNotes = pgTable("circle_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").notNull().references(() => circles.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => contributors.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const noteAttachments = pgTable("note_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  noteId: uuid("note_id").notNull().references(() => circleNotes.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const circleResolutions = pgTable("circle_resolutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  circleId: uuid("circle_id").notNull().unique().references(() => circles.id, { onDelete: "cascade" }),
  submittedBy: uuid("submitted_by").notNull().references(() => contributors.id, { onDelete: "restrict" }),
  problemSummary: text("problem_summary").notNull(),
  recommendations: text("recommendations").notNull(),
  evidence: text("evidence").notNull(),
  dissentingViews: text("dissenting_views"),
  implementationNotes: text("implementation_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resolutionRatings = pgTable("resolution_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  resolutionId: uuid("resolution_id").notNull().unique().references(() => circleResolutions.id, { onDelete: "cascade" }),
  raterId: uuid("rater_id").notNull().references(() => contributors.id, { onDelete: "restrict" }),
  rating: smallint("rating").notNull(),   // 1-5
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Pattern 2: Express Router — /api/circles

**What:** New router file following the `challenges.ts` pattern exactly: Router(), authMiddleware on every endpoint, requireRole guard for CM-only creation, inline Drizzle queries, Zod validation on body.

**Key endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/circles | CM only | Create circle, insert members atomically |
| GET | /api/circles/:id | Member | Get circle workspace (brief, members, social link) |
| GET | /api/circles | Contributor | List contributor's active circles |
| POST | /api/circles/:id/members | CM only | Add member mid-challenge (CIRC-08) |
| GET | /api/circles/:id/notes | Member | Paginated notes feed |
| POST | /api/circles/:id/notes | Member | Post note (text + optional attachment s3 keys) |
| POST | /api/circles/:id/notes/attachment-url | Member | Request presigned PUT URL for note attachment |
| PUT | /api/circles/:id/social | Member | Set/change social channel link |
| POST | /api/circles/:id/resolution | Member | Submit structured resolution |
| GET | /api/circles/:id/resolution | Member | Get resolution (all members + challenger) |
| POST | /api/circles/:id/resolution/rating | Challenger | Rate resolution 1-5 + feedback |

**Membership guard pattern** — a middleware helper (not a requireRole) that checks the requesting contributor is a member of the circle:

```typescript
// Source: codebase pattern — inline auth check like challenges.ts
async function requireCircleMember(circleId: string, contributorId: string, db: Db): Promise<boolean> {
  const [member] = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.contributorId, contributorId),
      ),
    )
    .limit(1);
  return !!member;
}
```

### Pattern 3: Circle Formation (wiring Phase 3 "Select this team")

**What:** The CM's "Select this team" button in `TeamCompositionCard.tsx` is currently local state only. Phase 4 adds a `CircleFormationModal` that appears when the CM clicks "Form this Circle" after selecting a team. The modal confirms members and calls `POST /api/circles`.

**Flow:**
1. CM selects team in TeamCompositionCard (local state unchanged)
2. New "Form Circle" button appears below selection
3. Clicking opens `CircleFormationModal` with member list
4. On confirm: POST `/api/circles` with `{ challengeId, memberIds: string[] }`
5. Server creates circle + circleMembers atomically, sets status to "active" if ≥3 members
6. On success: navigate to `/circles/:id`

**Server atomicity — use a transaction:**

```typescript
// Source: drizzle-orm transaction pattern
const result = await db.transaction(async (tx) => {
  const [circle] = await tx.insert(circles).values({ challengeId, createdBy, status: "forming" }).returning();
  await tx.insert(circleMembers).values(memberIds.map(id => ({ circleId: circle.id, contributorId: id })));
  if (memberIds.length >= 3) {
    await tx.update(circles).set({ status: "active" }).where(eq(circles.id, circle.id));
  }
  return circle;
});
```

### Pattern 4: File Attachments on Notes (presigned S3 URL)

**What:** Reuse the exact S3 presigned PUT URL pattern from CV upload. The browser never sends binary data through Express.

**Flow:**
1. User picks file in `NoteComposer` (react-dropzone already installed)
2. Frontend calls `POST /api/circles/:id/notes/attachment-url` with `{ fileName, mimeType, fileSizeBytes }`
3. Server generates presigned S3 PUT URL (expiry 300s), returns `{ uploadUrl, s3Key }`
4. Browser PUTs file directly to S3 using the presigned URL
5. Frontend adds `{ s3Key, fileName, mimeType, fileSizeBytes }` to note post body
6. Server inserts note + noteAttachments rows atomically in a transaction
7. To read: server generates presigned GET URL on demand (same pattern as existing `getObjectBuffer` but using `GetObjectCommand` with presigned URL for browser download)

**S3 key convention:**
```
circle-notes/{circleId}/{noteId}/{timestamp}-{originalFileName}
```

**Server: attachment upload-url endpoint:**
```typescript
// Source: onboarding.ts generateUploadUrl pattern
const s3Key = `circle-notes/${circleId}/${crypto.randomUUID()}/${Date.now()}-${sanitized}`;
const { uploadUrl } = await generateUploadUrl(contributorId, fileName, mimeType);
// NOTE: adapt generateUploadUrl to accept an explicit s3Key, or add a new function
```

**Allowed MIME types for note attachments:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`. Max file size: 10 MB (matches existing multer limit).

### Pattern 5: Social Deep Links (PLAT-05)

**What:** Circle members store an opaque URL string. The frontend opens it with `window.open(url, '_blank', 'noopener,noreferrer')`. No SDK or parsing is required.

**Verified URL formats by platform:**

| Platform | Link Format | How Generated |
|----------|-------------|---------------|
| WhatsApp | `https://chat.whatsapp.com/{code}` | User creates group, copies invite link from app |
| Slack | `https://slack.com/app_redirect?channel={ID}` or `slack://channel?team={T}&id={C}` | User copies channel link from Slack |
| Discord | `https://discord.gg/{code}` | Server invite link (6-8 char code) |
| Teams | `https://teams.microsoft.com/l/...` | User copies deep link from Teams |
| Signal | `https://signal.group/{code}` | Group admin copies group link from Signal |

**Validation approach:** Store the URL as-is. Validate only that it is a valid URL (`URL` constructor does not throw) and that the hostname matches the expected platform. Show the platform icon based on the stored `socialChannel` enum value, not by parsing the URL. Warn user (not error) if the URL host doesn't match the selected platform.

**Frontend open pattern:**
```typescript
// Source: verified approach — window.open with noopener
function openSocialLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

### Pattern 6: Structured Resolution Submission

**What:** `POST /api/circles/:id/resolution` accepts a 5-field body. Only circle members can submit. Only one resolution per circle (the `unique()` constraint on `resolutionId` in circleResolutions enforces this at DB level). After submission, circle status transitions to `"submitted"`.

**Zod schema:**
```typescript
// Source: derived from CIRC-05 requirements
export const submitResolutionSchema = z.object({
  problemSummary: z.string().min(10).max(5000),
  recommendations: z.string().min(10).max(10000),
  evidence: z.string().min(10).max(10000),
  dissentingViews: z.string().max(5000).optional(),
  implementationNotes: z.string().max(5000).optional(),
});
```

### Pattern 7: Challenger Rating (CIRC-06)

**What:** The challenger is `challenges.createdBy`. Only the challenger can rate. Rating is 1-5 (smallint, validate min/max in Zod). After rating, circle status transitions to `"completed"`.

**Authorization check:**
```typescript
// Verify req.contributor.id === challenge.createdBy for the circle's challenge
const [circle] = await db.select({ challengeId: circles.challengeId }).from(circles).where(eq(circles.id, circleId)).limit(1);
const [challenge] = await db.select({ createdBy: challenges.createdBy }).from(challenges).where(eq(challenges.id, circle.challengeId)).limit(1);
if (challenge.createdBy !== req.contributor!.id) {
  res.status(403).json({ error: "Only the challenger can rate the resolution" });
  return;
}
```

### Pattern 8: Multi-Circle Participation (CIRC-07)

**What:** `maxCircles` already exists on `contributorProfiles` (default 3). Before adding a member to a new circle, check their active circle count against their `maxCircles`.

```typescript
const [{ count: activeCount }] = await db
  .select({ count: sql<number>`COUNT(*)::int` })
  .from(circleMembers)
  .innerJoin(circles, eq(circleMembers.circleId, circles.id))
  .where(
    and(
      eq(circleMembers.contributorId, contributorId),
      inArray(circles.status, ["forming", "active", "submitted"]),
    ),
  );
// Compare against profile.maxCircles
```

### Pattern 9: TanStack Query Keys Hierarchy

Follow the existing `["challenges", ...]` key pattern:

```typescript
["circles"]                                    // list
["circles", circleId]                          // single circle workspace
["circles", circleId, "notes"]                 // notes feed
["circles", circleId, "resolution"]            // resolution
["circles", circleId, "resolution", "rating"]  // rating
```

### Anti-Patterns to Avoid

- **Piping attachment files through Express:** The CV upload already proved presigned URLs are the right pattern. Do NOT use multer for circle note attachments — it creates an unnecessary memory buffer for binary data.
- **Storing social channel links as a parsed object:** Store as raw URL string + platform enum. URLs change format; parsing creates false precision.
- **Non-atomic circle creation:** Always use `db.transaction()` when creating circle + members together. A partial insert (circle without members) is an invalid state.
- **Letting any contributor rate a resolution:** The rating authorization must check `challenge.createdBy`, not just `req.contributor.role`.
- **Generating presigned GET URLs at list time:** Generate presigned download URLs lazily (on note detail fetch or explicit download request), not for every note in the feed. The feed should return `{ s3Key, fileName }` and the frontend requests a download URL when needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File attachment upload | Custom multipart upload through Express | Presigned S3 PUT URL (existing `generateUploadUrl` in `s3.service.ts`) | Already implemented, tested, works for CV uploads |
| File download | Proxy S3 files through Express | Presigned S3 GET URL (new function in `s3.service.ts`) | Avoids Express memory pressure; S3 handles auth |
| Atomic circle + members insert | Sequential inserts with error handling | `db.transaction()` (Drizzle ORM) | Prevents partial state; Drizzle transaction API is already available |
| Social link validation | URL parsing/regex per platform | `new URL(url)` + hostname check + user-facing warning | URL constructor handles validity; platform matching is a UX hint not a hard constraint |
| Circle membership auth | Custom auth table/token | DB query: check circleMembers where circleId + contributorId | Already the pattern for challengeInterests checks |

**Key insight:** Every "new" problem in Phase 4 has a direct analog already solved in Phase 1-3. Map each new requirement to its existing counterpart before building anything new.

---

## Common Pitfalls

### Pitfall 1: Circle Formation Leaves Challenges Route Unmodified

**What goes wrong:** Developers add circle formation logic inside the challenges route or try to repurpose team-suggestions into a formation endpoint.
**Why it happens:** Phase 3 left the "Select this team" as local state, so there's no obvious place to hang the formation.
**How to avoid:** Create a separate `/api/circles` router. Circle formation is POST /api/circles. The team-suggestions endpoint in challenges.ts remains read-only.
**Warning signs:** Any modification to `packages/server/src/routes/challenges.ts` for circle creation.

### Pitfall 2: S3 Key Collision on Note Attachments

**What goes wrong:** Two users upload attachments for the same note simultaneously and their files overwrite each other.
**Why it happens:** Using a deterministic key (circleId + fileName without timestamp/UUID).
**How to avoid:** Always include `Date.now()` or `crypto.randomUUID()` in the S3 key for note attachments. Convention: `circle-notes/{circleId}/{uuid}/{timestamp}-{fileName}`.
**Warning signs:** S3 key construction without a random/timestamp component.

### Pitfall 3: Resolution Uniqueness Violated at Application Layer Only

**What goes wrong:** Two members submit a resolution simultaneously; both inserts succeed because the uniqueness check was done as a SELECT before INSERT.
**Why it happens:** SELECT then INSERT without a transaction allows a race.
**How to avoid:** The `unique()` constraint on `circleResolutions.circleId` (one resolution per circle) is the primary guard — let the DB enforce it. Catch the unique-violation error (Postgres code `23505`) and return 409.
**Warning signs:** Any pre-insert SELECT to check for existing resolution instead of relying on DB constraint.

### Pitfall 4: Challenger Identity Not Verified for Rating

**What goes wrong:** Any authenticated contributor can rate a resolution.
**Why it happens:** Developer checks `req.contributor.role === 'contributor'` (which is everyone) instead of checking identity against the challenge's `createdBy`.
**How to avoid:** The rating route must join through `circles → challenges` and verify `challenge.createdBy === req.contributor.id`.
**Warning signs:** Any rating route that only checks `authMiddleware` without the challenger identity check.

### Pitfall 5: Social Link Opens in Same Tab

**What goes wrong:** `window.location.href = url` navigates away from the app.
**Why it happens:** Developer uses `<a href={url}>` without `target="_blank"`.
**How to avoid:** Always use `window.open(url, '_blank', 'noopener,noreferrer')` or `<a href={url} target="_blank" rel="noopener noreferrer">`. Test that the app shell remains intact after clicking a social link.
**Warning signs:** Any anchor tag without `target="_blank"` for social links.

### Pitfall 6: Missing `inArray` Import from drizzle-orm

**What goes wrong:** Multi-circle count query using `inArray(circles.status, [...])` fails to compile because `inArray` is not imported from `drizzle-orm`.
**Why it happens:** Existing code only imports `eq`, `and`, `sql` — `inArray` is a new import for Phase 4.
**How to avoid:** Import `inArray` from `drizzle-orm` alongside existing operators.
**Warning signs:** TypeScript error on `inArray` — it's available in drizzle-orm ^0.38.0 but must be explicitly imported.

### Pitfall 7: notes/attachment-url Route Shadowed by notes/:noteId

**What goes wrong:** Express matches `POST /api/circles/:id/notes/attachment-url` against `GET /api/circles/:id/notes/:noteId` because `:noteId` matches "attachment-url".
**Why it happens:** Static path segments declared after parameterized ones get swallowed.
**How to avoid:** Declare `/notes/attachment-url` before `/notes/:noteId` in the router, matching the challenge route pattern where `GET /my-interests` is declared before `GET /:id`.
**Warning signs:** 404 on attachment-url endpoint, or noteId query returning null for "attachment-url".

---

## Code Examples

### Drizzle Transaction for Circle Formation

```typescript
// Source: drizzle-orm docs pattern + existing schema conventions
import { eq, and, inArray, sql } from "drizzle-orm";

const circle = await db.transaction(async (tx) => {
  const [created] = await tx
    .insert(circles)
    .values({ challengeId, createdBy: req.contributor!.id })
    .returning();

  await tx.insert(circleMembers).values(
    memberIds.map((contributorId) => ({ circleId: created.id, contributorId })),
  );

  const finalStatus = memberIds.length >= 3 ? "active" : "forming";
  const [updated] = await tx
    .update(circles)
    .set({ status: finalStatus as typeof circleStatusEnum.enumValues[number], updatedAt: new Date() })
    .where(eq(circles.id, created.id))
    .returning();

  return updated;
});
```

### Presigned GET URL for Note Attachment Download

```typescript
// Source: extend existing s3.service.ts — pattern mirrors generateUploadUrl
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function generateDownloadUrl(s3Key: string, expiresIn = 300): Promise<string> {
  const env = getEnv();
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: s3Key });
  return getSignedUrl(client, command, { expiresIn });
}
```

### Zod Schema for Note Post

```typescript
// Source: derived from existing interestNoteSchema pattern
export const postNoteSchema = z.object({
  body: z.string().min(1).max(5000),
  attachments: z
    .array(
      z.object({
        s3Key: z.string().min(1),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        fileSizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
      }),
    )
    .max(5)
    .default([]),
});
```

### Zod Schema for Social Channel

```typescript
export const setSocialChannelSchema = z.object({
  channel: z.enum(["whatsapp", "slack", "discord", "teams", "signal"]),
  url: z.string().url().max(2000),
});
```

### Multi-Circle Active Count (CIRC-07)

```typescript
// Source: mirrors existing activeCount pattern in challenges.ts
const [{ count: activeCircleCount }] = await db
  .select({ count: sql<number>`COUNT(*)::int` })
  .from(circleMembers)
  .innerJoin(circles, eq(circleMembers.circleId, circles.id))
  .where(
    and(
      eq(circleMembers.contributorId, contributorId),
      inArray(circles.status, ["forming", "active", "submitted"]),
    ),
  );
```

### Frontend: Open Social Link

```typescript
// Source: standard browser API — window.open with noopener
function openSocialLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

### TanStack Query Hook Pattern (useCircleWorkspace)

```typescript
// Source: mirrors useChallengeFeed/useChallengeInterests patterns in useChallenges.ts
export function useCircleWorkspace(circleId: string | null) {
  return useQuery({
    queryKey: ["circles", circleId],
    queryFn: () => circlesApi.getCircleWorkspace(circleId!),
    enabled: !!circleId,
  });
}

export function usePostNote(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostNoteInput) => circlesApi.postNote(circleId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["circles", circleId, "notes"] });
    },
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pipe file uploads through Express (multer buffer) | Presigned S3 PUT URL — browser uploads directly | Established in Phase 2 (CV upload) | Phase 4 notes MUST use this pattern, not multer |
| Social links as platform-specific parsed objects | Store opaque URL + platform enum; open with window.open | Confirmed for Phase 4 | No deep-link SDK required |
| Synchronous team selection confirmation (Phase 3 local state) | Async POST /api/circles formation in Phase 4 | Phase 3 deferred it explicitly | TeamCompositionCard "Form Circle" button must trigger modal → API call |

**No deprecated items.** The stack is stable.

---

## Open Questions

1. **Who can post notes — members only, or also the challenger (challenge creator)?**
   - What we know: CIRC-03 says "Circle members can post notes." The challenger is not necessarily a member.
   - What's unclear: Should the challenge creator have read-only access to the workspace for oversight?
   - Recommendation: Restrict note posting to circle members. Challenge creator can view the resolution (they need to rate it) but does not need workspace read access. Keep it simple.

2. **Can the resolution be edited after submission?**
   - What we know: CIRC-05 says "submit" — no mention of editing. CIRC-06 says challenger rates it.
   - What's unclear: Whether members can amend the resolution before the challenger rates it.
   - Recommendation: Allow re-submission (PUT /api/circles/:id/resolution) while status is "submitted" — overwrite in place. Once rated (status "completed"), lock it.

3. **Maximum number of attachments per note and max file size?**
   - What we know: The existing multer config caps images at 10 MB. No explicit requirement in CIRC-03.
   - What's unclear: Whether large files (e.g., presentations) are expected.
   - Recommendation: Max 5 attachments per note, max 10 MB each, allowed types: PDF, DOCX, TXT, JPEG, PNG, WEBP. Document in the schema Zod validation.

4. **What happens to the circle if a member's contributor account is deleted?**
   - What we know: `circleMembers` should reference contributors with `onDelete: "restrict"` to prevent accidental data loss.
   - Recommendation: Use `onDelete: "restrict"` on the `contributorId` FK in `circleMembers`. This matches the pattern used in `challengeInterests`.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase `packages/server/src/db/schema.ts` — table conventions, enum patterns, FK options
- Existing codebase `packages/server/src/routes/challenges.ts` — route ordering, auth guards, Drizzle query patterns
- Existing codebase `packages/server/src/services/s3.service.ts` — presigned URL pattern for file upload/download
- Existing codebase `packages/web/src/hooks/useChallenges.ts` — TanStack Query key hierarchy and hook patterns
- Existing codebase `packages/web/src/styles/app.css` — Tailwind @theme tokens for styling
- Existing codebase `packages/web/package.json` — installed library versions (no new installs needed)

### Secondary (MEDIUM confidence)
- [Slack Deep Linking docs](https://docs.slack.dev/interactivity/deep-linking/) — `slack://channel` and `https://slack.com/app_redirect` URL formats (verified official)
- [Microsoft Teams Deep Links](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-links) — `https://teams.microsoft.com/l/...` format; prefer `https://` over `msteams://` (verified official)
- WhatsApp group invite link format `https://chat.whatsapp.com/{code}` — widely documented, consistent with official WhatsApp help articles
- Discord invite link format `https://discord.gg/{code}` — consistent across multiple official Discord support articles
- Signal group invite link format `https://signal.group/{code}` — consistent with Signal group invite feature documentation

### Tertiary (LOW confidence)
- None — all claims verified against official or primary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; versions confirmed in package.json
- Database schema: HIGH — directly mirrors existing Drizzle table conventions from schema.ts
- Architecture patterns: HIGH — all patterns derived from existing Phase 1-3 code
- Social deep links: MEDIUM — URL formats verified against official docs; actual deep-link behavior depends on user's device having the app installed (inherent platform uncertainty)
- Pitfalls: HIGH — route ordering and uniqueness pitfalls derived from known patterns in the existing codebase

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable stack; social link URL schemes could theoretically change but rarely do)

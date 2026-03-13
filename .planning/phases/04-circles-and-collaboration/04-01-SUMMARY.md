---
phase: 04-circles-and-collaboration
plan: "01"
subsystem: circles-backend
tags: [circles, api, schema, s3, drizzle, zod]
dependency_graph:
  requires:
    - 03-03 (challenges DB schema, challenges table, contributors table, contributorProfiles table)
  provides:
    - Circle DB tables (6 tables) consumed by all subsequent circle plans
    - /api/circles/* API surface consumed by Plan 02 (workspace UI) and Plan 03 (resolution UI)
    - Circle types and Zod schemas exported from packages/shared for frontend use
  affects:
    - packages/shared (new exports for circle types and schemas)
    - packages/server (new routes registered)
tech_stack:
  added: []
  patterns:
    - Drizzle pgTable with uuid().primaryKey().defaultRandom() and FK references with onDelete
    - Unique constraints via array syntax: (table) => [unique("name").on(table.col)]
    - Postgres 23505 unique violation catch for idempotent insert endpoints (resolution, rating)
    - Presigned S3 PUT URL generated inline (custom key prefix) not via generateUploadUrl
    - Cursor-based pagination using createdAt desc with lt() cursor for notes feed
    - Helper functions isCircleMember / isChallenger to avoid repeated auth logic
key_files:
  created:
    - packages/shared/src/types/circle.ts
    - packages/shared/src/schemas/circle.ts
    - packages/server/src/routes/circles.ts
  modified:
    - packages/server/src/db/schema.ts (6 new tables + 2 enums)
    - packages/server/src/services/s3.service.ts (generateDownloadUrl added)
    - packages/shared/src/index.ts (circle type and schema exports)
    - packages/server/src/express-app.ts (circleRoutes registered)
decisions:
  - "[04-01] Attachment upload URLs generated inline in circles.ts with custom s3Key prefix (circle-notes/${circleId}/...) — generateUploadUrl hard-codes cvs/ prefix and cannot accept custom keys"
  - "[04-01] Multi-circle limit enforced at circle creation and member addition — compares active circle count against contributorProfiles.maxCircles (default 3)"
  - "[04-01] Presigned download URLs not generated eagerly in GET /notes response — frontend requests them lazily via /notes/:noteId/download/:attachmentId to avoid unnecessary S3 calls"
  - "[04-01] GET /resolution accessible by circle members AND challenger (challenge creator) — challenger needs to view before rating"
  - "[04-01] Shared type names in index.ts disambiguated with 'SchemaInput' suffix for Zod-inferred types that conflict with interface type names"
metrics:
  duration: "14 min"
  completed_date: "2026-03-13"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 01: Circle Backend Summary

Complete Circle backend with 6 DB tables, shared types/schemas, and 13 API endpoints — presigned S3 upload/download URLs, multi-circle limit enforcement, notes with attachments, social channel links, resolution submission, and challenger rating.

## What Was Built

### Database Schema (packages/server/src/db/schema.ts)

Six new tables added following existing Drizzle conventions:

- **circles** — core circle record with challengeId FK, status enum (forming/active/submitted/completed/dissolved), optional socialChannel + socialChannelUrl
- **circle_members** — join table with unique constraint on (circleId, contributorId)
- **circle_notes** — notes posted by members with body text, authorId FK
- **note_attachments** — S3-backed file attachments per note (s3Key, fileName, mimeType, fileSizeBytes)
- **circle_resolutions** — one resolution per circle (unique on circleId), with problemSummary, recommendations, evidence, optional dissentingViews/implementationNotes
- **resolution_ratings** — one rating per resolution (unique on resolutionId), smallint 1-5 rating from challenge creator

Two new enums: `circle_status`, `social_channel`.

### Shared Types and Schemas

**packages/shared/src/types/circle.ts** — Circle, CircleMember, CircleNote, NoteAttachment, CircleResolution, ResolutionRating interfaces plus composed response types CircleWorkspaceResponse (with challenge.createdBy for isChallenger detection) and CircleListItem.

**packages/shared/src/schemas/circle.ts** — Six Zod schemas: createCircle, postNote (with attachments array), submitResolution, rateResolution, setSocialChannel, attachmentUrl.

### API Routes (packages/server/src/routes/circles.ts)

All 13 endpoints under `/api/circles`:

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | / | CM | Create circle with multi-circle limit check |
| GET | / | Member | List contributor's circles |
| GET | /:id | Member | Circle workspace data |
| POST | /:id/members | CM | Add member mid-challenge |
| POST | /:id/notes/attachment-url | Member | Presigned S3 PUT URL |
| GET | /:id/notes | Member | Paginated notes feed (cursor-based) |
| POST | /:id/notes | Member | Post note with attachments |
| GET | /:id/notes/:noteId/download/:attachmentId | Member | Presigned S3 GET URL |
| PUT | /:id/social | Member | Set social channel link |
| POST | /:id/resolution | Member | Submit resolution (409 if exists) |
| PUT | /:id/resolution | Member | Update resolution (blocked if completed) |
| GET | /:id/resolution | Member/Challenger | View resolution + rating |
| POST | /:id/resolution/rating | Challenger | Rate resolution (409 if rated) |

### S3 Service

`generateDownloadUrl(s3Key, expiresIn = 300)` added to s3.service.ts — follows existing generateUploadUrl pattern, uses GetObjectCommand for presigned GET URLs.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes in packages/server, packages/shared, and packages/web
- All 6 tables verified in database via query to information_schema
- GET /api/circles returns 401 without auth token (server already running on port 3000)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f0e2a0b | feat(04-01): add circle DB schema, shared types, and Zod schemas |
| Task 2 | 5aaa093 | feat(04-01): add circle API routes and S3 download URL function |

## Self-Check: PASSED

All artifacts present and all commits verified:
- packages/shared/src/types/circle.ts — FOUND
- packages/shared/src/schemas/circle.ts — FOUND
- packages/server/src/routes/circles.ts — FOUND
- generateDownloadUrl in s3.service.ts — FOUND
- /api/circles in express-app.ts — FOUND
- Commit f0e2a0b — FOUND
- Commit 5aaa093 — FOUND

---
phase: 04-circles-and-collaboration
plan: "02"
subsystem: frontend-circles
tags: [circles, frontend, react, tanstack-query, react-dropzone, radix-ui]
dependency_graph:
  requires: ["04-01"]
  provides: ["04-03"]
  affects: ["packages/web/src/App.tsx", "packages/web/src/components/layout/Navbar.tsx"]
tech_stack:
  added: []
  patterns:
    - TanStack Query infinite scroll with cursor pagination
    - react-dropzone + presigned S3 PUT for attachment upload
    - Radix Collapsible for challenge brief panel
    - Lazy presigned download URL fetched per attachment on demand
key_files:
  created:
    - packages/web/src/api/circles.ts
    - packages/web/src/hooks/useCircles.ts
    - packages/web/src/components/circles/CircleFormationModal.tsx
    - packages/web/src/components/circles/CircleWorkspaceShell.tsx
    - packages/web/src/components/circles/NoteComposer.tsx
    - packages/web/src/components/circles/NoteCard.tsx
    - packages/web/src/pages/circles/CircleWorkspace.tsx
    - packages/web/src/pages/circles/MyCircles.tsx
  modified:
    - packages/web/src/components/challenges/TeamCompositionCard.tsx
    - packages/web/src/components/challenges/ManageChallengeRow.tsx
    - packages/web/src/App.tsx
    - packages/web/src/components/layout/Navbar.tsx
decisions:
  - "[04-02]: NoteComposer uploads files sequentially with per-file progress counter before posting note — simpler than parallel upload, sufficient at pilot scale"
  - "[04-02]: NoteCard fetches download URL lazily on button click via getDownloadUrl then window.open — matches 04-01 decision against eager presigned URLs"
  - "[04-02]: CircleWorkspaceShell Add Member button is a stub — full implementation in Plan 03"
  - "[04-02]: TeamCompositionCard shows Form Circle button only after team is selected (local state toggle) — avoids accidental circle creation"
metrics:
  duration: "6 minutes"
  completed: "2026-03-13"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 4 Plan 02: Circle Formation Flow and Workspace UI Summary

Circle formation modal wired to TeamCompositionCard, CircleWorkspace with pinned brief and notes feed, My Circles list, and full API client with TanStack Query hooks — all backed by the 04-01 circle backend.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | API client, hooks, Circle formation modal, TeamCompositionCard wiring | 2d8393d | circles.ts, useCircles.ts, CircleFormationModal.tsx, TeamCompositionCard.tsx, ManageChallengeRow.tsx |
| 2 | CircleWorkspace page, notes feed, My Circles list, and routing | da7aaf8 | CircleWorkspace.tsx, MyCircles.tsx, CircleWorkspaceShell.tsx, NoteComposer.tsx, NoteCard.tsx, App.tsx, Navbar.tsx |

## What Was Built

### API Client (`packages/web/src/api/circles.ts`)
- 13 functions covering all circle endpoints: create, list, workspace, members, notes, attachment upload URL, download URL, social channel, resolution CRUD, and rating
- Follows existing `apiClient` fetch wrapper pattern from challenges.ts
- 151 lines

### TanStack Query Hooks (`packages/web/src/hooks/useCircles.ts`)
- 11 hooks: `useMyCircles`, `useCircleWorkspace`, `useCircleNotes` (infinite query with cursor), `useCreateCircle`, `usePostNote`, `useAddMember`, `useSetSocialChannel`, `useSubmitResolution`, `useUpdateResolution`, `useRateResolution`, `useResolution`
- Cache invalidation wired correctly per hook
- 133 lines

### Circle Formation Modal (`packages/web/src/components/circles/CircleFormationModal.tsx`)
- Modal overlay with backdrop blur
- Displays selected member list with avatar initials
- Calls `useCreateCircle` mutation, navigates to `/circles/:id` on success
- Shows API error messages (e.g., member at max circles limit)
- Cancel button closes without creating

### TeamCompositionCard + ManageChallengeRow Updates
- `challengeId: string` added to TeamCompositionCardProps
- "Form Circle" button appears below "Selected" state
- CircleFormationModal rendered inline with correct `challengeId` and member data
- ManageChallengeRow passes `challenge.id` as `challengeId` prop

### My Circles (`packages/web/src/pages/circles/MyCircles.tsx`)
- Responsive grid (1/2/3 cols)
- CircleListItem cards: challenge title, status badge, member count, created date
- Empty state with link to `/challenges`
- Loading spinner, error state

### NoteCard (`packages/web/src/components/circles/NoteCard.tsx`)
- Author avatar + name, relative timestamp (pure date math, no library)
- Note body with whitespace-pre-wrap
- Attachment list: filename, file size, download button (lazy URL fetch + window.open)

### NoteComposer (`packages/web/src/components/circles/NoteComposer.tsx`)
- Textarea for note body
- react-dropzone accepts PDF/DOCX/TXT/JPEG/PNG/WEBP, max 10 MB per file, max 5 files
- Sequential upload: getAttachmentUrl -> PUT to presigned S3 URL -> collect s3Key
- Progress counter "Uploading 2/3..." during upload
- Submit disabled while uploading or body is empty; clears form on success

### CircleWorkspaceShell (`packages/web/src/components/circles/CircleWorkspaceShell.tsx`)
- Pinned challenge brief: Radix Collapsible, expanded by default, shows brief, domains, skills, type badge
- Member list: horizontal pill row, member count badge, CM gets "Add Member" stub button
- Social channel: shows platform link or "No social channel set yet" placeholder
- Notes feed: `useCircleNotes` infinite query, intersection observer for load-more, newest first
- NoteComposer sticky at bottom

### CircleWorkspace Page (`packages/web/src/pages/circles/CircleWorkspace.tsx`)
- Reads `circleId` from `useParams`
- 403-specific error message: "You're not a member of this Circle."
- Generic error for other failures

### Routing + Navigation
- `/circles` -> MyCircles (ProtectedRoute)
- `/circles/:id` -> CircleWorkspace (ProtectedRoute)
- "My Circles" link added to Navbar for authenticated users

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` passes in `packages/web` with zero errors
- All 5 must-have artifacts created, all exceed minimum line counts
- All 5 key_links satisfied:
  - `circles.ts` calls `/api/circles` endpoints via apiClient
  - `CircleFormationModal.tsx` uses `useCreateCircle` from useCircles.ts
  - `NoteComposer.tsx` calls `getAttachmentUrl` + `usePostNote`
  - `App.tsx` routes `/circles/:id` to `CircleWorkspace.tsx`
  - `ManageChallengeRow.tsx` passes `challengeId={challenge.id}` to `TeamCompositionCard`

## Self-Check: PASSED

Files verified present:
- packages/web/src/api/circles.ts — FOUND
- packages/web/src/hooks/useCircles.ts — FOUND
- packages/web/src/components/circles/CircleFormationModal.tsx — FOUND
- packages/web/src/components/circles/CircleWorkspaceShell.tsx — FOUND
- packages/web/src/components/circles/NoteComposer.tsx — FOUND
- packages/web/src/components/circles/NoteCard.tsx — FOUND
- packages/web/src/pages/circles/CircleWorkspace.tsx — FOUND
- packages/web/src/pages/circles/MyCircles.tsx — FOUND

Commits verified:
- 2d8393d — FOUND (Task 1)
- da7aaf8 — FOUND (Task 2)

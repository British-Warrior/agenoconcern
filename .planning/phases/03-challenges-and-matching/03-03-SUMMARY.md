---
phase: 03
plan: 03
subsystem: challenges-cm-admin
tags: [react, cm-admin, challenge-form, team-compositions, role-toggle, dev-tools]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [cm-challenge-admin, team-composition-review, dev-role-switcher]
  affects: [04-01]
tech_stack:
  added: []
  patterns:
    - Integrated UI with role-based tab injection (CM/admin see extra tabs, contributors see nothing)
    - Dev-only POST /api/auth/dev-role endpoint re-issues JWT with new role for local testing
    - domain as string[] with checkbox list + custom input; jsonb @> operator for feed filtering
    - Soft validation amber prompt for circleSize outside 2–10 (no hard limit)
    - CM challenges derived by filtering feed data by createdBy — no separate endpoint
    - "Select this team" is local state only — Circle formation deferred to Phase 4
key_files:
  created:
    - packages/web/src/components/challenges/ChallengeForm.tsx
    - packages/web/src/components/challenges/TeamCompositionCard.tsx
    - packages/web/src/components/challenges/ManageChallengeRow.tsx
    - packages/web/src/pages/challenges/ChallengeManage.tsx
    - packages/web/src/components/dev/DevRoleSwitcher.tsx
    - packages/web/src/vite-env.d.ts
  modified:
    - packages/web/src/pages/challenges/ChallengeFeed.tsx
    - packages/web/src/hooks/useChallenges.ts
    - packages/web/src/api/challenges.ts
    - packages/shared/src/schemas/challenge.ts
    - packages/shared/src/types/challenge.ts
    - packages/server/src/db/schema.ts
    - packages/server/src/routes/challenges.ts
    - packages/server/src/routes/auth.ts
    - packages/server/src/services/matching.service.ts
    - packages/web/src/components/challenges/ChallengeRow.tsx
    - packages/web/src/components/layout/AppShell.tsx
    - packages/web/src/pages/Dashboard.tsx
decisions:
  - Dev role switcher added (POST /api/auth/dev-role + floating UI widget) for testing all roles in dev mode without separate accounts
  - domain changed from single string to string[] — checkbox list + custom input, jsonb storage, matching checks ANY overlap with contributor domains
  - circleSize validation softened — no hard min/max limits, amber "are you sure?" prompt for values outside 2–10
  - updateChallengeSchema extended with status field to allow close/archive flow (was missing from 03-01 schema)
  - CM challenges fetched by filtering feed results by createdBy — no separate endpoint needed at pilot scale
  - "Select this team" on TeamCompositionCard is local state only — Circle formation is Phase 4
metrics:
  duration: ~60 min
  completed: 2026-03-12
---

# Phase 3 Plan 3: Frontend — CM Admin (Create Form, Manage Tab, Team Compositions, Role Toggle)

One-liner: CM challenge creation form with multi-domain/skill-tag inputs, manage tab with edit-lock enforcement and close/archive, team composition cards with coverage/diversity/balance scores, and integrated Browse/Manage tab injection for CM and admin roles.

## What Was Built

### Task 1: CM challenge form, manage tab, and team composition review

**API client additions** (`packages/web/src/api/challenges.ts`):
- `createChallenge(data)` → POST /api/challenges
- `updateChallenge(id, data)` → PUT /api/challenges/:id
- `getTeamSuggestions(challengeId)` → GET /api/challenges/:id/team-suggestions
- Fixed `ChallengeInterestDetail` type to match actual server response shape (was mismatched from 03-01 contract)

**Hook additions** (`packages/web/src/hooks/useChallenges.ts`):
- `useCreateChallenge()`: useMutation calling createChallenge, invalidates `["challenges","feed"]` on success
- `useUpdateChallenge(id)`: useMutation calling updateChallenge, invalidates feed and challenge detail
- `useTeamSuggestions(challengeId)`: useQuery enabled only when challengeId is provided
- `useMyChallenges()`: useQuery fetching challenges from feed filtered by `createdBy=me`

**ChallengeForm** (`packages/web/src/components/challenges/ChallengeForm.tsx`):
- Title (5–200 chars), description (20–5000), brief (10–500)
- Domain: checkbox list from DOMAIN_TAXONOMY + custom "Other" text input; stores as string[]
- Skills: tag chip input — type + Enter to add pill, X to remove, max 20 skills
- Type: Paid / Free radio group
- Deadline: optional native HTML date input
- Circle size: number input with amber soft-warning prompt ("Are you sure? Recommended circle size is 2–10") for values outside that range
- Full client-side validation matching createChallengeSchema
- Edit lock: all fields disabled with message when `isEditing && interestCount > 0`
- Submit label: "Post Challenge" (create) / "Save Changes" (edit)

**ManageChallengeRow** (`packages/web/src/components/challenges/ManageChallengeRow.tsx`):
- Status badge, interest count, created date
- Actions: open + 0 interests → Edit + Close; open + interests → View Interests + View Team Suggestions + Close (Edit disabled); closed/archived → read-only
- Expandable interested contributor names list
- Inline team suggestions slot (renders TeamCompositionCards when fetched)

**TeamCompositionCard** (`packages/web/src/components/challenges/TeamCompositionCard.tsx`):
- Composition label: "Composition 1: Best Match" / "Composition 2: Most Diverse" / "Composition 3: Balanced"
- Contributor list with skill tag pills
- Coverage / diversity / balance scores as progress bars with numeric display
- "Select this team" button — visual highlight with checkmark, local state only (Phase 4 handles actual Circle formation)

**ChallengeManage page** (`packages/web/src/pages/challenges/ChallengeManage.tsx`):
- "Post a Challenge" button at top → inline expand shows ChallengeForm
- Lists CM's challenges via ManageChallengeRow
- Empty state: "You haven't posted any challenges yet."

### Task 2: Integrate CM controls into challenges page with role toggle

**ChallengeFeed.tsx** updated:
- Reads role from `useAuth`
- CM and admin roles see a Browse / Manage tab bar at top of page (horizontal tabs, underline active indicator)
- "Browse" tab is default active and shows the existing feed
- "Manage" tab renders ChallengeManage component
- Floating "Post a Challenge" button in Browse tab (bottom-right) for CMs — switches to Manage tab with form open
- Regular contributors: no tab bar, just the feed unchanged

### Post-verification additions

**Dev role switcher** (`packages/server/src/routes/auth.ts` + `packages/web/src/components/dev/DevRoleSwitcher.tsx`):
- Dev-only POST /api/auth/dev-role endpoint: verifies `NODE_ENV !== 'production'`, switches contributor's role in DB, re-issues JWT cookie
- Floating pill widget at bottom-right: "DEV [Contributor] [CM] [Admin]" — active role highlighted
- Mounted in AppShell, visible only in dev mode (`import.meta.env.DEV`)
- `packages/web/src/vite-env.d.ts` added for correct `import.meta.env` TypeScript typing

**Multi-domain challenges** (`503261b`):
- `domain` changed from `string` to `string[]` across entire stack: shared types, Zod schema, DB schema (jsonb column), matching service, API routes, form, and ChallengeRow display
- Matching service: domain score awarded if ANY challenge domain overlaps contributor's domains
- Feed filter: uses jsonb `@>` operator for domain filtering
- ChallengeRow: displays domain values as pill badges

**Circle size soft validation** (`503261b`, `5b27ded`):
- Removed hard min=2/max=10 constraints from form
- Amber "are you sure?" confirmation prompt shown when value is outside 2–10
- Prompt includes question text to make intent explicit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] updateChallengeSchema missing status field**
- **Found during:** Task 1 — implementing close/archive flow in ManageChallengeRow
- **Issue:** `updateChallengeSchema` in shared was a plain partial of createChallengeSchema, which doesn't include the status field. Closing a challenge requires sending `{ status: "closed" }` to PUT /api/challenges/:id, but schema validation would reject it.
- **Fix:** Extended updateChallengeSchema to include optional status (challengeStatusEnum values)
- **Files modified:** `packages/shared/src/schemas/challenge.ts`
- **Commit:** cd151aa

**2. [Rule 1 - Bug] ChallengeInterestDetail type mismatch**
- **Found during:** Task 1 — wiring up useMyChallenges and interest display
- **Issue:** ChallengeInterestDetail type in the API client didn't match the actual server response shape established in 03-01
- **Fix:** Updated type definition to match server contract
- **Files modified:** `packages/web/src/api/challenges.ts`
- **Commit:** cd151aa

### Enhancements (human-requested post-verification)

**3. Dev role switcher** (post-checkpoint, user-requested)
- Full-stack dev tool: server endpoint + floating UI widget for switching roles without multiple accounts
- Added `vite-env.d.ts` for import.meta.env typing
- Dashboard updated with /challenges navigation link
- Commits: 7202ac4

**4. Multi-domain challenges** (post-checkpoint, user-requested)
- Breaking change to domain field: single string → string[] across full stack
- Required updates in 7 files spanning shared, server, and web packages
- Commit: 503261b

**5. Circle size soft validation** (post-checkpoint, user-requested)
- Removed hard numeric constraints, replaced with amber confirmation prompt
- Follow-up fix to add question text to prompt
- Commits: 503261b, 5b27ded

## Verification

- TypeScript: passed (zero errors) before and after post-verification changes
- Human-verified: checkpoint APPROVED by user after visual walkthrough of CM create flow, manage tab, team suggestions, and role-based tab injection
- All CHAL-06, MTCH-02, PLAT-07 requirements met
- Phase 3 all 3 plans complete

## Self-Check: PASSED

All created files exist. Task commits cd151aa, 9c4595d, 7202ac4, 503261b, 5b27ded confirmed in git log.

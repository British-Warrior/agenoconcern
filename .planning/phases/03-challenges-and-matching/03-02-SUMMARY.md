---
phase: 03
plan: 02
subsystem: challenges-frontend
tags: [react, radix-ui, tanstack-query, infinite-scroll, accordion, filters]
dependency_graph:
  requires: [03-01]
  provides: [challenge-feed-ui, interest-expression-ui]
  affects: [03-03]
tech_stack:
  added:
    - "@radix-ui/react-accordion": Accordion.Root/Item/Header/Trigger/Content
    - "@radix-ui/react-collapsible": Collapsible.Root/Trigger/Content for sub-sections
  patterns:
    - useInfiniteQuery v5 with initialPageParam and getNextPageParam
    - Native IntersectionObserver for infinite scroll (200px rootMargin)
    - Client-side timeline filter applied after server-paginated data is flattened
    - Radix accordion content animated via --radix-accordion-content-height CSS custom property
key_files:
  created:
    - packages/web/src/api/challenges.ts
    - packages/web/src/hooks/useChallenges.ts
    - packages/web/src/components/challenges/ChallengeSubSection.tsx
    - packages/web/src/components/challenges/ChallengeRow.tsx
    - packages/web/src/components/challenges/ChallengeAccordion.tsx
    - packages/web/src/components/challenges/FilterBar.tsx
    - packages/web/src/components/challenges/InterestButton.tsx
    - packages/web/src/pages/challenges/ChallengeFeed.tsx
  modified:
    - packages/web/src/App.tsx
    - packages/web/src/styles/app.css
    - packages/web/package.json
    - pnpm-lock.yaml
decisions:
  - Timeline filter (any/this-week/this-month) is client-side — API only accepts domain and type; filtering by deadline is applied after data is fetched and flattened
  - InterestButton maintains withdrawn re-expression as same toggle endpoint — UI differentiates by showing "Express Interest Again" copy for withdrawn state
  - slideDown/slideUp keyframes registered in app.css @theme block alongside --animate-* custom properties for Tailwind v4 utility classes
metrics:
  duration: 30 min
  completed: 2026-03-12
---

# Phase 3 Plan 2: Frontend — Challenge Feed with Accordion Layout, Filters, Infinite Scroll, Interest Expression

One-liner: Radix accordion challenge feed with domain/type/timeline filters, native IntersectionObserver infinite scroll, and a stateful InterestButton supporting note input, withdrawal, 429 cooldown, and soft capacity warnings.

## What Was Built

### Task 1: API client, hooks, and challenge feed page

**API client** (`packages/web/src/api/challenges.ts`):
- `getFeed(params)` → `GET /api/challenges` with query params for domain/type/page
- `getChallenge(id)` → `GET /api/challenges/:id`
- `toggleInterest(challengeId, note?)` → `POST /api/challenges/:id/interest`
- `getInterests(challengeId)` → `GET /api/challenges/:id/interests`
- Uses `apiClient` from `../api/client.ts` for auth, refresh, and JSON handling

**Hooks** (`packages/web/src/hooks/useChallenges.ts`):
- `useChallengeFeed(filters)`: `useInfiniteQuery` v5 with `initialPageParam: 1`, `getNextPageParam` returns `lastPage.page + 1` when `hasMore`, else `undefined`
- `useInterestToggle(challengeId)`: `useMutation` calling `toggleInterest`, invalidates `["challenges","feed"]` and `["challenges",challengeId,"interests"]` on success
- `useChallengeInterests(challengeId)`: `useQuery` enabled only when `challengeId` is provided

**ChallengeSubSection** (`components/challenges/ChallengeSubSection.tsx`):
- Radix `Collapsible.Root` with `defaultOpen` prop (defaults true)
- Full-width trigger with label + rotating chevron (`group-data-[state=open]:rotate-180`)
- Content with border-top separator and padding

**ChallengeRow** (`components/challenges/ChallengeRow.tsx`):
- Radix `Accordion.Item` keyed by `challenge.id`
- Collapsed: title + type badge (amber pill for Paid, neutral border pill for Free) + expand chevron
- Expanded: 4 `ChallengeSubSection`s — Description (defaultOpen), Skills & Domain (closed), Deadline & Timeline (closed), Interest (defaultOpen with InterestButton)
- Accordion.Content uses `data-[state=open]:animate-slideDown` / `data-[state=closed]:animate-slideUp`

**ChallengeAccordion** (`components/challenges/ChallengeAccordion.tsx`):
- `Accordion.Root type="multiple"` — multiple items can be open simultaneously
- Maps challenges, keyed by `challenge.id`
- `flex flex-col gap-2` layout

**FilterBar** (`components/challenges/FilterBar.tsx`):
- Domain: `<select>` with all `DOMAIN_TAXONOMY` options (imported from `@agenoconcern/shared`)
- Type: pill chips — All / Paid / Free; active gets `bg-accent-600 text-white`
- Timeline: pill chips — Any / This Week / This Month; same active style
- "Clear all" text link shown only when any filter is active
- Mobile: `overflow-x-auto` + `flex-nowrap` on pill row for horizontal scroll

**ChallengeFeed page** (`pages/challenges/ChallengeFeed.tsx`):
- `useState` for filter state, passed to `useChallengeFeed`
- Flattens pages: `data?.pages.flatMap(p => p.challenges) ?? []`
- Client-side timeline filter applied over flattened results
- Native `IntersectionObserver` on sentinel `<div ref={sentinelRef}>` with `rootMargin: "200px"` — calls `fetchNextPage` when intersecting and `hasNextPage` and not `isFetchingNextPage`
- Loading spinner during initial load and page fetches
- Empty states: "No challenges match your filters" + "Clear filters" action when filters active; "No challenges posted yet" when no filters
- "You've seen all challenges" message when `!hasNextPage && challenges.length > 0`

**App.tsx**: `/challenges` route added inside `ProtectedRoute`, imports `ChallengeFeed`

**app.css**: `@keyframes slideDown/slideUp` using `--radix-accordion-content-height` variable; `--animate-slideDown` and `--animate-slideUp` custom properties in `@theme` block

### Task 2: Interest button with note modal, withdrawal, and capacity warning

**InterestButton** (`components/challenges/InterestButton.tsx`):
- Props: `challengeId`, `myInterest ({ status, note } | null)`, `interestCount`, `maxCircles?`

**State machine:**

| State | UI |
|-------|-----|
| No interest | "I'm Interested" button |
| Note form open | Textarea (max 500, placeholder) + "Express Interest" / "Skip note" / "Cancel" |
| Active | Filled checkmark "Interested" button (disabled) + "Withdraw" secondary button + note display |
| Withdrawn | "You previously withdrew interest" + "Express Interest Again" outline button |
| 429 cooldown | "Re-express interest in X hours" amber message, button disabled |
| Loading | Spinner on all async actions, buttons disabled |

- **Soft capacity warning**: after successful interest expression, if `result.activeInterestCount >= result.maxCircles` shows amber inline warning
- **Error display**: inline error message on any non-429 failure
- **Interest count**: "{N} people interested" / "1 person interested" / "No one has expressed interest yet"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useFilterState` hook doesn't exist in codebase**
- **Found during:** Task 1, writing ChallengeFeed.tsx
- **Issue:** Plan referenced `useFilterState` hook but no such hook exists in the project
- **Fix:** Replaced with standard `useState` inline — same functionality without unnecessary abstraction
- **Files modified:** `packages/web/src/pages/challenges/ChallengeFeed.tsx`

## Verification

- TypeScript: `pnpm --filter @agenoconcern/web exec tsc --noEmit` — PASS (zero errors)
- Build: `pnpm --filter @agenoconcern/web run build` — PASS (496 kB bundle, 968ms)
- `/challenges` route registered in `App.tsx` inside `ProtectedRoute`
- FilterBar, ChallengeAccordion, ChallengeRow, ChallengeSubSection, InterestButton all compile cleanly

## Self-Check: PASSED

All created files confirmed present. Task commits 654f6e1 and 58fc308 confirmed in git log.

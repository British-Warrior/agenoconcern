# Phase 3: Challenges and Matching - Research

**Researched:** 2026-03-12
**Domain:** Challenge feed, accordion UI, interest expression, matching algorithm, CM admin
**Confidence:** HIGH (stack verified against official docs and Context7; patterns derived from existing codebase conventions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Challenge feed layout**
- Compact accordion pattern: each challenge shows **title** and **type (Paid/Free)** in collapsed state
- Expanding a challenge reveals detail sub-sections, each also expandable so the contributor can choose what to read
- Expanded sub-sections: Full description & brief, Skills & domain tags, Deadline & timeline, Interest count
- Filtering approach: Claude's discretion (filter bar vs panel based on number of filters needed)
- Card layout style: Claude's discretion (optimised for the accordion pattern)

**Matching and recommendations**
- Match score based on **skills and domain fit** — availability is NOT a factor
- Match scores are **internal only** — not shown to contributors, used for feed ordering and recommendations
- **All challenges visible to everyone** — matching is never exclusionary
- Recommendations surfacing: Claude's discretion (separate section vs relevance-ordered feed)

**Interest expression**
- Single-tap interest button with **optional note** — contributor can add a brief message
- **Withdrawal allowed with 24-hour cooldown** before re-expressing interest (prevents spam)
- **Soft capacity warning** — no hard limit on interests, but nudge when exceeding maxCircles
- **Conditional name visibility** — if you've previously been in a Circle with someone who's also interested, you can see their name. Otherwise just the count. Names always visible to the CM.

**Community manager admin**
- **Structured form** for challenge creation: title, description, domain, skills needed, type (paid/free), deadline, Circle size
- **Integrated UI with role toggle** — CMs see extra controls (create button, manage tab). No separate /admin section.
- **Algorithm suggests 2-3 team compositions** ranked by balance — CM picks one or manually tweaks
- **Edit until interest, then close only** — CM can edit freely until someone expresses interest. After that, can only close/archive.

### Claude's Discretion
- Feed card visual design and information density
- Filter UI pattern (bar vs drawer)
- Recommendations presentation (separate section vs inline ordering)
- Team composition algorithm weighting and ranking criteria
- Empty state designs

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 3 has four distinct technical domains: (1) the challenge data model and CRUD API, (2) the challenge feed UI with accordion layout, filtering, and sort/relevance ordering, (3) the interest expression system with cooldown enforcement and conditional name visibility, and (4) the matching algorithm that scores contributors against challenges for feed ordering and CM team composition suggestions.

The existing stack — Express, Drizzle ORM, PostgreSQL, React 19, TanStack Query v5, Tailwind v4 — handles all of this without new framework additions. The two new library installs are `@radix-ui/react-accordion` (accessible collapsible challenge rows) and `@radix-ui/react-collapsible` (nested sub-sections within each challenge). Both are zero-style headless primitives, consistent with the project's pattern of building its own visual layer over headless behaviour.

The matching algorithm is pure server-side TypeScript arithmetic — no ML library required. Score a contributor by counting intersecting skills and domains against each challenge's requirements, normalise to 0–100, and use that score as the ORDER BY weight for feed queries. For team composition, generate candidate sets by ranking contributors by score for a challenge, then vary compositions to maximise skill diversity across the 2–3 suggested teams.

**Primary recommendation:** Build the challenge feed as a Radix Accordion (outer) with nested Radix Collapsibles (inner sub-sections). Store challenges in a dedicated `challenges` table with `jsonb` skill/domain arrays. Score matching in a TypeScript service function, store scores on the `challenge_interests` table row, and use a weighted ORDER BY in the feed query rather than a separate recommendations endpoint.

---

## Standard Stack

### Core (no new framework additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@radix-ui/react-accordion` | ^1.x | Accessible accordion for challenge feed rows | WAI-ARIA compliant, keyboard navigation, data-state for CSS, zero styles (matches project pattern) |
| `@radix-ui/react-collapsible` | ^1.x | Nested sub-sections within expanded challenge | Follows Disclosure WAI-ARIA pattern; pairs naturally with Accordion parent |
| `drizzle-orm` | ^0.38.x | Already installed — new `challenges` and `challenge_interests` tables | Consistent with project ORM |
| `@tanstack/react-query` | ^5.x | Already installed — `useInfiniteQuery` for feed pagination, `useMutation` for interest toggle | v5 `useInfiniteQuery` with `initialPageParam` / `getNextPageParam` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.x | Already installed — challenge creation schema, interest note schema | Validate all API inputs |
| Intersection Observer API | browser native | Trigger `fetchNextPage` when sentinel div enters viewport | Infinite scroll sentinel pattern — no library needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@radix-ui/react-accordion` | Custom `<details>`/`<summary>` HTML | `<details>` has poor animation support, no `data-state` hooks, inconsistent browser styling |
| `@radix-ui/react-accordion` | Headless UI Disclosure | Headless UI requires Tailwind CSS v3 assumptions; Radix works cleanly with Tailwind v4 CSS-first approach |
| `useInfiniteQuery` pagination | Single page load all | All challenges visible to everyone — count could grow. Cursor pagination future-proofs the feed. |
| Pure score ORDER BY | Separate "Recommended" endpoint | A single query with weighted sort avoids duplicating challenges and keeps code simpler |

**Installation:**
```bash
# packages/web
npm install @radix-ui/react-accordion @radix-ui/react-collapsible
```
No new server-side dependencies.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/server/src/
├── routes/
│   ├── auth.ts                       # existing
│   ├── onboarding.ts                 # existing
│   └── challenges.ts                 # NEW: /api/challenges/* routes
├── services/
│   ├── auth.service.ts               # existing
│   ├── cv.service.ts                 # existing
│   ├── llm.service.ts                # existing
│   ├── s3.service.ts                 # existing
│   ├── stripe.service.ts             # existing
│   └── matching.service.ts           # NEW: scoring algorithm, team composition
├── db/
│   ├── schema.ts                     # extend with challenges, challenge_interests
│   └── migrations/                   # generated by drizzle-kit
└── config/
    └── env.ts                        # no new vars required

packages/web/src/
├── pages/
│   └── challenges/
│       ├── ChallengeFeed.tsx          # NEW: feed page, filter controls, accordion list
│       └── ChallengeManage.tsx        # NEW: CM manage tab (create form, team review)
├── components/
│   └── challenges/
│       ├── ChallengeAccordion.tsx     # NEW: Radix Accordion wrapper
│       ├── ChallengeRow.tsx           # NEW: single accordion item (collapsed + expanded)
│       ├── ChallengeSubSection.tsx    # NEW: Radix Collapsible for sub-sections
│       ├── InterestButton.tsx         # NEW: single-tap interest toggle with note modal
│       ├── FilterBar.tsx              # NEW: filter chips / filter drawer
│       └── TeamCompositionCard.tsx    # NEW: CM team composition review
├── api/
│   └── challenges.ts                 # NEW: API calls for challenge endpoints
└── hooks/
    └── useChallenges.ts              # NEW: useInfiniteQuery feed hook, useMutation for interest
```

### Pattern 1: Radix Accordion for Challenge Feed

**What:** The outer challenge feed is a Radix `Accordion.Root` with `type="multiple"` (multiple challenges can be open simultaneously). Each challenge is an `Accordion.Item`.
**When to use:** All challenge list rendering.

```tsx
// Source: https://www.radix-ui.com/primitives/docs/components/accordion
// packages/web/src/components/challenges/ChallengeAccordion.tsx
import * as Accordion from "@radix-ui/react-accordion";

export function ChallengeAccordion({ challenges }: { challenges: Challenge[] }) {
  return (
    <Accordion.Root type="multiple" className="flex flex-col gap-2">
      {challenges.map((challenge) => (
        <Accordion.Item
          key={challenge.id}
          value={challenge.id}
          className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] overflow-hidden"
        >
          <Accordion.Header asChild>
            <h3>
              <Accordion.Trigger className="
                w-full flex items-center justify-between
                min-h-[3rem] px-6 py-4
                text-left font-semibold text-neutral-900
                hover:bg-neutral-50 transition-colors
                data-[state=open]:bg-neutral-50
              ">
                <span>{challenge.title}</span>
                <span className={`
                  text-sm font-medium px-2 py-0.5 rounded-full
                  ${challenge.type === "paid"
                    ? "bg-accent-400/20 text-accent-600"
                    : "bg-neutral-100 text-neutral-600"}
                `}>
                  {challenge.type === "paid" ? "Paid" : "Free"}
                </span>
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
            <ChallengeDetails challenge={challenge} />
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
```

### Pattern 2: Radix Collapsible for Challenge Sub-Sections

**What:** Inside the expanded challenge row, each sub-section (description, skills, timeline, interest count) is a `Collapsible.Root`. Each defaults to `defaultOpen` so users immediately see all content but can collapse sections they don't need.
**When to use:** Detail sub-sections within an expanded challenge.

```tsx
// Source: https://www.radix-ui.com/primitives/docs/components/collapsible
// packages/web/src/components/challenges/ChallengeSubSection.tsx
import * as Collapsible from "@radix-ui/react-collapsible";

interface Props {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ChallengeSubSection({ label, defaultOpen = true, children }: Props) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className="border-t border-neutral-100">
      <Collapsible.Trigger className="
        w-full flex items-center justify-between
        px-6 py-3 text-sm font-medium text-neutral-700
        hover:text-neutral-900 transition-colors
      ">
        {label}
        <ChevronIcon className="transition-transform data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Content className="px-6 pb-4">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
```

### Pattern 3: Challenge Data Model (Drizzle Schema Extension)

**What:** New `challenges` table and `challenge_interests` table added to the existing `schema.ts`.

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
// packages/server/src/db/schema.ts (additions)
import { integer, date } from "drizzle-orm/pg-core";

export const challengeTypeEnum = pgEnum("challenge_type", ["paid", "free"]);

export const challengeStatusEnum = pgEnum("challenge_status", [
  "draft",      // CM created, not yet posted
  "open",       // Accepting interest
  "closed",     // No longer accepting interest
  "archived",   // Hidden from feed
]);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  brief: text("brief").notNull(),           // short excerpt for expanded header
  domain: text("domain").notNull(),         // from DOMAIN_TAXONOMY
  skillsNeeded: jsonb("skills_needed").$type<string[]>().notNull().$default(() => []),
  type: challengeTypeEnum("type").notNull(),
  deadline: date("deadline", { mode: "date" }),
  circleSize: smallint("circle_size").notNull().default(4),
  status: challengeStatusEnum("status").notNull().default("draft"),
  interestCount: integer("interest_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const challengeInterestStatusEnum = pgEnum("challenge_interest_status", [
  "active",
  "withdrawn",
]);

export const challengeInterests = pgTable("challenge_interests", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id")
    .notNull()
    .references(() => challenges.id, { onDelete: "cascade" }),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  status: challengeInterestStatusEnum("status").notNull().default("active"),
  note: text("note"),                      // optional note from contributor
  matchScore: smallint("match_score"),     // 0-100, computed at time of interest
  lastWithdrawnAt: timestamp("last_withdrawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Unique constraint:** Add a unique constraint on `(challengeId, contributorId)` to enforce one interest record per contributor per challenge (upsert pattern for withdrawal/re-interest).

### Pattern 4: Feed Query with Relevance Ordering

**What:** A single query returns challenges ordered by match score (logged-in contributor's skills × challenge skills overlap). All challenges are returned — matching controls ORDER BY, not visibility.
**When to use:** The challenge feed endpoint.

```typescript
// packages/server/src/routes/challenges.ts
import { sql, desc, and, eq, arrayOverlaps } from "drizzle-orm";

router.get("/", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;
  const { domain, type, status = "open", page = "1", limit = "20" } = req.query;

  // Fetch contributor skills for scoring
  const [profile] = await db
    .select({ skills: contributorProfiles.skills, domainPreferences: contributorProfiles.domainPreferences })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  const contributorSkills: string[] = profile?.skills ?? [];
  const contributorDomains: string[] = profile?.domainPreferences ?? [];

  // Build WHERE conditions
  const conditions = [eq(challenges.status, "open")];
  if (domain) conditions.push(eq(challenges.domain, domain as string));
  if (type) conditions.push(eq(challenges.type, type as "paid" | "free"));

  const offset = (Number(page) - 1) * Number(limit);

  const rows = await db
    .select()
    .from(challenges)
    .where(and(...conditions))
    .orderBy(
      // Score: sum of skill matches + domain bonus
      // Use sql`` for PostgreSQL JSONB array intersection size
      desc(
        sql<number>`(
          SELECT COUNT(*) FROM jsonb_array_elements_text(${challenges.skillsNeeded}) s
          WHERE s = ANY(${sql.raw(`ARRAY[${contributorSkills.map(s => `'${s.replace(/'/g, "''")}'`).join(",")}]`)})
        ) + CASE WHEN ${challenges.domain} = ANY(${sql.raw(
          `ARRAY[${contributorDomains.map(d => `'${d.replace(/'/g, "''")}'`).join(",")}]`
        )}) THEN 3 ELSE 0 END`
      ),
      desc(challenges.createdAt),
    )
    .limit(Number(limit))
    .offset(offset);

  res.json({ challenges: rows, page: Number(page), hasMore: rows.length === Number(limit) });
});
```

**IMPORTANT:** The raw SQL approach above is fragile. Use parameterised queries. See Pitfall 3.

### Pattern 4b: Safer Scoring with a Service Function

**What:** Compute match score in TypeScript, fetch all open challenges, sort in application code. Acceptable at MVP scale (dozens–low hundreds of challenges). Switch to DB-side scoring when challenge count grows.

```typescript
// packages/server/src/services/matching.service.ts

export function scoreContributorForChallenge(
  contributorSkills: string[],
  contributorDomains: string[],
  challengeSkills: string[],
  challengeDomain: string,
): number {
  const skillSet = new Set(contributorSkills.map(s => s.toLowerCase()));
  const skillMatches = challengeSkills.filter(s => skillSet.has(s.toLowerCase())).length;
  const skillScore = challengeSkills.length > 0
    ? Math.round((skillMatches / challengeSkills.length) * 70)
    : 0;

  const domainMatch = contributorDomains
    .map(d => d.toLowerCase())
    .includes(challengeDomain.toLowerCase()) ? 30 : 0;

  return Math.min(100, skillScore + domainMatch);
}

export interface TeamComposition {
  contributors: Array<{ id: string; name: string; skills: string[]; score: number }>;
  diversityScore: number; // 0-100: how many unique skills are covered
  coverageScore: number;  // 0-100: % of required skills covered
  balanceScore: number;   // combined rank metric
}

export function suggestTeamCompositions(
  candidates: Array<{ id: string; name: string; skills: string[]; score: number }>,
  challengeSkills: string[],
  circleSize: number,
): TeamComposition[] {
  // Top-scoring composition
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const topTeam = sorted.slice(0, circleSize);

  // Diverse composition: greedy coverage maximisation
  const diverseTeam = greedyCoverageTeam(candidates, challengeSkills, circleSize);

  // Balanced composition: mix of high-score + high-diversity
  const balancedTeam = balancedMix(sorted, diverseTeam, circleSize);

  return [
    scoreComposition(topTeam, challengeSkills),
    scoreComposition(diverseTeam, challengeSkills),
    scoreComposition(balancedTeam, challengeSkills),
  ].filter((comp, i, arr) =>
    // Deduplicate if top and diverse overlap heavily
    i === 0 || !compositionsMatch(comp, arr[i - 1])
  );
}

function greedyCoverageTeam(
  candidates: Array<{ id: string; name: string; skills: string[]; score: number }>,
  required: string[],
  size: number,
) {
  const covered = new Set<string>();
  const team: typeof candidates = [];
  const remaining = [...candidates];

  while (team.length < size && remaining.length > 0) {
    // Pick the candidate who adds the most uncovered skills
    remaining.sort((a, b) => {
      const aNew = a.skills.filter(s => !covered.has(s.toLowerCase())).length;
      const bNew = b.skills.filter(s => !covered.has(s.toLowerCase())).length;
      return bNew - aNew || b.score - a.score;
    });
    const pick = remaining.shift()!;
    team.push(pick);
    pick.skills.forEach(s => covered.add(s.toLowerCase()));
  }
  return team;
}

function balancedMix(
  sorted: typeof [] extends Array<infer T> ? T[] : never[],
  diverse: typeof [] extends Array<infer T> ? T[] : never[],
  size: number,
) {
  // Take top half from score-sorted, fill remainder from diverse non-overlap
  const half = Math.ceil(size / 2);
  const topHalf = (sorted as { id: string; name: string; skills: string[]; score: number }[]).slice(0, half);
  const topIds = new Set(topHalf.map(c => c.id));
  const diverseFill = (diverse as { id: string; name: string; skills: string[]; score: number }[])
    .filter(c => !topIds.has(c.id))
    .slice(0, size - half);
  return [...topHalf, ...diverseFill];
}

function scoreComposition(
  team: Array<{ id: string; name: string; skills: string[]; score: number }>,
  required: string[],
): TeamComposition {
  const allSkills = new Set(team.flatMap(m => m.skills.map(s => s.toLowerCase())));
  const requiredLower = required.map(s => s.toLowerCase());
  const covered = requiredLower.filter(s => allSkills.has(s)).length;
  const coverageScore = required.length > 0 ? Math.round((covered / required.length) * 100) : 100;
  const diversityScore = Math.round((allSkills.size / Math.max(allSkills.size, required.length)) * 100);
  const avgMatchScore = team.reduce((s, m) => s + m.score, 0) / team.length;
  const balanceScore = Math.round((coverageScore * 0.5) + (diversityScore * 0.3) + (avgMatchScore * 0.2));

  return { contributors: team, diversityScore, coverageScore, balanceScore };
}

function compositionsMatch(a: TeamComposition, b: TeamComposition): boolean {
  const aIds = new Set(a.contributors.map(c => c.id));
  const bIds = new Set(b.contributors.map(c => c.id));
  const overlap = [...aIds].filter(id => bIds.has(id)).length;
  return overlap === aIds.size; // completely identical
}
```

### Pattern 5: Interest Toggle with 24-Hour Cooldown

**What:** The interest endpoint upserts a `challenge_interests` row. Withdrawal sets `status = "withdrawn"` and `lastWithdrawnAt = now()`. Re-expression checks `now() - lastWithdrawnAt > 24h`.
**When to use:** POST `/api/challenges/:id/interest`.

```typescript
// packages/server/src/routes/challenges.ts
router.post("/:id/interest", authMiddleware, async (req, res) => {
  const challengeId = req.params.id;
  const contributorId = req.contributor!.id;
  const { note } = req.body as { note?: string };
  const db = getDb();

  // Check for existing interest record
  const [existing] = await db
    .select()
    .from(challengeInterests)
    .where(
      and(
        eq(challengeInterests.challengeId, challengeId),
        eq(challengeInterests.contributorId, contributorId),
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === "active") {
      // Withdraw: set status + timestamp
      await db
        .update(challengeInterests)
        .set({ status: "withdrawn", lastWithdrawnAt: new Date(), updatedAt: new Date() })
        .where(eq(challengeInterests.id, existing.id));

      // Decrement counter
      await db
        .update(challenges)
        .set({ interestCount: sql`${challenges.interestCount} - 1`, updatedAt: new Date() })
        .where(eq(challenges.id, challengeId));

      res.json({ status: "withdrawn" });
      return;
    }

    // Re-express: enforce 24-hour cooldown
    if (existing.lastWithdrawnAt) {
      const hoursSince = (Date.now() - existing.lastWithdrawnAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSince);
        res.status(429).json({
          error: `You can re-express interest after ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.`,
          cooldownRemainingHours: hoursRemaining,
        });
        return;
      }
    }

    // Re-activate
    await db
      .update(challengeInterests)
      .set({ status: "active", note: note ?? existing.note, updatedAt: new Date() })
      .where(eq(challengeInterests.id, existing.id));

    await db
      .update(challenges)
      .set({ interestCount: sql`${challenges.interestCount} + 1`, updatedAt: new Date() })
      .where(eq(challenges.id, challengeId));

    res.json({ status: "active" });
    return;
  }

  // First-time interest: compute match score
  const [profile] = await db
    .select({ skills: contributorProfiles.skills, domainPreferences: contributorProfiles.domainPreferences })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  const [challenge] = await db
    .select({ skillsNeeded: challenges.skillsNeeded, domain: challenges.domain })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const matchScore = scoreContributorForChallenge(
    profile?.skills ?? [],
    profile?.domainPreferences ?? [],
    challenge.skillsNeeded ?? [],
    challenge.domain,
  );

  await db.insert(challengeInterests).values({
    challengeId,
    contributorId,
    note: note ?? null,
    matchScore,
    status: "active",
  });

  await db
    .update(challenges)
    .set({ interestCount: sql`${challenges.interestCount} + 1`, updatedAt: new Date() })
    .where(eq(challenges.id, challengeId));

  res.status(201).json({ status: "active", matchScore });
});
```

### Pattern 6: Conditional Name Visibility

**What:** When returning interested contributors for a challenge (visible to CM always, visible to contributors only if they share a prior Circle), filter name fields based on relationship lookup.
**When to use:** GET `/api/challenges/:id/interests` endpoint.

```typescript
// packages/server/src/routes/challenges.ts
// (Note: circles table does not yet exist — Phase 4 delivers it.
//  For Phase 3: return names if same contributor, otherwise return count only.
//  Phase 4 will add the circle membership join.)

router.get("/:id/interests", authMiddleware, async (req, res) => {
  const challengeId = req.params.id;
  const contributorId = req.contributor!.id;
  const isCM = req.contributor!.role === "community_manager" || req.contributor!.role === "admin";
  const db = getDb();

  const interests = await db
    .select({
      id: challengeInterests.id,
      contributorId: challengeInterests.contributorId,
      note: challengeInterests.note,
      createdAt: challengeInterests.createdAt,
      name: contributors.name,
    })
    .from(challengeInterests)
    .innerJoin(contributors, eq(challengeInterests.contributorId, contributors.id))
    .where(
      and(
        eq(challengeInterests.challengeId, challengeId),
        eq(challengeInterests.status, "active"),
      )
    );

  // Phase 3: contributor can see own name + count. CM sees all names.
  // Phase 4 will add: contributor can also see names of prior circle members.
  const response = interests.map(i => ({
    id: i.id,
    name: isCM || i.contributorId === contributorId ? i.name : null,
    note: isCM || i.contributorId === contributorId ? i.note : null,
    isYou: i.contributorId === contributorId,
    createdAt: i.createdAt,
  }));

  res.json({ interests: response, count: interests.length });
});
```

### Pattern 7: useInfiniteQuery for Challenge Feed (Frontend)

**What:** TanStack Query v5 `useInfiniteQuery` fetches paginated challenge feed. Intersection Observer triggers `fetchNextPage` when a sentinel element at the bottom enters the viewport.
**When to use:** ChallengeFeed page.

```typescript
// Source: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
// packages/web/src/hooks/useChallenges.ts
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { challengesApi } from "../api/challenges.js";

export type ChallengeFilters = {
  domain?: string;
  type?: "paid" | "free";
};

export function useChallengeFeed(filters: ChallengeFilters = {}) {
  return useInfiniteQuery({
    queryKey: ["challenges", "feed", filters],
    queryFn: ({ pageParam }) => challengesApi.getFeed({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useInterestToggle(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ note }: { note?: string }) =>
      challengesApi.toggleInterest(challengeId, note),
    onSuccess: () => {
      // Invalidate feed so interest count updates
      queryClient.invalidateQueries({ queryKey: ["challenges", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["challenges", challengeId, "interests"] });
    },
  });
}
```

### Pattern 8: Filter Bar (Recommended for Claude's Discretion)

**Recommendation:** Use a horizontal filter chip bar (not a drawer) — there are only 3 filter dimensions (domain, type, timeline). A drawer is warranted when there are 6+ filters. Chip bar pattern:
- One row of pill-shaped chips: Domain dropdown, Type (All/Paid/Free), Timeline (Any/This week/This month)
- Active filters show with accent-600 background
- "Clear all" text link appears only when filters are active

This is the pattern Pencil & Paper UX research identifies as appropriate for 3–5 filter dimensions. On mobile, the chip bar scrolls horizontally rather than wrapping.

### Pattern 9: CM Challenge Creation Form

**What:** A structured form gated behind `requireRole("community_manager")` middleware. CMs access it via a "Post a challenge" button and a "Manage" tab visible only when `contributor.role === "community_manager"`.

```typescript
// packages/server/src/routes/challenges.ts
import { requireRole } from "../middleware/auth.js";

router.post(
  "/",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const result = createChallengeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    // insert into challenges table with status = "draft" or "open"
  }
);
```

### Anti-Patterns to Avoid

- **Showing match score to contributors:** Match scores are internal only. Never include `matchScore` in the challenge feed response payload. Return it only in the CM team composition view.
- **Hard-coding interest limit:** Never block interest expression. The soft warning is a frontend nudge only — no server-side enforcement.
- **Filtering out challenges by score:** All challenges must be visible to all contributors. Score affects ORDER BY only.
- **Blocking on skill arrays for filtering:** The `arrayOverlaps` operator works on PostgreSQL native arrays. The `skills` column in `contributorProfiles` is stored as `jsonb`. For "skill match" filtering in the feed, compute in TypeScript rather than raw SQL to avoid the JSONB binding bug documented in Drizzle issue #4935.
- **Race condition on interestCount:** Use `sql\`${challenges.interestCount} + 1\`` (SQL increment) not "read current count, add 1, write back." Concurrent requests will corrupt the count with the read-modify-write pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible accordion expand/collapse | Custom `<div>` with onClick + CSS | `@radix-ui/react-accordion` | WAI-ARIA roles, keyboard nav (arrow keys, Enter, Space), data-state CSS hooks — all handled |
| Nested collapsible sub-sections | Custom state + CSS | `@radix-ui/react-collapsible` | Same as above; pairs with Accordion parent without conflict |
| Infinite scroll sentinel | Manual scroll event listener | `IntersectionObserver` (browser native) | Scroll listeners are expensive; IO is off-main-thread, precise, zero dependencies |
| Interest cooldown enforcement | Redis TTL / custom timer | PostgreSQL `lastWithdrawnAt` timestamp comparison | Already have Postgres; timestamp arithmetic is one line; no new infrastructure |
| interestCount increment | Read-modify-write | `sql\`${challenges.interestCount} + 1\`` | Concurrency-safe; single round-trip |

**Key insight:** The accordion + collapsible pattern looks simple but accessibility is non-trivial — focus management, ARIA expanded state, keyboard navigation between items. Radix handles all of this; custom `<div>`s won't.

---

## Common Pitfalls

### Pitfall 1: Drizzle JSONB Array Operator Bug (issue #4935)

**What goes wrong:** Using `arrayContains` or `arrayOverlaps` on a `jsonb().$type<string[]>()` column in prepared statements causes Drizzle to bind the value as a native array instead of a formatted JSON string, producing a PostgreSQL cast error.
**Why it happens:** Drizzle's JSONB parameter binding for `@>` operator has an open bug (2025) when the column is declared as `jsonb` rather than a native `text[]` array.
**How to avoid:** For the `skillsNeeded` column, declare it as `text("skills_needed").array()` (native PostgreSQL array, not JSONB) OR perform skill filtering/scoring in TypeScript after fetching all open challenges. For MVP scale (dozens of challenges), in-TypeScript scoring is simpler and sidesteps the bug entirely.
**Warning signs:** `error: invalid input syntax for type json` or `invalid cast` in Drizzle queries using `arrayOverlaps` on jsonb columns.

### Pitfall 2: Interest Count Desync

**What goes wrong:** The `challenges.interestCount` counter drifts from the actual count of active `challenge_interests` rows.
**Why it happens:** If any path creates/deletes interests without updating the counter (e.g., a bulk admin operation, a failed transaction), the counter corrupts.
**How to avoid:** Always use `sql\`${challenges.interestCount} + 1\`` / `- 1` atomically in the same DB call that updates the interest row. For correctness in edge cases, also provide a `recalculateCount()` utility that does `SELECT COUNT(*) FROM challenge_interests WHERE challenge_id = $1 AND status = 'active'`.
**Warning signs:** Feed shows "3 interested" but the CM sees 5 names.

### Pitfall 3: Raw SQL Parameter Injection in Scoring Query

**What goes wrong:** Building `ARRAY['skill1','skill2']` literals from user-supplied skill arrays by string interpolation creates SQL injection risk.
**Why it happens:** Temptation to push scoring into the ORDER BY clause with raw SQL.
**How to avoid:** Keep match scoring in TypeScript (Pattern 4b) at MVP scale. If moving scoring to SQL is needed for performance, use Drizzle's `sql` template with `${param}` placeholders — never string concatenation of user data.
**Warning signs:** Skills from user profiles contain SQL-special characters (apostrophes in skill names like "Children's Education").

### Pitfall 4: Accordion Re-mounting on Filter Change

**What goes wrong:** When filters change, the entire Accordion.Root re-renders, collapsing all open challenge rows. The user loses their reading position.
**Why it happens:** React re-creates keyed children when the `challenges` array reference changes.
**How to avoid:** Key `Accordion.Item` components by `challenge.id` (stable ID, not array index). TanStack Query's data object reference is stable between refetches when the data hasn't changed — but filter changes produce a new query key and new data. Accept that filter changes collapse the accordion (this is fine UX — the user is changing their view).
**Warning signs:** User expands a challenge, applies a filter, challenge collapses unexpectedly when it should still be visible in results.

### Pitfall 5: CM Edit Lock After First Interest

**What goes wrong:** CM can still edit challenge details after interest has been expressed.
**Why it happens:** No server-side guard on PUT `/api/challenges/:id`.
**How to avoid:** In the update handler, check `challenge.interestCount > 0`. If true, reject all fields except `status` (close/archive). Return a clear error: `"Challenge cannot be edited after interest has been expressed. You can close or archive it."`.
**Warning signs:** CM edits skills needed after contributors have expressed interest — corrupts match scores.

### Pitfall 6: Soft Capacity Warning Missing from Interest API

**What goes wrong:** The frontend shows the capacity warning, but the server never communicates how many active interests the contributor already has, so the client can't make the right decision.
**Why it happens:** Frontend doesn't have access to the user's current interest count.
**How to avoid:** The interest toggle response (201) should include `{ status: "active", activeInterestCount: N, maxCircles: M }` so the frontend can conditionally show "You're interested in N challenges — sure you have capacity?" when `N >= M`.
**Warning signs:** The soft warning never appears because the frontend has no data to trigger it.

---

## Code Examples

### Creating a Challenge (CM route)

```typescript
// packages/server/src/routes/challenges.ts
import { z } from "zod";
import { DOMAIN_TAXONOMY } from "@agenoconcern/shared";

const createChallengeSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  brief: z.string().min(10).max(500),
  domain: z.enum(DOMAIN_TAXONOMY),
  skillsNeeded: z.array(z.string().max(100)).max(20),
  type: z.enum(["paid", "free"]),
  deadline: z.string().date().optional(),    // ISO date string "YYYY-MM-DD"
  circleSize: z.number().int().min(2).max(10).default(4),
});

router.post(
  "/",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const result = createChallengeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }
    const db = getDb();
    const [created] = await db
      .insert(challenges)
      .values({
        ...result.data,
        deadline: result.data.deadline ? new Date(result.data.deadline) : null,
        createdBy: req.contributor!.id,
        status: "open",
      })
      .returning();
    res.status(201).json(created);
  }
);
```

### Drizzle arrayOverlaps on Native Array Column (safe approach)

```typescript
// If skillsNeeded is declared as text array (NOT jsonb):
// skillsNeeded: text("skills_needed").array().notNull().default([])
import { arrayOverlaps } from "drizzle-orm";

// Filter challenges that require ANY of the contributor's skills
const matching = await db
  .select()
  .from(challenges)
  .where(arrayOverlaps(challenges.skillsNeeded, contributorSkills));
// Source: https://orm.drizzle.team/docs/operators
```

### Intersection Observer Infinite Scroll Sentinel

```tsx
// packages/web/src/pages/challenges/ChallengeFeed.tsx
import { useEffect, useRef } from "react";
import { useChallengeFeed } from "../../hooks/useChallenges.js";

export function ChallengeFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useChallengeFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },  // trigger 200px before the sentinel enters view
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const allChallenges = data?.pages.flatMap(p => p.challenges) ?? [];

  return (
    <div>
      <ChallengeAccordion challenges={allChallenges} />
      <div ref={sentinelRef} className="h-4" aria-hidden />
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}
```

### Challenge Shared Types (shared package additions)

```typescript
// packages/shared/src/types/challenge.ts  (NEW FILE)
export type ChallengeType = "paid" | "free";
export type ChallengeStatus = "draft" | "open" | "closed" | "archived";
export type ChallengeInterestStatus = "active" | "withdrawn";

export interface Challenge {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  brief: string;
  domain: string;
  skillsNeeded: string[];
  type: ChallengeType;
  deadline: Date | null;
  circleSize: number;
  status: ChallengeStatus;
  interestCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeInterest {
  id: string;
  challengeId: string;
  contributorId: string;
  status: ChallengeInterestStatus;
  note: string | null;
  matchScore: number | null;
  lastWithdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestVisibility {
  id: string;
  name: string | null;   // null if contributor has no prior circle relationship
  note: string | null;
  isYou: boolean;
  createdAt: Date;
}

export interface TeamCompositionSuggestion {
  contributors: Array<{ id: string; name: string; skills: string[]; score: number }>;
  diversityScore: number;
  coverageScore: number;
  balanceScore: number;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom `<details>/<summary>` accordion | Radix UI `@radix-ui/react-accordion` | ~2022 (Radix v1 stable) | Full WAI-ARIA keyboard nav, data-state hooks, animation variables out of the box |
| Scroll event listener for infinite scroll | `IntersectionObserver` | 2019 (broad support) | Off-main-thread, no scroll thrashing, battery-friendly |
| Bull (Redis queue) for scoring jobs | Synchronous TypeScript function | N/A for MVP scale | Match scoring is pure CPU arithmetic — 200ms per batch of 100 challenges; no queue warranted |
| JSONB `@>` for array queries | PostgreSQL native `text[]` array with `&&` | Always best practice | `text[]` + `arrayOverlaps` avoids the Drizzle JSONB binding bug; GIN index works on both |

**Deprecated/outdated:**
- Storing skills as comma-separated text: Do not store skills as a single text string. Use PostgreSQL native array `text[]` for queryable, indexable skill lists.
- React Context for feed state: Do not use Context for server state (feed list, filters). TanStack Query manages this with proper caching and invalidation.

---

## Open Questions

1. **`skillsNeeded` column type: jsonb vs text array**
   - What we know: Drizzle has an open bug with JSONB `@>` binding in prepared statements (issue #4935). PostgreSQL native `text[]` with `arrayOverlaps` is clean and supported.
   - What's unclear: Whether the existing `contributorProfiles.skills` column should also be migrated from jsonb to text[] for consistency.
   - Recommendation: Declare `skillsNeeded` on the `challenges` table as `text("skills_needed").array()` (native array). Leave `contributorProfiles.skills` as jsonb (already shipped) and perform skill overlap in TypeScript.

2. **Conditional name visibility — prior Circle membership**
   - What we know: Phase 3 decision says "if you've previously been in a Circle with someone who's also interested, you can see their name." Circles don't exist until Phase 4.
   - What's unclear: Whether to stub the relationship check in Phase 3 or defer name visibility entirely.
   - Recommendation: Phase 3 returns names only to the contributor themselves and to CMs. Add the Circle-membership join in Phase 4 when the `circles` table exists. Document the stub in code comments.

3. **Feed sort: relevance-ordered vs separate "Recommended" section**
   - What we know: Claude's discretion.
   - Recommendation: Use a single relevance-ordered feed (not a separate section). A separate section creates duplicate entries and complicates the query. The top 3–5 naturally-sorted results function as the recommendation. If the contributor has no profile skills yet (profile incomplete), fall back to `ORDER BY createdAt DESC`.

4. **Challenge `interestCount` accuracy vs computed count**
   - What we know: A denormalised counter is fast for display but can drift.
   - Recommendation: Keep the denormalised counter for feed display performance. Add a `GET /api/challenges/:id` detail endpoint that computes the live count from `challenge_interests` for the CM view.

---

## Sources

### Primary (HIGH confidence)
- Radix UI Accordion official docs — installation, API, data-state attributes, keyboard navigation
  https://www.radix-ui.com/primitives/docs/components/accordion
- Radix UI Collapsible official docs — Root/Trigger/Content API, animation CSS variables
  https://www.radix-ui.com/primitives/docs/components/collapsible
- TanStack Query v5 Infinite Queries official docs — `useInfiniteQuery`, `initialPageParam`, `getNextPageParam`, `data.pages`
  https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
- Drizzle ORM Operators official docs — `arrayOverlaps`, `arrayContains`, `arrayContained`, `and`, `eq`
  https://orm.drizzle.team/docs/operators
- Drizzle ORM PostgreSQL column types — `jsonb`, `text().array()`, `pgEnum`, `date`, `integer`, `smallint`
  https://orm.drizzle.team/docs/column-types/pg
- Drizzle ORM sql`` operator docs — parameterised raw SQL fragments, `sql.join()`, `.mapWith()`
  https://orm.drizzle.team/docs/sql
- Existing codebase schema, routes, components — conventions for auth middleware, requireRole, Zod validation, apiClient, Tailwind v4 CSS vars
  `/c/Users/kirk_/agenoconcern/packages/`

### Secondary (MEDIUM confidence)
- Drizzle ORM GitHub issue #4935 — JSONB `@>` operator parameter binding bug in prepared statements (2025, open)
  https://github.com/drizzle-team/drizzle-orm/issues/4935
- Pencil & Paper UX research — Filter bar vs drawer decision criteria (3–5 filters = chip bar; 6+ = drawer)
  https://www.pencilandpaper.io/articles/ux-pattern-analysis-mobile-filters
- Synergistic team composition paper — greedy coverage + diversity scoring approach
  https://www.sciencedirect.com/science/article/abs/pii/S0950705119302746

### Tertiary (LOW confidence — validate before use)
- PostgreSQL `ts_rank` for skills matching: WebSearch result suggests FTS tsvector ranking is possible. NOT recommended for this use case — skills are structured tags, not prose. Array intersection scoring in TypeScript is more predictable and debuggable.
- Interest cooldown via Redis TTL: Multiple sources suggest Redis for rate limiting. NOT required here — PostgreSQL timestamp comparison is sufficient and adds no new infrastructure.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Radix UI docs fetched directly; TanStack Query docs fetched directly; Drizzle operators confirmed via docs
- Architecture: HIGH — patterns derived from existing codebase conventions (authMiddleware, requireRole, Zod schemas, apiClient)
- Matching algorithm: MEDIUM — scoring logic is custom TypeScript; weighting values (70% skill, 30% domain) are reasonable but should be tuned with real data
- Pitfalls: HIGH for items 1, 2, 5 (verified against official sources/open issues); MEDIUM for items 3, 4, 6 (well-established patterns)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (Radix UI and TanStack Query are stable; Drizzle JSONB bug may be fixed sooner — check issue #4935 before implementation)

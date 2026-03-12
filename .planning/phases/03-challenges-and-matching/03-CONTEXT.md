# Phase 3: Challenges and Matching - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Contributors can discover relevant challenges and express interest; community managers can post challenges and review suggested team compositions. This phase delivers the challenge feed, filtering, profile-based recommendations, interest expression, and CM challenge management with algorithmic team suggestions.

</domain>

<decisions>
## Implementation Decisions

### Challenge feed layout
- Compact accordion pattern: each challenge shows **title** and **type (Paid/Free)** in collapsed state
- Expanding a challenge reveals detail sub-sections, each also expandable so the contributor can choose what to read
- Expanded sub-sections: Full description & brief, Skills & domain tags, Deadline & timeline, Interest count
- Filtering approach: Claude's discretion (filter bar vs panel based on number of filters needed)
- Card layout style: Claude's discretion (optimised for the accordion pattern)

### Matching and recommendations
- Match score based on **skills and domain fit** — availability is NOT a factor (contributors may adjust availability for the right challenge)
- Match scores are **internal only** — not shown to contributors, used for feed ordering and recommendations
- **All challenges visible to everyone** — matching is never exclusionary. Contributors may bring cross-functional insights or have skills not captured during onboarding
- Recommendations surfacing: Claude's discretion (separate section vs relevance-ordered feed)

### Interest expression
- Single-tap interest button with **optional note** — contributor can add a brief message about why they're interested
- **Withdrawal allowed with 24-hour cooldown** before re-expressing interest (prevents spam)
- **Soft capacity warning** — no hard limit on interests, but nudge when exceeding maxCircles (e.g. "You're interested in 5 challenges — sure you have capacity?")
- **Conditional name visibility** — if you've previously been in a Circle with someone who's also interested, you can see their name. Otherwise just the count. Names always visible to the community manager.

### Community manager admin
- **Structured form** for challenge creation: title, description, domain, skills needed, type (paid/free), deadline, Circle size
- **Integrated UI with role toggle** — CMs use the same interface as contributors but see extra controls (create button, manage tab). No separate /admin section.
- **Algorithm suggests 2-3 team compositions** ranked by balance — CM picks one or manually tweaks
- **Edit until interest, then close only** — CM can edit challenge details freely until someone expresses interest. After that, can only close/archive.

### Claude's Discretion
- Feed card visual design and information density
- Filter UI pattern (bar vs drawer)
- Recommendations presentation (separate section vs inline ordering)
- Team composition algorithm weighting and ranking criteria
- Empty state designs

</decisions>

<specifics>
## Specific Ideas

- "People may be able to contribute as a cross-functional team, their insights could lead to a lightbulb moment" — matching should encourage diversity, not gatekeep
- Conditional name visibility creates a sense of community for people who've worked together before
- The accordion pattern keeps the feed scannable while letting interested contributors drill into details at their own pace

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-challenges-and-matching*
*Context gathered: 2026-03-12*

# Phase 12: Institution Data Foundation - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

CM can manage institution records (CRUD, activate/deactivate) and assign contributors to institutions. Institution landing pages display live aggregated stats instead of static JSONB. This phase does NOT include webhook integration, attention flags, or PDF reports — those are Phases 13-15.

</domain>

<decisions>
## Implementation Decisions

### CM Institution Management UI
- Navigation: institution management lives under the existing admin section, not as a new top-level nav item
- List view: card-based grid (not compact table) — each card shows name, city, active status badge, contributor count, and live stats
- Create/edit: inline editing on the card — click to expand and edit in place, no separate form page
- Activate/deactivate: toggle switch with confirmation dialog ("Deactivate [name]? This hides the kiosk page") before applying

### Contributor Assignment Workflow
- **IMPORTANT: Many-to-many model** — contributors can belong to multiple institutions (junction table, NOT a single FK on contributors). This overrides the research recommendation of a single institution_id FK.
- Assignment direction: from the contributor profile — CM selects institutions via a multi-select picker (checkboxes/tags showing all institutions)
- Institution card contributor list: shows name + platform status + last activity date (last check-in, last circle note, etc.)
- Unassigned contributors: shown in a separate "Unassigned" group in the CM view — not hidden

### Live Stats Presentation
- Stats on public landing page: same metrics currently in statsJson (contributor count, challenges, hours) but derived from live queries
- Empty state: hide the stats section entirely until at least 1 contributor is assigned — don't show zeros
- CM cards also show live stats — same metrics visible on both the public page and the CM institution cards
- statsJson column: keep as a cache/fallback layer, don't drop it — populate periodically; preserves landing page data during transition

### Data Model & Migration
- Junction table (`contributor_institutions` or similar) replaces the single FK approach — many-to-many relationship
- Challenges and hours are global to the contributor, not institution-scoped — stats aggregate all contributor activity regardless of which institution(s) they're linked to
- Per-institution counting: if a contributor is linked to 2 institutions, each institution counts them in its stats (reflects actual engagement at each venue)
- Existing seeded statsJson data: preserved as initial values until live data supersedes them — landing pages don't go blank during transition

### Claude's Discretion
- Junction table schema design (column names, indexes, constraints)
- Card component layout and spacing details
- Multi-select picker implementation pattern
- Live aggregation query approach (view vs inline query vs scheduled refresh)
- "Last activity" resolution (which activity types to check, how far back)

</decisions>

<specifics>
## Specific Ideas

- The many-to-many model is a deliberate choice — Kirk envisions contributors volunteering across multiple venues (libraries, community centres, WI branches) in the East Midlands pilot
- Stats should feel like the current landing page but "alive" — same visual presentation, just real data
- The "Unassigned" group gives the CM a natural onboarding queue to work through when new contributors sign up

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-institution-data-foundation*
*Context gathered: 2026-03-22*

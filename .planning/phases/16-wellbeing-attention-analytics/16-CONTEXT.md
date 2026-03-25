# Phase 16: Wellbeing & Attention Analytics - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

The CM dashboard and PDF impact report surface anonymised wellbeing bands and attention trend data derived from real contributor metrics. This phase extends the existing PDF report (Phase 15) and attention dashboard (Phase 14) — no new pages or routes beyond what's needed for trend data.

</domain>

<decisions>
## Implementation Decisions

### Wellbeing band presentation
- Text label only in the PDF stats section — "Wellbeing: Typical" — no coloured badge or dedicated section
- Use plain language "Wellbeing Band" — do NOT name the instrument (no "SWEMWBS" branding) to avoid licence compliance friction
- Band labels: Low, Typical, High

### Privacy threshold & consent
- Consent collected at the next wellbeing check-in — add an `institutional_reporting` consent checkbox to the existing check-in flow (natural touchpoint, not intrusive)
- No in-app notice about institutional reporting — mention in privacy policy only
- Existing contributors are NOT grandfathered — they must opt in at their next check-in before their data is included

### Trend indicator design
- Trend indicator appears inline next to the flag count — "3 active flags ↑ Increasing"
- Direction communicated as arrow + word: "↑ Increasing" / "→ Stable" / "↓ Decreasing"

### Trend chart behavior
- Chart type, time window, access pattern, and sparse data handling all at Claude's discretion

### Claude's Discretion
- Wellbeing suppression message wording (when below threshold) — pick the clearest approach
- k-anonymity threshold value (k=5 vs k=10) — pick based on research findings and ICO guidance
- Band colour scheme for text label — pick appropriate colours
- Opt-out data handling (immediate exclusion vs next report cycle) — pick the safest approach
- Trend tone/framing (neutral vs positive for "Decreasing") — pick appropriate framing
- Trend comparison time period (4 vs 8 weeks) — pick based on expected flag volume
- Trend chart access pattern (new tab vs click-through) — pick best UX
- Trend chart time window (12 vs 26 weeks) — pick appropriate
- Sparse data handling in chart — pick best approach
- Chart type (bar vs line) — pick most appropriate for discrete event data

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants simplicity: text labels, inline indicators, minimal visual chrome.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-wellbeing-attention-analytics*
*Context gathered: 2026-03-25*

# Phase 2: Onboarding and Profiles - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Contributors upload a CV (file or photo/scan) and get an auto-generated, editable profile in under 5 minutes with zero form-filling. Includes availability/preferences collection and Stripe Connect onboarding trigger. The entire flow should feel affirming — reinforcing that the contributor's experience is valuable.

</domain>

<decisions>
## Implementation Decisions

### CV Upload Experience
- Accept PDF, DOCX, TXT files **plus** JPG/PNG images of paper CVs (OCR path)
- OCR extracts text from photo/scan before LLM parsing — covers contributors without electronic copies
- Drag-and-drop vs simple picker: Claude's discretion
- LLM makes best-guess for all fields — no flagging of uncertain fields, user corrects during review
- Upload UI: drag-and-drop + file picker (Claude's discretion on exact approach)

### Profile Review Flow
- Parsed profile includes core fields (name, roles/titles, skills, qualifications, sectors, years of experience) **plus auto-generated professional summary**
- Layout and flow structure: Claude's discretion (cards vs form, single page vs wizard)
- After confirmation: **affirming tone with personalised messaging** based on parsed CV data — the LLM highlights what makes their experience valuable (e.g., "30 years of engineering leadership — that's exactly what communities need")
- This is the first "you're in" moment — treat it as a self-affirmation opportunity

### Availability & Preferences
- Timing of collection: Claude's discretion (during onboarding flow or post-confirmation)
- **Max Circles: self-set with sensible default (e.g., 3), contributor can change anytime, platform enforces their stated limit** — protective, not paternalistic
- Domain preferences: **fixed taxonomy with free-text "Other" option** — validates specialised expertise and provides data for taxonomy expansion
- Communication preferences: **channel (email/phone) + frequency (immediate, daily, weekly)**
- Mentoring willingness: captured during preferences

### Stripe Connect
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

</decisions>

<specifics>
## Specific Ideas

- The entire onboarding should produce "feelgood moments" — affirming the contributor's value at every step
- Domain "Other" free-text is valuable signal: if many people type the same thing, add it to the taxonomy
- The profile confirmation message should be personalised by the LLM based on what it found in the CV
- Contributors without electronic CVs can photograph/scan paper copies — OCR handles the rest

</specifics>

<deferred>
## Deferred Ideas

- **Conversational profile building** — Instead of CV upload, a guided conversation asking about life experiences. Powerful for self-affirmation. Significant new onboarding path — its own phase.
- **Adaptive Circle limits via cognitive assessment** — iThink (Kirk's existing non-diagnostic app) could inform Circle limits based on cognitive profile. Needs Phase 6 wellbeing/GDPR infrastructure first.
- **iThink integration** — Existing app could bridge the gap for cognitive-informed personalisation without building assessment into ANC.
- **Wellbeing-aware AI model** — Factor emotional state into all platform interactions. Broader capability tied to Phase 6.

</deferred>

---

*Phase: 02-onboarding-and-profiles*
*Context gathered: 2026-03-11*

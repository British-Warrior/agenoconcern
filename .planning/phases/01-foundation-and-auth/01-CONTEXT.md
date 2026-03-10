# Phase 1: Foundation and Auth - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Monorepo scaffolding, PostgreSQL schema (contributor + auth tables), MCP server shell with 14 tool stubs, auth system (email/password + Google OAuth + LinkedIn OAuth + phone/SMS), React/Vite web UI shell with auth flows, WCAG AAA design system, GDPR consent foundation. This is the foundation everything else builds on.

</domain>

<decisions>
## Implementation Decisions

### Auth Flow Experience
- Landing page with sign-up CTA: brief pitch + "Upload your CV and start contributing" button, login link secondary
- OAuth as primary signup path: "Continue with Google" / "Continue with LinkedIn" as main buttons, email/password form below as alternative
- **Three identity paths:** email/password, OAuth (Google/LinkedIn), phone number (SMS) — maximum accessibility for people who may not have email or internet presence
- **CM-assisted onboarding:** Community manager can create accounts on behalf of contributors at partner locations (libraries, community centres)
- **Kiosk mode:** Simplified self-service screen at partner locations with large buttons and guided steps
- **No-CV onboarding path:** For contributors without electronic CVs — scan/photograph paper CV (OCR + LLM extraction) OR guided conversation that builds profile from verbal answers
- **Platform-generated accounts:** For contributors with no email, CM creates username/password and provides printed card with login details

### Design System and Brand
- **VANTAGE-ready shell:** UI built as a thin visual layer that VANTAGE can hook into mid-pilot. Semantic HTML, full ARIA, accessible defaults. Does NOT replicate VANTAGE's adaptive detection.
- **Voice-first future:** Visual UI should be minimal, clean, and focused on displaying content/responses in large readable blocks — not dense interactive forms. When VANTAGE arrives, the visual layer becomes supplementary to voice.
- **Colour palette:** Claude's discretion — must hit WCAG AAA (7:1 contrast), be colour-blind safe (never rely on colour alone — every distinction also has shape, icon, or text label), match the defiant/warm tone
- **Typography:** Claude's discretion — must be highly legible at large sizes (18px+ base), designed for a voice-first future where text is read aloud and highlighted
- **Component style:** Claude's discretion — appropriate density for 50-75+ demographic, generous touch targets, VANTAGE-hookable

### Monorepo and Project Structure
- **Monorepo:** Single repo with MCP server and web UI — shared types, one git history, easy cross-references
- **Package manager:** Claude's discretion (pnpm recommended for monorepo workspaces)
- **Type sharing:** Claude's discretion on whether to use shared types package or duplicate

### Database Schema
- **Progressive schema:** Only contributor + auth tables in Phase 1. Additional entities added as each phase needs them.
- **JSONB vs normalised:** Claude's discretion — research suggests JSONB for genuinely variable data (parsed_profile, preferences, payment config), normalised for everything else
- **Circle members:** Claude's discretion — research recommends junction table over JSON array for referential integrity

### Claude's Discretion
- Colour palette selection (within WCAG AAA + colour-blind safe constraints)
- Typography selection (within legibility + voice-first constraints)
- Component density and spacing
- Package manager choice
- Type sharing architecture
- JSONB vs normalised column boundaries
- Junction table vs JSON array for circle members
- Session management approach (JWT vs cookie sessions)
- Password hashing algorithm

</decisions>

<specifics>
## Specific Ideas

- **VANTAGE philosophy:** "Makes zero assumptions about what you can do." The web UI doesn't need to replicate VANTAGE's adaptive detection, but should be built so VANTAGE can hook in seamlessly. VANTAGE opens every input channel (mic, camera, blink, eye tracking) and adapts to whichever the user responds to first.
- **VANTAGE modes:** Standard, Assist (slower/clearer/larger), Companion (warmer tone), Signal (single-action scanning for users who can only blink/look/tap)
- **Automatic fallback cascade:** voice → sound → hand signs → blink → gaze. The web UI should not fight this when VANTAGE arrives.
- **Auth without barriers:** VANTAGE uses voice biometrics (iListen) → WebAuthn fallback. The web UI auth should be designed to be replaceable by this.
- **Institutional embedding is real:** People will use this at libraries and community centres. The UI must work on shared/public computers, possibly with a CM sitting alongside.
- **Printed login cards:** For contributors without email, community manager creates account and prints login details on a card.

</specifics>

<deferred>
## Deferred Ideas

- Full VANTAGE integration — Phase 5 (roadmap) / mid-pilot overlay
- Voice biometrics (iListen) auth — when VANTAGE connects
- Kiosk mode at partner locations — could be Phase 1 stretch or separate phase
- Paper CV scanning with OCR — Phase 2 onboarding (extends CV upload path)
- Guided conversation profile building (no-CV path) — Phase 2 onboarding or VANTAGE integration

</deferred>

---

*Phase: 01-foundation-and-auth*
*Context gathered: 2026-03-10*

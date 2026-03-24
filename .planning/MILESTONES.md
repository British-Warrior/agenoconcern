# Milestones: Indomitable Unity

## v1.2 Institution Management & iThink Integration (Shipped: 2026-03-24)

**Delivered:** CM operational tools for institution-contributor management with live impact data, iThink webhook integration for proactive contributor support, attention flag dashboard, and on-demand branded PDF impact reports.

**Phases completed:** 12-15 (10 plans total)

**Key accomplishments:**

- Institution data foundation — many-to-many contributor-institution junction table, CM CRUD interface, live stats aggregation replacing static JSONB
- iThink webhook integration — HMAC-SHA256 signed receiver with replay protection, idempotency, Zod validation, cross-institution spoofing check, and dual-secret rotation
- CM attention dashboard — institution-scoped flagged contributor list, resolve-with-notes dialog, signal history view
- PDF impact report — pdfkit-generated branded PDF streamed to browser (no S3), with Inter font, date range filtering, and empty-state guard

**Stats:**

- ~18 commits for feature work
- 22,113 lines of TypeScript/TSX/CSS (total codebase)
- 4 phases, 10 plans, 24 requirements
- 2 days from 2026-03-23 to 2026-03-24

**Git range:** `ef806ea` → `68e3e9b`

**What's next:** TBD — pilot deployment, user testing, next milestone planning

---

## v1.1 Pilot-Ready (Shipped: 2026-03-21)

**Delivered:** Platform ready for East Midlands pilot — UX overhaul, VANTAGE API integration, challenger self-service portal, kiosk mode for institutional embedding, and public institution landing pages.

**Phases completed:** 7-11 (11 plans total)

**Key accomplishments:**

- UX overhaul — full navigation, dashboard summary cards, CM-specific views, wellbeing score interpretation, hover affordances
- Wellbeing visualisation — recharts line chart with UK population benchmarks, band labels, accessible data table
- VANTAGE API integration — API key auth (SHA-256), rate-limiting, documented endpoint contract
- Challenger portal — self-service organisation registration, challenge submission, status tracking, resolution rating
- Kiosk mode — URL-param activation, 10-min idle timer with 60-sec countdown, full session cleanup (cookies + cache)
- Institutional landing pages — public /i/:slug pages with impact stats and kiosk auto-activation

**Stats:**

- 48 files changed (+8,083 lines)
- 24,799 lines of TypeScript/TSX/CSS (total codebase)
- 5 phases, 11 plans, 31 requirements
- 6 days from 2026-03-16 to 2026-03-21

**Git range:** `3e6cc64` → `0c82086`

**What's next:** TBD — pilot deployment, user testing, v2.0 planning

---

## v1.0 MVP (Shipped: 2026-03-15)

**Delivered:** Pilot-ready expertise marketplace — experienced professionals can upload a CV, get matched to challenges, collaborate in Circles, earn income via Stripe Connect, and track their wellbeing and impact, all as an installable PWA.

**Phases completed:** 1-6 (19 plans total)

**Key accomplishments:**

- Three-path auth system (OAuth/email/SMS) with WCAG AAA web UI and GDPR consent
- CV parsing pipeline (S3 + LLM extraction) with full onboarding flow completing in under 5 minutes
- Challenge feed with scoring algorithm, interest expression, and CM admin for team composition
- Circle workspace with notes, attachments, social channel deep links, resolution submission, and challenger rating
- Stripe Connect payments with 75/25 splits (retainers, stipends, subscriptions) and impact dashboard
- Wellbeing check-ins (UCLA/SWEMWBS), push notifications + email fallback, installable PWA

**Stats:**

- 223 files created/modified
- 16,650 lines of TypeScript/TSX/CSS
- 6 phases, 19 plans, 50 requirements
- 6 days from 2026-03-10 to 2026-03-15

**Git range:** `ce671d0` → `dd3696c`

**What's next:** v1.1 — VANTAGE AI agent overlay, institutional embedding, challenger self-service

---

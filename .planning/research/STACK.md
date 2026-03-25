# Stack Research

**Domain:** Social enterprise platform — v1.3 additions (wellbeing aggregation, attention trends, PDF scheduling, institution portal)
**Researched:** 2026-03-25
**Confidence:** HIGH

## Headline Finding

**No new runtime dependencies needed for v1.3.** Every required capability is already installed.

## Existing Stack Coverage

| Feature | Capability Needed | Already Installed |
|---|---|---|
| Wellbeing band aggregation | GROUP BY + HAVING query | drizzle-orm 0.38 |
| Band classification logic | Pure TypeScript function | — |
| PDF with aggregated data | PDF generation | pdfkit 0.18 |
| Scheduled email delivery | Cron jobs | node-cron 4.2.1 |
| PDF-as-email-attachment | Email + Buffer | resend 4.1 |
| Attention trend chart | React chart | recharts 3.8 |
| Institution portal auth | JWT + argon2 hashing | jose 5.9 + argon2 0.41 |

## Cleanup Required

- **Remove `@types/node-cron ^3.0.11`** — node-cron v4 ships its own TypeScript types; the DefinitelyTyped stub is stale and conflicting.

## New DB Tables Needed (Drizzle Schema Only)

- `institution_users` — portal login credentials for institution contacts
- `report_schedules` — cron schedule per institution for auto-delivery
- `report_deliveries` — delivery log for audit trail and retry tracking

## Institution Portal Auth Design

Use existing JWT/cookie infrastructure with a new `role: 'institution_portal'` + `institutionId` claim. Do **not** create a second Express app or second JWT secret.

## k-Anonymity for Wellbeing Aggregation

Drizzle `having(count(...).gte(sql\`5\`))` — suppress groups below threshold, not noise them. This is the correct pattern for clinical instrument data at this population size.

**Note:** Pitfalls research recommends k=10 for health data based on ICO guidance. This is a stakeholder decision — implement as a named constant.

## What NOT to Add

- No new charting library (recharts handles trend lines)
- No new email provider (Resend handles attachments)
- No new auth library (jose + argon2 already installed)
- No separate Express app for institution portal
- No Redis or message queue for scheduling (node-cron + PostgreSQL advisory lock sufficient at pilot scale)

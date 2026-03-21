---
phase: 11-kiosk-mode-and-institutional-pages
verified: 2026-03-21T11:07:57Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 11: Kiosk Mode and Institutional Pages Verification Report

**Phase Goal:** The platform is safely embeddable in libraries and community centres -- shared computers auto-clean sessions, and each institution has a public entry point.
**Verified:** 2026-03-21T11:07:57Z
**Status:** passed
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Visiting ?kiosk=true activates simplified UI with larger buttons and no install or notification prompts | VERIFIED | KioskContext reads useSearchParams, sets module-level _kioskActivated; Navbar hides Enable Notifications and Install App behind !isKiosk; nav links use text-base in kiosk mode |
| 2  | After 10 minutes of inactivity a 60-second countdown appears, then the session ends with cookies and cache cleared | VERIFIED | useKioskTimer: IDLE_TIMEOUT_MS=600000, PROMPT_BEFORE_MS=60000; onPrompt starts countdown; onIdle calls performLogout: logout() + queryClient.clear() + window.location.href="/" |
| 3  | An End Session button is visible in kiosk navigation at all times | VERIFIED | Navbar renders End Session Button inside isKiosk guard, calls performLogout |
| 4  | Each institution has a public page at /i/[slug] showing name, description, and local impact stats | VERIFIED | /i/:slug route in App.tsx outside ProtectedRoute; InstitutionLanding fetches /api/institutions/:slug via useQuery; renders name, city, description, 3 StatCards |
| 5  | Navigating from an institutional landing page auto-activates kiosk mode | VERIFIED | Get Started CTA links to ROUTES.LOGIN + ?kiosk=true; KioskContext sets _kioskActivated=true persistently |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|--------|
| packages/web/src/contexts/KioskContext.tsx | KioskProvider + useKiosk with module-level flag | VERIFIED | 42 lines; exports KioskProvider and useKiosk; _kioskActivated module-level flag; reads ?kiosk=true sync and via useEffect |
| packages/web/src/hooks/useKioskTimer.ts | 10min idle timer, 60s warning, full session cleanup | VERIFIED | 77 lines; react-idle-timer integrated; IDLE_TIMEOUT_MS=600000; performLogout uses queryClient.clear() + window.location.href; no invalidateQueries |
| packages/web/src/components/layout/KioskWarningOverlay.tsx | Full-screen countdown with touch-friendly buttons | VERIFIED | 57 lines; fixed inset-0 z-50; text-8xl countdown; two min-h-[3.5rem] buttons; exports KioskWarningOverlay |
| packages/web/src/components/layout/Navbar.tsx | Kiosk-conditional nav | VERIFIED | Imports useKiosk, useKioskTimer, KioskWarningOverlay; notifications+install gated by !isKiosk; End Session gated by isKiosk; nav links conditional text-base/text-sm |
| packages/web/src/components/layout/AppShell.tsx | Hides footer, ConsentBanner, DevRoleSwitcher in kiosk | VERIFIED | All three wrapped in !isKiosk guards |
| packages/web/src/App.tsx | KioskProvider wrapping Routes inside BrowserRouter | VERIFIED | BrowserRouter > AuthProvider > KioskProvider > Routes hierarchy correct |
| packages/server/src/db/schema.ts | institutions pgTable with slug unique, statsJson | VERIFIED | pgTable with slug .unique(), statsJson jsonb with typed default |
| packages/server/scripts/create-institutions-table.mjs | Idempotent migration + seed script | VERIFIED | 79 lines; CREATE TABLE IF NOT EXISTS; INSERT ON CONFLICT (slug) DO NOTHING; marks drizzle journal |
| packages/server/src/routes/institutions.ts | Public GET /:slug with slug validation | VERIFIED | 46 lines; regex /^[a-z0-9-]{2,100}$/; 400/404 responses; no auth middleware; exports institutionRoutes |
| packages/server/src/express-app.ts | institutions route at /api/institutions | VERIFIED | import line 16; app.use mount line 73 |
| packages/web/src/pages/institution/InstitutionLanding.tsx | Public landing with name, description, stats, CTA | VERIFIED | 144 lines; useQuery; renders name/city/description/3 StatCards; Link to login?kiosk=true; loading+error states |
| packages/web/src/lib/constants.ts | INSTITUTION route constant | VERIFIED | INSTITUTION function and INSTITUTION_BASE string present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| KioskContext.tsx | URL search params | useSearchParams reads kiosk=true, sets _kioskActivated | WIRED | Both sync and useEffect paths cover first render and re-navigation |
| useKioskTimer.ts | KioskContext.tsx | enabled param; disabled: !enabled to useIdleTimer | WIRED | useKioskTimer(isKiosk) called in Navbar |
| useKioskTimer.ts | /api/auth/logout + queryClient | logout() then queryClient.clear() then window.location.href | WIRED | All three steps in performLogout; no invalidateQueries shortcut |
| Navbar.tsx | KioskContext.tsx | useKiosk() drives 4 conditional render blocks | WIRED | isKiosk used for notifications, install, End Session, regular logout |
| institutions.ts (route) | schema.ts | db.select().from(institutions).where(and(...)) | WIRED | Drizzle query result returned via res.json() |
| express-app.ts | institutions.ts | app.use at /api/institutions | WIRED | Line 73, before error handler |
| InstitutionLanding.tsx | /api/institutions/:slug | useQuery with fetchInstitution | WIRED | Response data drives all rendered content |
| InstitutionLanding.tsx | kiosk auto-activation | Link to ROUTES.LOGIN + ?kiosk=true | WIRED | kiosk=true present in Get Started href |
| App.tsx | InstitutionLanding.tsx | Route path="/i/:slug" | WIRED | Outside ProtectedRoute, public access confirmed |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| KIOSK-01: ?kiosk=true activates simplified UI (larger buttons, no install/notification prompts) | SATISFIED | Larger nav text, hidden install/notification prompts, hidden footer+consent |
| KIOSK-02: 10min idle -> 60sec warning -> auto-logout | SATISFIED | useIdleTimer timeout=600000 promptBeforeIdle=60000; countdown + performLogout on idle |
| KIOSK-03: Kiosk logout clears server cookies AND React Query cache | SATISFIED | logout() + queryClient.clear() + window.location.href; no invalidateQueries |
| KIOSK-04: End Session button visible in kiosk nav | SATISFIED | isKiosk guard renders End Session button in Navbar |
| INST-01: /i/[slug] with name, description, Get Started CTA | SATISFIED | Route, component, and CTA all present and wired |
| INST-02: Landing page shows aggregate local impact stats | SATISFIED | 3 StatCards: contributors, challenges, hours |
| INST-03: Institutional URL auto-activates kiosk mode | SATISFIED | Get Started -> login?kiosk=true -> KioskContext activates |

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder in phase files. No stub implementations. No queryClient.invalidateQueries in useKioskTimer. Hard navigation (window.location.href) used correctly for kiosk logout, not React Router navigate().

**Note on NotificationBell in kiosk mode:** The bell icon (notification inbox dropdown) renders in kiosk mode. KIOSK-01 requires hiding notification prompts (the push subscription opt-in button), which is correctly hidden. The bell is a passive inbox viewer, not a subscription prompt. Acceptable design choice.

---

### Human Verification Required

#### 1. Kiosk idle timer end-to-end flow

**Test:** Temporarily reduce IDLE_TIMEOUT_MS to 15000ms. Visit /dashboard?kiosk=true while logged in. Wait 15 seconds idle.
**Expected:** 60-second countdown overlay appears. Continue Session dismisses it and resets timer. Letting countdown reach 0 logs out and redirects to /.
**Why human:** Timer behaviour and redirect require runtime execution.

#### 2. Session data clearance after kiosk logout

**Test:** After kiosk auto-logout triggers, open browser DevTools and inspect React Query cache.
**Expected:** No stale user data; all queries fresh on next login.
**Why human:** Requires runtime inspection of React Query cache state.

#### 3. Kiosk UI visual appearance

**Test:** Visit ?kiosk=true while authenticated. Compare nav to non-kiosk view.
**Expected:** Enable Notifications and Install App absent; End Session prominent in red; nav link text visibly larger; footer absent.
**Why human:** Visual rendering requires a browser.

#### 4. Institution page rendering

**Test:** Run migration script, then visit /i/brixton-library and /i/manchester-central.
**Expected:** Name, city, description, and 3 stat cards render (Brixton: 12/5/340; Manchester: 8/3/180). /i/nonexistent shows Institution not found message.
**Why human:** Requires populated database and running server.

#### 5. End-to-end kiosk activation via institution page

**Test:** Visit /i/brixton-library -> click Get Started -> log in.
**Expected:** After login the dashboard shows kiosk UI (End Session visible, install/notification buttons absent, footer absent).
**Why human:** Cross-page browser flow cannot be verified statically.

---

### Gaps Summary

No gaps. All 5 observable truths verified. All 12 required artifacts exist, are substantive (well above minimum line counts), and are correctly wired into the application. All 7 requirements satisfied. No stub patterns or anti-patterns found.

The phase goal -- "The platform is safely embeddable in libraries and community centres -- shared computers auto-clean sessions, and each institution has a public entry point" -- is fully achieved at the code level.

---

_Verified: 2026-03-21T11:07:57Z_
_Verifier: Claude (gsd-verifier)_

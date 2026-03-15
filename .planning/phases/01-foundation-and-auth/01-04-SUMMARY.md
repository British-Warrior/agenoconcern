---
phase: 01-foundation-and-auth
plan: 04
subsystem: ui
tags: [react, tailwindcss-v4, oklch, wcag-aaa, gdpr, cookie-consent, react-router-v7, tanstack-query, aria]

requires:
  - phase: 01-02
    provides: "Vite web scaffold, React entry point, Tailwind v4 plugin, proxy config"
  - phase: 01-03
    provides: "Auth API endpoints at /api/auth/* (register, login, logout, me, refresh, OAuth, SMS, password reset)"
provides:
  - WCAG AAA design system with OKLCH palette, 18px+ typography, 48px touch targets
  - UI component library (Button, Input, Card, Alert, ConsentBanner)
  - AppShell layout with Navbar, footer, ARIA landmarks, skip-link
  - Auth-gated routing with ProtectedRoute and returnUrl redirect
  - API client with auto 401 token refresh and retry
  - useAuth hook with TanStack Query state management
  - Complete auth UI (Landing, Login, Register, PhoneLogin, ForgotPassword, ResetPassword, Dashboard)
  - GDPR consent banner with equal Accept/Reject (ICO compliant)
  - Privacy Policy and Cookie Policy pages with interim data export/deletion notice
affects: [02-onboarding, 03-circles, 05-payments]

tech-stack:
  added: []
  patterns: [tailwind-v4-css-first-theme, oklch-colour-palette, fetch-with-auto-refresh, auth-context-tanstack-query, consent-banner-localstorage]

key-files:
  created:
    - packages/web/src/styles/app.css
    - packages/web/src/lib/constants.ts
    - packages/web/src/api/client.ts
    - packages/web/src/api/auth.ts
    - packages/web/src/hooks/useAuth.ts
    - packages/web/src/components/ui/Button.tsx
    - packages/web/src/components/ui/Input.tsx
    - packages/web/src/components/ui/Card.tsx
    - packages/web/src/components/ui/Alert.tsx
    - packages/web/src/components/ui/ConsentBanner.tsx
    - packages/web/src/components/layout/AppShell.tsx
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/components/layout/ProtectedRoute.tsx
    - packages/web/src/pages/Landing.tsx
    - packages/web/src/pages/Login.tsx
    - packages/web/src/pages/Register.tsx
    - packages/web/src/pages/PhoneLogin.tsx
    - packages/web/src/pages/ForgotPassword.tsx
    - packages/web/src/pages/ResetPassword.tsx
    - packages/web/src/pages/Dashboard.tsx
    - packages/web/src/pages/PrivacyPolicy.tsx
    - packages/web/src/pages/CookiePolicy.tsx
  modified:
    - packages/web/src/main.tsx
    - packages/web/src/App.tsx

key-decisions:
  - "Tailwind v4 CSS-first config with @theme block - no tailwind.config.js"
  - "OKLCH colour palette for perceptually uniform contrast ratios"
  - "Custom fetch wrapper with auto 401 refresh instead of using axios"
  - "ConsentBanner uses localStorage + custom event for reopening from footer"
  - "OAuth buttons render as <a> tags to /api/auth/* for server-side redirects"

patterns-established:
  - "Design system: 18px base font, 48px touch targets, 7:1+ contrast ratio on all text"
  - "UI components: Button variants (primary/secondary/outline/ghost), Input with label+error, Card section, Alert with role+icon"
  - "Auth pattern: useAuth() hook provides contributor/isAuthenticated/isLoading/login/register/logout"
  - "Protected routes: ProtectedRoute component wraps React Router Outlet with auth check and returnUrl redirect"
  - "API client: credentials:include on all requests, auto refresh on 401, singleton refresh promise to prevent races"
  - "Page titles: set via useEffect on mount for each page"

duration: 7min
completed: 2026-03-10
---

# Phase 1 Plan 4: Web UI Shell Summary

**React web UI with WCAG AAA OKLCH design system, three-path auth flow pages (OAuth/email/phone), GDPR consent banner with equal Accept/Reject, and auth-gated routing with auto token refresh**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-10T13:21:57Z
- **Completed:** 2026-03-10T13:29:20Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- WCAG AAA design system with Tailwind v4 CSS-first OKLCH palette, 18px+ typography, 48px touch targets, and full ARIA support across all components
- Complete auth UI with three identity paths: OAuth primary (Google/LinkedIn), email/password secondary, phone/SMS tertiary -- per locked architectural decisions
- GDPR-compliant cookie consent banner with equal Accept/Reject buttons (ICO requirement), localStorage persistence, and reopenable from footer
- Privacy Policy and Cookie Policy pages with interim notice directing data export/deletion requests to kirk@indomitableunity.org

## Task Commits

Each task was committed atomically:

1. **Task 1: Design system, layout components, and auth infrastructure** - `a824df0` (feat)
2. **Task 2: Auth flow pages and GDPR policy pages** - `2a036a8` (feat)

## Files Created/Modified
- `packages/web/src/styles/app.css` - Tailwind v4 theme with OKLCH palette, typography, spacing, focus ring, skip-link
- `packages/web/src/lib/constants.ts` - API base URL, route paths, localStorage keys
- `packages/web/src/api/client.ts` - Fetch wrapper with credentials:include, auto 401 refresh, retry, ApiResponseError
- `packages/web/src/api/auth.ts` - Auth API functions: register, login, logout, getMe, refresh, forgotPassword, resetPassword, sendPhoneCode, verifyPhoneCode
- `packages/web/src/hooks/useAuth.ts` - AuthProvider context + useAuth hook with TanStack Query
- `packages/web/src/components/ui/Button.tsx` - Button with variants, sizes, loading spinner, ARIA
- `packages/web/src/components/ui/Input.tsx` - Label+input pair with error/helper, aria-invalid/describedby
- `packages/web/src/components/ui/Card.tsx` - Section container with optional h2
- `packages/web/src/components/ui/Alert.tsx` - Variant alerts with icon+text (never colour alone), role=alert/status
- `packages/web/src/components/ui/ConsentBanner.tsx` - GDPR banner with equal Accept/Reject, manage preferences, localStorage
- `packages/web/src/components/layout/AppShell.tsx` - Header+main+footer with ARIA landmarks, skip-link, Outlet
- `packages/web/src/components/layout/Navbar.tsx` - Logo, auth-aware nav (name+logout or login link)
- `packages/web/src/components/layout/ProtectedRoute.tsx` - Auth gate with loading spinner and returnUrl redirect
- `packages/web/src/pages/Landing.tsx` - Hero with tagline, CTA to register, login link
- `packages/web/src/pages/Login.tsx` - OAuth primary, email secondary, phone tertiary, error handling, returnUrl
- `packages/web/src/pages/Register.tsx` - OAuth + email form with privacy consent checkbox, validation
- `packages/web/src/pages/PhoneLogin.tsx` - Two-step flow with 60s resend cooldown
- `packages/web/src/pages/ForgotPassword.tsx` - Safe "if exists" messaging
- `packages/web/src/pages/ResetPassword.tsx` - Token validation, auto-redirect to login on success
- `packages/web/src/pages/Dashboard.tsx` - Welcome placeholder with contributor name
- `packages/web/src/pages/PrivacyPolicy.tsx` - Full policy with interim data export/deletion notice
- `packages/web/src/pages/CookiePolicy.tsx` - Essential/analytics breakdown, manage cookies button
- `packages/web/src/main.tsx` - QueryClientProvider wrapping App, CSS import
- `packages/web/src/App.tsx` - BrowserRouter with all routes, AuthProvider, AppShell

## Decisions Made
- Used custom fetch wrapper rather than axios -- keeps bundle small and provides auto-refresh on 401
- OAuth buttons rendered as `<a>` tags pointing to `/api/auth/google` and `/api/auth/linkedin` for server-side redirect handling
- ConsentBanner uses localStorage with custom DOM event (`open-cookie-settings`) for the footer "Manage Cookies" link to reopen the banner
- Privacy Policy includes explicit interim notice about data export/deletion features being developed, with email fallback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useRef initial value for strict TypeScript**
- **Found during:** Task 2 (PhoneLogin page)
- **Issue:** `useRef<ReturnType<typeof setInterval>>()` without initial value caused TS2554 in strict mode
- **Fix:** Added explicit `undefined` initial value: `useRef<ReturnType<typeof setInterval>>(undefined)`
- **Files modified:** packages/web/src/pages/PhoneLogin.tsx
- **Committed in:** 2a036a8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript strict mode fix. No scope creep.

## Issues Encountered
None

## Next Phase Readiness
- Complete auth UI ready for end-to-end testing with the auth backend
- Phase 1 Foundation and Auth is now complete (all 4 plans done)
- Ready for Phase 2: Onboarding (CV upload, profile creation)
- External service env vars still needed for OAuth/SMS/email features (documented in 01-03-SUMMARY.md)

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-03-10*

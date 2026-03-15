---
status: diagnosed
phase: 01-foundation-and-auth
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md
started: 2026-03-11T10:00:00Z
updated: 2026-03-11T10:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Server starts and health endpoint responds
expected: Run `pnpm dev:server`. Server starts without errors. GET http://localhost:3000/health returns 200 OK.
result: pass

### 2. Web app loads with landing page
expected: Run `pnpm dev` (or dev:web). Visit http://localhost:5173. Landing page shows with "Deploying Expertise That Hasn't Passed Its Sell-By Date" tagline, a CTA button to register, and a login link.
result: pass

### 3. Navigate to Register page
expected: Click the register CTA from landing. Page shows Google and LinkedIn OAuth buttons as primary options, an email/password form below, and a privacy consent checkbox that must be ticked before submitting.
result: pass

### 4. Navigate to Login page
expected: Click "Log in" link. Page shows OAuth buttons (Google/LinkedIn) as primary, email/password form as secondary, and a link to phone/SMS login as tertiary option.
result: pass

### 5. Phone Login page
expected: Click the phone login link from Login page. Page shows a phone number input. After entering a number (if Twilio is configured) or submitting, you see either a verification code input step or a 501 message saying SMS is not configured.
result: issue
reported: "failed to send code, please try again"
severity: major

### 6. Forgot Password page
expected: Click "Forgot password?" from Login page. Page shows an email input. Submitting shows a safe message like "If an account exists, we've sent a reset link" (never reveals whether account exists).
result: issue
reported: "something went wrong, please try again"
severity: major

### 7. Protected route redirects to login
expected: Visit http://localhost:5173/dashboard directly without being logged in. You are redirected to the login page. The URL includes a returnUrl parameter pointing back to /dashboard.
result: pass

### 8. GDPR consent banner appears
expected: Clear localStorage and reload the page. A cookie consent banner appears at the bottom with equal-weight Accept and Reject buttons (neither is visually dominant). There is also a "Manage Preferences" or similar option.
result: pass

### 9. Consent banner Accept/Reject works
expected: Click Accept — banner dismisses and does not reappear on refresh. Clear localStorage and reload — banner reappears. Click Reject — banner dismisses. Choice persists across page refreshes.
result: pass

### 10. Manage Cookies from footer
expected: After dismissing the consent banner, scroll to the page footer. Click "Manage Cookies" (or similar link). The consent banner reopens so you can change your choice.
result: pass

### 11. Privacy Policy page
expected: Navigate to the Privacy Policy page (from footer link or /privacy). Page shows a full privacy policy including an interim notice that data export/deletion features are being developed, with an email contact (kirk@indomitableunity.org) for requests.
result: pass

### 12. Cookie Policy page
expected: Navigate to the Cookie Policy page (from footer link or /cookies). Page shows breakdown of essential vs analytics cookies and a button to manage cookie settings.
result: pass

### 13. Skip link and keyboard accessibility
expected: Load any page and press Tab. A "Skip to content" link appears (visually hidden until focused). Pressing Enter on it moves focus past the navigation to the main content area.
result: pass

### 14. Design system: typography and touch targets
expected: Across all pages, body text is 18px or larger. All buttons and interactive elements have at least 48px touch target height. Text has high contrast against backgrounds (no light grey on white).
result: pass

### 15. Navbar shows auth state
expected: When not logged in, the navbar shows a "Log in" link. When logged in, it shows the contributor's name and a logout button.
result: pass

## Summary

total: 15
passed: 13
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Phone login shows helpful 501 message when Twilio is not configured, or proceeds to verification code step when configured"
  status: failed
  reason: "User reported: failed to send code, please try again"
  severity: major
  test: 5
  root_cause: "Server returns 501 with helpful message but PhoneLogin.tsx instanceof ApiResponseError check falls through to generic error. Also, showing raw config error to users is poor UX — should show user-friendly message."
  artifacts:
    - path: "packages/server/src/routes/auth.ts"
      issue: "Returns 501 with technical config message for end users"
    - path: "packages/web/src/pages/PhoneLogin.tsx"
      issue: "instanceof ApiResponseError check may fail, falls to generic error"
  missing:
    - "PhoneLogin.tsx should surface server error message from ApiResponseError"
    - "Consider user-friendly message for unconfigured services"
  debug_session: ""

- truth: "Forgot password shows safe 'if an account exists' message regardless of whether account exists or email service is configured"
  status: failed
  reason: "User reported: something went wrong, please try again"
  severity: major
  test: 6
  root_cause: "Server returns 501 early when RESEND_API_KEY is missing, before processing the request. Should always return the safe 'if account exists' message and silently skip email sending when Resend is unconfigured."
  artifacts:
    - path: "packages/server/src/routes/auth.ts"
      issue: "Early 501 return in forgot-password endpoint when Resend not configured (lines ~446-453)"
  missing:
    - "Remove early 501 check from forgot-password endpoint"
    - "Silently skip email sending when Resend is unconfigured"
    - "Always return safe 'if an account exists' 200 response"
  debug_session: ""

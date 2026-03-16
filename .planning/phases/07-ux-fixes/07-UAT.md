---
status: complete
phase: 07-ux-fixes
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md]
started: 2026-03-16T07:00:00Z
updated: 2026-03-16T07:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Navbar Navigation Links
expected: When logged in, the top navbar shows these links in order: Dashboard, Challenges, My Circles, My Impact, Wellbeing — plus the existing Logout button. Clicking each link navigates to the correct page.
result: pass

### 2. Nav Link Hover States
expected: Hovering over each navbar link changes the text colour (neutral to primary). The cursor shows as a pointer on all nav links.
result: issue
reported: "no change in text colour on hover, apart from logout, on hover button becomes visible"
severity: minor

### 3. Dashboard Summary Cards
expected: The Dashboard page shows 5 cards: Active Circles (count), Open Matches (count), Total Earnings (GBP amount), Hours Contributed (with paid/volunteered breakdown), and Wellbeing Status (check-in due or up to date). Each card is clickable and navigates to its relevant page.
result: pass

### 4. Dashboard Loading State
expected: On initial Dashboard load, a skeleton/loading state appears briefly across all cards simultaneously (not individual spinners per card). Once data loads, all 5 cards appear together.
result: pass

### 5. Wellbeing Score Bands on Impact Page
expected: On the Impact page, wellbeing scores show as "score/max" format (e.g. "24/35" for SWEMWBS, "5/12" for UCLA). Each score has a coloured band label next to it (Low in red, Average in amber, High in green). Helper text at the bottom explains the norm ranges.
result: pass

### 6. Wellbeing Trend Arrows
expected: If there are 2+ wellbeing check-ins, the Impact page shows trend direction for both SWEMWBS and UCLA. Up arrow in green for improving SWEMWBS; down arrow in green for improving UCLA (lower = less lonely). Opposite directions show in red.
result: pass

### 7. CM Role-Conditional Circles Page
expected: When logged in as a Community Manager, the My Circles page shows subtitle "Circles you've formed for challenges." and if no circles exist, shows "No Circles formed yet" with a "Manage Challenges" button linking to /challenges/manage. A contributor instead sees "Express interest in challenges to get started."
result: issue
reported: "the 'manage' tab on the challenges page, doesn't have its own url, it's part of the challenges page so a link to /challenges/manage, does nothing!"
severity: major

### 8. Interactive Button Cursor States
expected: On circle workspace: the Edit Resolution button shows a pointer cursor. When the edit form is already open, the Edit Resolution button either disappears or appears greyed out (opacity-50) and is not clickable. Cancel button also shows pointer cursor.
result: pass

### 9. Error Message Sanitisation
expected: If an API error occurs (e.g. forming a circle, expressing interest), the error message shown to the user is human-readable — no raw UUIDs or technical IDs visible. Example: "Failed to form circle. Please try again." instead of a message containing a UUID.
result: skipped
reason: No errors encountered during testing session

### 10. Circle Formation Member Names
expected: When viewing the circle formation modal, member names display as proper names. If a name is missing or invalid, "Unknown contributor" appears instead of a blank or a UUID string.
result: pass

## Summary

total: 10
passed: 7
issues: 2
pending: 0
skipped: 1
skipped: 0

## Gaps

- truth: "Hovering over navbar links changes text colour visibly"
  status: failed
  reason: "User reported: no change in text colour on hover, apart from logout, on hover button becomes visible"
  severity: minor
  test: 2
  root_cause: "neutral-700 (oklch 0.35/0.01) to primary-800 (oklch 0.24/0.05) is too subtle — both are dark low-chroma colours"
  artifacts:
    - path: "packages/web/src/components/layout/Navbar.tsx"
      issue: "hover:text-primary-800 is near-invisible against text-neutral-700"
    - path: "packages/web/src/styles/app.css"
      issue: "primary-800 and neutral-700 lack contrast"
  missing:
    - "Use a more distinct hover colour (e.g. primary-600 which is lighter/more saturated)"
- truth: "CM empty state 'Manage Challenges' button navigates to challenge management"
  status: failed
  reason: "User reported: the 'manage' tab on the challenges page doesn't have its own url, it's part of the challenges page so a link to /challenges/manage does nothing"
  severity: major
  test: 7
  root_cause: "MyCircles CM CTA links to /challenges/manage which is not a route — the Manage tab is an in-page tab on /challenges"
  artifacts:
    - path: "packages/web/src/pages/circles/MyCircles.tsx"
      issue: "CM CTA links to /challenges/manage instead of /challenges with tab=manage or similar"
  missing:
    - "Change CM CTA link to /challenges (or /challenges?tab=manage if tab state can be driven by URL)"

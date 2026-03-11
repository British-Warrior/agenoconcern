---
phase: 02-onboarding-and-profiles
plan: 02
subsystem: web-onboarding
tags: [react, tanstack-query, react-dropzone, file-upload, polling, form-editing]
dependency_graph:
  requires:
    - 02-01 (onboarding API backend)
    - 01-04 (web shell, design system, auth)
  provides:
    - UploadCV page with drag-and-drop
    - Parsing wait page with animated progress
    - ReviewProfile page with editable fields
    - Affirmation page with personalised message
  affects:
    - App.tsx routing
    - Dashboard redirect behaviour
tech_stack:
  added:
    - react-dropzone ^11 (file drag-and-drop)
  patterns:
    - TanStack Query polling with refetchInterval for parse status
    - Presigned S3 PUT upload (client uploads directly, server never proxies file data)
    - Image OCR via server multipart POST (alternative path for JPG/PNG)
key_files:
  created:
    - packages/web/src/api/onboarding.ts
    - packages/web/src/hooks/useOnboarding.ts
    - packages/web/src/pages/onboarding/UploadCV.tsx
    - packages/web/src/pages/onboarding/Parsing.tsx
    - packages/web/src/pages/onboarding/ReviewProfile.tsx
    - packages/web/src/pages/onboarding/Affirmation.tsx
  modified:
    - packages/web/src/App.tsx
    - packages/web/package.json
decisions:
  - "[02-02]: react-dropzone used for file drag-and-drop (useDropzone hook) -- minimal API, well-maintained"
  - "[02-02]: Image files (JPG/PNG) route through server OCR path; documents route through presigned S3 PUT then start-parse"
  - "[02-02]: Dashboard redirects to /onboarding/upload when contributor.status === 'onboarding'"
  - "[02-02]: Tag list editing uses controlled state with TagListEditor component local to ReviewProfile -- not extracted until reuse needed"
  - "[02-02]: Parsing page uses local interval for animated step labels independent of polling -- labels advance on time, not on API response"
  - "[02-02]: Affirmation page falls back to generic message if affirmationMessage not in profile"
metrics:
  duration: 4 min
  completed: 2026-03-11
  tasks_completed: 2
  tasks_total: 2
---

# Phase 2 Plan 2: Onboarding Frontend — CV Upload, Parsing, Review, and Affirmation Summary

**One-liner:** Four-screen onboarding flow with react-dropzone file upload, TanStack Query polling, tag-based profile editing, and personalised affirmation message.

## What Was Built

The four core screens of the onboarding flow:

1. **UploadCV** — drag-and-drop zone accepting PDF, DOCX, TXT, JPG, PNG (max 10 MB). On drop, immediately starts upload (presigned S3 PUT for documents, multipart POST for images), then navigates to parsing with the jobId.

2. **Parsing** — reads `jobId` from URL search params, polls `/api/onboarding/parse-status/:jobId` every 2 seconds via `useCvParseStatus`. Animated step labels advance on a 3-second interval independently of polling ("Reading your CV..." → "Finding your expertise..." → "Building your profile..." → "Almost there..."). Navigates to review on complete, shows retry link on failure.

3. **ReviewProfile** — fetches the parsed profile with `useProfile()`, renders editable sections for professional summary (textarea), roles & titles, skills, qualifications, sectors (all tag lists with pill UI and Enter-to-add input), and years of experience (number input). "Confirm Profile" fires `useUpdateProfile()` then navigates to affirmation.

4. **Affirmation** — displays the personalised `affirmationMessage` from the parsed profile in a prominent blockquote. Falls back to a generic message if not present. "Continue" navigates to `/onboarding/preferences` (placeholder pending Plan 03).

**Routing** — App.tsx updated with all four pages under `<ProtectedRoute>`, plus placeholder routes for preferences, stripe, and complete. Dashboard now redirects to `/onboarding/upload` when contributor status is `"onboarding"`.

## Commits

| Task | Name | Commit | Key files |
|------|------|--------|-----------|
| 1 | API client, hooks, Upload page, Parsing wait | d3228b3 | onboarding.ts, useOnboarding.ts, UploadCV.tsx, Parsing.tsx |
| 2 | Review Profile and Affirmation pages with routing | 23fb760 | ReviewProfile.tsx, Affirmation.tsx, App.tsx |

## API Integration

| Page | Endpoint | Pattern |
|------|----------|---------|
| UploadCV | POST /api/onboarding/upload-url → PUT S3 → POST /api/onboarding/start-parse | `onboardingApi.getUploadUrl` + `uploadToS3` + `startParse` |
| UploadCV (image) | POST /api/onboarding/upload-image | `onboardingApi.uploadImage` |
| Parsing | GET /api/onboarding/parse-status/:jobId | `refetchInterval: 2000` stops on complete/failed |
| ReviewProfile | GET /api/onboarding/profile → PUT /api/onboarding/profile | `useProfile` + `useUpdateProfile` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FileRejection type mismatch with react-dropzone**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `onDrop` callback typed rejectedFiles as `{ errors: { code: string; message: string }[] }[]` but react-dropzone's `FileRejection` has `readonly FileError[]`
- **Fix:** Imported `FileRejection` type from `react-dropzone` and used it directly
- **Files modified:** packages/web/src/pages/onboarding/UploadCV.tsx
- **Commit:** d3228b3

**2. [Rule 1 - Bug] Alert component uses children not message prop**
- **Found during:** Task 1 implementation
- **Issue:** Plan context showed `<Alert variant="error" message={...} />` but actual Alert component uses `children`
- **Fix:** Updated to `<Alert variant="error">{message}</Alert>` pattern in UploadCV.tsx
- **Commit:** d3228b3

## Self-Check: PASSED

All files exist and both commits confirmed in git log.

Files: all 6 created + 1 modified
Commits: d3228b3 (Task 1), 23fb760 (Task 2)
Min lines met: UploadCV 230, Parsing 163, ReviewProfile 347, Affirmation 79, hooks 95, API client 160
Exports verified: useCvUpload, useCvParseStatus, useProfile, useUpdateProfile all in useOnboarding.ts; onboardingApi in onboarding.ts

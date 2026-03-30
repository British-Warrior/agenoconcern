# Requirements: Indomitable Unity

**Defined:** 2026-03-30
**Core Value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.

## v1.4 Requirements

Requirements for v1.4 WCAG Compliance. Each maps to roadmap phases.

### Keyboard & Focus

- [ ] **KBD-01**: All modals trap focus within the dialog and return focus to the trigger on close
- [ ] **KBD-02**: Escape key closes all modals and dropdowns
- [ ] **KBD-03**: SPA route changes move focus to the main content heading
- [ ] **KBD-04**: NotificationBell dropdown is keyboard-operable with aria-expanded
- [ ] **KBD-05**: All notification items are reachable and activatable via keyboard

### Screen Reader

- [ ] **SR-01**: All disclosure widgets have aria-expanded state
- [ ] **SR-02**: Form errors are linked to inputs via aria-describedby
- [ ] **SR-03**: File drop zones have accessible labels
- [ ] **SR-04**: Badge count changes are announced to screen readers
- [ ] **SR-05**: Loading skeletons have role="status" and aria-busy
- [ ] **SR-06**: AttentionTrendChart has a companion data table for screen readers

### Visual & Layout

- [ ] **VIS-01**: Focus indicators meet 3:1 contrast ratio (WCAG 2.4.11)
- [ ] **VIS-02**: Heading hierarchy is correct across all pages
- [ ] **VIS-03**: `<html lang="en">` is set
- [ ] **VIS-04**: Animations respect prefers-reduced-motion

### Forms & Auth

- [ ] **FORM-01**: Auth form inputs have autocomplete attributes (WCAG 1.3.5)
- [ ] **FORM-02**: Password inputs allow paste (WCAG 3.3.8)

### Tooling & Regression

- [ ] **TOOL-01**: eslint-plugin-jsx-a11y in strict mode catches static violations
- [ ] **TOOL-02**: axe-core Playwright tests run in CI on every PR
- [ ] **TOOL-03**: Centralised announce() utility provides live region feedback for async operations
- [ ] **TOOL-04**: Navigation links use aria-current="page"

## Future Requirements

### v2+
- **A11Y-01**: NVDA + VoiceOver cross-browser compatibility matrix (manual test suite)
- **A11Y-02**: Windows High Contrast Mode smoke test pass
- **A11Y-03**: recharts accessibilityLayer evaluation for keyboard chart navigation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Accessibility overlay widget | Doesn't fix underlying issues; creates false compliance impression |
| AAA compliance beyond colour contrast | AA is the legal standard; AAA colour already met via OKLCH |
| Custom screen reader testing framework | Manual testing with NVDA + Firefox is sufficient for pilot |
| ARIA on semantic HTML elements | Redundant ARIA causes screen reader confusion |
| Positive tabindex values | Breaks natural tab order; impossible to maintain |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KBD-01 | Phase 20 | Pending |
| KBD-02 | Phase 20 | Pending |
| KBD-03 | Phase 19 | Pending |
| KBD-04 | Phase 21 | Pending |
| KBD-05 | Phase 21 | Pending |
| SR-01 | Phase 21 | Pending |
| SR-02 | Phase 22 | Pending |
| SR-03 | Phase 22 | Pending |
| SR-04 | Phase 22 | Pending |
| SR-05 | Phase 22 | Pending |
| SR-06 | Phase 22 | Pending |
| VIS-01 | Phase 20 | Pending |
| VIS-02 | Phase 23 | Pending |
| VIS-03 | Phase 19 | Pending |
| VIS-04 | Phase 19 | Pending |
| FORM-01 | Phase 22 | Pending |
| FORM-02 | Phase 22 | Pending |
| TOOL-01 | Phase 19 | Pending |
| TOOL-02 | Phase 23 | Pending |
| TOOL-03 | Phase 20 | Pending |
| TOOL-04 | Phase 19 | Pending |

**Coverage:**
- v1.4 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*

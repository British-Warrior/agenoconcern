# Domain Pitfalls

**Domain:** Social enterprise expertise marketplace (UK, 50-75+ demographic)
**Project:** Indomitable Unity
**Researched:** 2026-03-10

---

## Critical Pitfalls

Mistakes that cause rewrites, legal exposure, or project failure.

---

### Pitfall 1: Wellbeing Data is UK GDPR Special Category Data

**What goes wrong:** UCLA Loneliness Scale and WEMWBS scores are mental health data. Under UK GDPR Article 9, this is "special category data" requiring both a lawful basis (Article 6) AND a separate processing condition (Article 9). Most developers treat it like regular user data and store it alongside profiles. This is a legal violation that can result in ICO enforcement action with fines up to 4% of annual turnover.

**Why it happens:** Developers don't realize wellbeing survey responses constitute health data under GDPR. The ICO definition is broad: "personal data related to the physical or mental health of a natural person... that reveals information about their health status."

**Consequences:** ICO investigation, mandatory breach notification, potential injunction stopping all data processing (i.e., your platform goes dark). Reputational destruction for a social enterprise whose entire brand is trust.

**Prevention:**
- Identify lawful basis AND Article 9 condition before writing any wellbeing code. For a social enterprise, "explicit consent" (Article 9(2)(a)) is likely the cleanest path, but must be genuinely informed and freely given (not buried in T&Cs).
- Write and maintain an Appropriate Policy Document (APD) as required by Schedule 1 DPA 2018 before processing any special category data.
- Complete a Data Protection Impact Assessment (DPIA) -- mandatory for high-risk processing.
- Store wellbeing data in a physically separate database table/schema with separate access controls. Not just a different column -- separate encryption keys, separate access logs, separate retention policy.
- Implement data minimisation: store aggregate scores, not individual question responses, unless you have a documented purpose for granular data.
- Set retention limits: delete raw wellbeing data after the purpose is fulfilled (e.g., 12 months). Keep only anonymised aggregates for impact reporting.

**Detection (warning signs):**
- No APD document exists before wellbeing features ship
- Wellbeing scores visible in the same admin dashboard as profile data
- No separate consent flow for wellbeing data collection
- No DPIA completed

**Phase:** Must be addressed in architecture/design phase, before any wellbeing feature development. The APD and DPIA are prerequisites.

**Confidence:** HIGH (ICO official guidance directly confirms this classification)

**Sources:**
- [ICO: What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
- [ICO: What are the rules on special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-rules-on-special-category-data/)

---

### Pitfall 2: Stripe Connect Account Type and Charge Flow Lock-in

**What goes wrong:** Choosing the wrong Stripe Connect account type (Standard, Express, or Custom) or the wrong charge flow (direct, destination, or separate charges and transfers) early on creates architecture that's extremely painful to change later. Each combination has different implications for who owns the customer relationship, how refunds work, and what compliance burden falls on you.

**Why it happens:** Developers pick based on "what's easiest to implement now" rather than mapping the commercial relationship. For Indomitable Unity, the platform facilitates paid advisory work where the platform takes a fee -- this is a classic marketplace model requiring careful charge flow design.

**Consequences:** Wrong account type means rebuilding your entire payment integration. Wrong charge flow means refunds don't work as expected, disputes hit the wrong party, or you can't implement your fee structure.

**Prevention:**
- Use **Express accounts** for contributors. Standard accounts give contributors too much control (they see the Stripe dashboard, can disconnect). Custom accounts require you to handle all compliance/KYC UI yourself -- massive overhead. Express is the sweet spot: Stripe handles KYC/onboarding UI, you control the experience.
- Use **destination charges** for the advisory marketplace. The platform creates charges and specifies the connected account as the destination. This means: refunds come from your platform balance (with reverse_transfer option), the platform owns the customer relationship, and application_fee_amount lets you take your cut cleanly.
- Always request both `card_payments` AND `transfers` capabilities on connected accounts. Missing `transfers` means you can collect payments but can't pay contributors.
- Check `charges_enabled` and `payouts_enabled` on every connected account before routing payments. Accounts can be restricted after initial onboarding.

**Detection (warning signs):**
- Using Standard accounts "because the docs showed that first"
- No application_fee_amount on payment intents
- Contributors seeing the full Stripe dashboard
- Charge flow selected without documenting why

**Phase:** Must be decided in Phase 1 (architecture). Cannot be deferred.

**Confidence:** HIGH (Stripe official documentation)

**Sources:**
- [Stripe: Build a marketplace](https://docs.stripe.com/connect/end-to-end-marketplace)
- [Stripe: Platforms and marketplaces](https://docs.stripe.com/connect)

---

### Pitfall 3: LinkedIn OAuth Token Expiry Breaks User Sessions Silently

**What goes wrong:** LinkedIn access tokens expire after 60 days. Refresh tokens are only available to a "limited set of partners" -- most apps don't get them. When tokens expire, the user's LinkedIn-connected features silently stop working. If LinkedIn is the primary login mechanism, users get locked out with no clear error.

**Why it happens:** Developers assume OAuth tokens either last forever or can be refreshed. LinkedIn is unusually restrictive: 60-day access tokens, no guaranteed refresh tokens, and changing the requested scope invalidates ALL existing tokens.

**Consequences:** Users who haven't logged in for 2 months hit a broken state. If you import LinkedIn profile data at onboarding and cache it, the cached data goes stale. If you use LinkedIn as the sole auth provider, users are locked out after 60 days of inactivity.

**Prevention:**
- Never use LinkedIn as the SOLE authentication method. Always offer email/password as a primary auth path. LinkedIn OAuth should be an optional profile enrichment feature, not a login gate.
- Store imported LinkedIn data (work history, skills) as a snapshot at import time. Don't depend on ongoing API access.
- Track token expiry dates. Send proactive email reminders at day 50: "Reconnect your LinkedIn to keep your profile current."
- Handle token expiry gracefully in the UI: show "LinkedIn disconnected" state, not a crash.
- Be aware: requesting a different scope than previously granted invalidates all previous tokens. Lock your scope list early and don't change it.
- Authorization codes expire in 30 minutes -- use immediately, don't queue.

**Detection (warning signs):**
- No email/password auth option in the login flow
- No token expiry tracking in the database
- No graceful degradation when LinkedIn API calls fail
- Scope changes planned after launch

**Phase:** Authentication architecture (Phase 1). The decision to NOT gate login on LinkedIn must be made early.

**Confidence:** HIGH (LinkedIn official documentation confirms 60-day expiry and limited refresh token availability)

**Sources:**
- [LinkedIn: Authentication Overview](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn: Authorization Code Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Why is OAuth still hard in 2026?](https://nango.dev/blog/why-is-oauth-still-hard)

---

### Pitfall 4: CV Parsing Accuracy Creates Bad First Impressions

**What goes wrong:** CVs from 50-75 year olds are uniquely challenging to parse. These professionals have 25-50 years of career history, often in formats that predate modern resume conventions: PDFs exported from Word 97, multi-page documents with tables, columns, headers/footers, and non-standard section naming. Parsing accuracy below 90% means the "auto-populated profile" feature shows garbled data on first use, destroying trust with a demographic that already needs confidence-building.

**Why it happens:** Most CV parsing libraries/services are trained on modern resumes from 25-40 year olds applying through ATS systems. Older formats, longer histories, and UK-specific conventions (e.g., "Curriculum Vitae" not "Resume", date formats, qualification naming) reduce accuracy.

**Consequences:** Contributors see a mangled profile and lose trust. They either abandon onboarding or spend time fixing errors, which defeats the purpose of auto-parsing. First impressions with 50-75 year olds are especially critical -- one bad experience and they won't return.

**Prevention:**
- Treat CV parsing as "suggested draft" not "auto-complete." Always show parsed results in an editable review screen before saving. Frame it as "We've had a go at reading your CV -- please check and correct."
- Support multiple input formats: PDF, DOCX, plain text. Don't require PDF.
- Use LLM-based extraction (not rule-based regex parsing). LLMs handle non-standard formats far better than traditional parsers. Send the extracted text to an LLM with a structured output schema.
- Implement a confidence score per field. Show low-confidence extractions with a visual indicator (amber highlight) so users know what to check.
- Store the original CV file alongside parsed data. Users should be able to re-trigger parsing or manually edit.
- GDPR: CVs contain PII (name, address, phone, email, sometimes date of birth, nationality). Encrypt at rest (S3 server-side encryption minimum). Set retention policy. Delete original files when contributor requests it (right to erasure).
- Run a DPIA for CV processing -- it involves automated processing of personal data at scale.

**Detection (warning signs):**
- No manual review/edit step after parsing
- Parsing tested only on modern-format CVs
- No confidence scoring on extracted fields
- Original CV file not retained for reference
- No GDPR retention policy for uploaded CVs

**Phase:** CV parsing should be in an early phase but with explicit "review and edit" UI. Don't ship auto-parsing without the human review step.

**Confidence:** MEDIUM (based on CV parsing industry knowledge + demographic reasoning; no direct study on 50-75 CV format accuracy)

**Sources:**
- [The Hidden Pitfalls of Traditional Resume Parsing](https://www.recrew.ai/blog/the-hidden-pitfalls-of-traditional-resume-parsing-the-disadvantages)
- [Managing CVs in Compliance with Data Protection Rules](https://www.thorntons-law.co.uk/knowledge/managing-curricula-vitae-cvs-in-compliance-with-data-protection-rules)

---

## Moderate Pitfalls

---

### Pitfall 5: Marketplace Cold-Start With a Niche Demographic

**What goes wrong:** Two-sided marketplaces die when neither side shows up. Indomitable Unity has an additional constraint: the supply side (contributors aged 50-75) requires higher-touch recruitment than a typical marketplace. You can't just run Facebook ads and get signups. The demand side (challengers/organisations needing expertise) won't pay if the contributor pool is thin.

**Prevention:**
- **Supply-first, always.** Recruit 30-50 contributors before approaching a single challenger. The East Midlands pilot should be 100% focused on supply-side recruitment first.
- **Seed the atomic network.** Andrew Chen's "atomic network" concept: find the smallest viable network. For Indomitable Unity, this might be one specific sector (e.g., manufacturing expertise in Nottingham) where you can get 10 contributors and 3 challengers who already know each other.
- **Concierge the first matches.** Don't rely on the platform to match people in the pilot. Manually introduce contributors to challengers. The platform records and facilitates, but the matching is human-driven initially.
- **Don't build payment features for the pilot if it delays launch.** Better to launch with manual invoicing and add Stripe later than to delay launch perfecting payments while your warm leads go cold.
- **Track supply-side activation rate**, not just signups. A contributor who signed up but has an empty profile is not supply.

**Detection (warning signs):**
- Building demand-side features before having 30+ active contributor profiles
- Spending equal effort on both sides simultaneously
- No personal outreach plan (relying on "build it and they will come")
- Pilot launch date keeps slipping for "one more feature"

**Phase:** Pre-Phase 1 / Phase 1. Recruitment strategy must be defined before platform features are scoped.

**Confidence:** HIGH (well-documented marketplace strategy pattern)

**Sources:**
- [Solving the Marketplace Cold-Start Problem](https://www.davidciccarelli.com/articles/product-marketing-playbook-for-two-sided-platforms/)
- [Beat the cold start problem](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace)

---

### Pitfall 6: Stripe Connect Refund/Dispute Edge Cases

**What goes wrong:** In a marketplace with split payments, refunds and disputes create complex money flows. Specific edge cases that catch people:

1. **Refund after contributor payout:** If a contributor has already been paid out and a refund is needed, the platform must fund the refund. If the connected account balance is zero, you can't reverse the transfer.
2. **Dispute on a split charge:** When a customer disputes a destination charge, the dispute is created on the platform account. The $15 dispute fee comes from the platform, not the connected account.
3. **Double-dispute:** A customer can dispute the full amount even after receiving a partial refund, creating an over-refund situation.
4. **Connected account goes negative:** If a contributor's Stripe account goes negative (from reversals/disputes), Stripe debits YOUR platform account.
5. **Payout timing mismatch:** If you pay contributors immediately but challengers dispute 30 days later, you're out of pocket.

**Prevention:**
- Hold payouts for a dispute window (7-14 days minimum). Don't pay contributors instantly.
- Set `application_fee_amount` to include a dispute reserve buffer.
- Check connected account balance before processing reversals.
- Implement a refund policy that's clear to both sides BEFORE building payment features.
- Handle the `charge.dispute.created` webhook and immediately pause payouts to the affected connected account.
- Track all payment states in your database -- don't rely solely on Stripe as your source of truth. Mirror key state transitions.
- For the pilot (50-100 users), consider manual dispute handling rather than automated flows.

**Detection (warning signs):**
- No payout delay configured
- No dispute webhook handler
- No refund policy document
- Paying contributors before the dispute window closes
- No balance check before transfer reversals

**Phase:** Payment implementation phase. Refund/dispute handling must be designed alongside the payment flow, not bolted on later.

**Confidence:** HIGH (Stripe official documentation)

**Sources:**
- [Stripe: Handle refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes)
- [Stripe: Disputes on Connect platforms](https://docs.stripe.com/connect/disputes)

---

### Pitfall 7: MCP Server Tool Design -- Agent-Hostile Error Messages

**What goes wrong:** MCP tools return error messages written for humans ("Something went wrong, please try again") instead of structured errors that help the AI agent decide what to do next. The LLM calling your tools can't parse vague errors and either retries uselessly or gives up.

**Prevention:**
- Return tool errors within the `result` object with `isError: true`, not as protocol-level errors. Protocol errors mean "the MCP server itself is broken." Tool errors mean "this specific operation failed."
- Structure error responses with: error type (e.g., `CONTRIBUTOR_NOT_FOUND`, `PAYMENT_FAILED`, `RATE_LIMITED`), whether retry is appropriate, and what alternative action the agent could take.
- Write ALL logs/debug output to stderr, never stdout. Stdout is reserved for JSON-RPC messages. Anything else on stdout corrupts the protocol.
- Make tools idempotent where possible. If an agent calls `create_booking` twice with the same parameters, the second call should return the existing booking, not create a duplicate.
- Use pagination for list operations. Don't return 500 contributor profiles in one response -- use cursor-based pagination.
- Keep tool descriptions precise. The LLM reads your tool descriptions to decide when to call them. Vague descriptions lead to wrong tool selection.

**Detection (warning signs):**
- Error messages contain "please try again" or "something went wrong"
- Console.log statements mixed with JSON-RPC output
- No isError flag in tool responses
- List endpoints returning unbounded results
- Tool descriptions longer than 2-3 sentences

**Phase:** MCP server architecture (Phase 1). Tool contracts should be designed before implementation.

**Confidence:** HIGH (MCP specification and best practice guides)

**Sources:**
- [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
- [Error Handling and Debugging MCP Servers](https://www.stainless.com/mcp/error-handling-and-debugging-mcp-servers)
- [15 Best Practices for Building MCP Servers in Production](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)

---

### Pitfall 8: PWA Push Notifications Unreliable on iOS

**What goes wrong:** PWA push notifications are fundamentally unreliable on iOS/Safari. Service worker push event listeners don't fire reliably after device restarts. Users get silently unsubscribed. Notification click handlers sometimes open the wrong URL. Apple also auto-opts users out of push notifications for PWAs, making re-engagement very difficult.

**Prevention:**
- Do NOT rely on push notifications as the primary communication channel, especially for this demographic. Email is the reliable fallback.
- Implement feature detection: check for service worker support, push messaging support, and notification API support before attempting to register.
- Build a notification centre inside the app (in-app message inbox) that works regardless of push notification status.
- Validate push subscription endpoints regularly. Send test pings monthly and clean up expired subscriptions.
- For the 50-75 demographic: push notifications are a "nice to have." Email + SMS are the reliable channels. Don't invest heavily in push notification infrastructure early.
- Service worker caching strategy: use `stale-while-revalidate` for most content. Avoid aggressive caching that serves stale profile data or stale wellbeing questionnaires.

**Detection (warning signs):**
- Critical user flows depend on push notification delivery
- No fallback communication channel implemented
- No subscription validation/cleanup process
- Aggressive cache-first strategy for dynamic content

**Phase:** PWA features should come in a later phase, after core web functionality is solid. Push notifications should be the last notification channel implemented.

**Confidence:** HIGH (well-documented iOS PWA limitations)

**Sources:**
- [Navigating Safari/iOS PWA Limitations](https://vinova.sg/navigating-safari-ios-pwa-limitations/)
- [PWA 2025 Web Almanac](https://almanac.httparchive.org/en/2025/pwa)

---

### Pitfall 9: Accessibility Failures for the 50-75 Demographic

**What goes wrong:** Developers treat "digitally literate" as "doesn't need accessibility." The 50-75 age range experiences real physiological changes: reduced contrast sensitivity, presbyopia (difficulty focusing on small text), reduced fine motor control (harder to tap small targets), and slower processing of complex layouts. WCAG compliance alone isn't sufficient -- it's a floor, not a ceiling.

**Prevention:**
- **Minimum text size: 16px base, with easy scaling to 200%.** Never use text smaller than 14px anywhere, including helper text and labels.
- **Contrast ratio: target 7:1** (WCAG AAA), not 4.5:1 (WCAG AA). The 50-75 demographic loses contrast sensitivity. What passes AA may still be hard to read.
- **Touch targets: minimum 44x44px** (WCAG) but aim for 48x48px. Small radio buttons, tiny checkboxes, and link-only navigation fail this demographic.
- **Reduce cognitive load:** One action per screen where possible. Don't show the wellbeing questionnaire, profile editor, and booking calendar on the same page. Progressive disclosure.
- **Keyboard navigation must work end-to-end.** Some users in this age range prefer keyboard/tab navigation over mouse precision. Test every flow with keyboard only.
- **Error messages must be explicit and kind.** Not "Invalid input" but "Please enter your phone number including the area code, like 0115 123 4567." This demographic is more likely to blame themselves for errors.
- **Avoid infinite scroll.** Use paginated lists with clear "Next/Previous" controls. Infinite scroll is disorienting.
- **Test with actual 50-75 year olds.** Not with 30-year-old developers pretending to be old. The East Midlands pilot is your usability testing ground -- build feedback mechanisms in.

**Detection (warning signs):**
- Base font size below 16px
- Contrast ratios at exactly 4.5:1 (AA minimum) rather than 7:1
- Touch targets smaller than 44px
- Multi-step forms without clear progress indicators
- No keyboard navigation testing
- Usability tested only by the development team

**Phase:** UI/UX foundations (early phase). Accessibility requirements should be in the design system from day one, not retrofitted.

**Confidence:** HIGH (W3C WAI guidelines + Nielsen Norman Group research)

**Sources:**
- [W3C: Older Users and Web Accessibility](https://www.w3.org/WAI/older-users/)
- [W3C: Developing Websites for Older People](https://www.w3.org/WAI/older-users/developing/)
- [NN/g: Usability for Senior Citizens](https://www.nngroup.com/articles/usability-for-senior-citizens/)

---

### Pitfall 10: GDPR Consent Architecture -- Bundled Consent is Invalid

**What goes wrong:** Developers implement one consent checkbox covering profile data, CV processing, wellbeing surveys, payment processing, and marketing. Under UK GDPR, consent must be freely given, specific, informed, and unambiguous. Bundled consent (one checkbox for multiple purposes) is not valid consent. The ICO will reject it.

**Prevention:**
- Implement **granular consent** with separate toggles for each processing purpose:
  1. Profile data processing (for marketplace matching)
  2. CV upload and parsing (for profile population)
  3. Wellbeing data collection (special category -- explicit consent required)
  4. Payment data processing (may use "contractual necessity" basis instead of consent)
  5. Marketing communications (separate opt-in, never pre-ticked)
  6. Impact reporting (anonymised aggregates -- may not need individual consent)
- Different data categories may use different lawful bases. Payment processing is likely "contractual necessity" (Article 6(1)(b)), not consent. Profile data for matching could be "legitimate interests" (Article 6(1)(f)) with a documented Legitimate Interest Assessment. Only use consent where you genuinely need it -- consent can be withdrawn, which may break your service if you over-rely on it.
- Build a consent management system from the start. Track: what was consented to, when, what version of the privacy notice was shown, and provide a UI for users to view and withdraw consent.
- Right to erasure: when a contributor requests deletion, you must delete across ALL systems -- PostgreSQL, S3 (CV files), Stripe (customer objects), any analytics/logging that contains PII. Build a deletion checklist early.

**Detection (warning signs):**
- Single consent checkbox at registration
- No consent audit trail in the database
- No documented lawful basis for each data processing activity
- No account deletion / data export feature planned
- Privacy notice not version-controlled

**Phase:** Architecture/design phase. Consent model is a data architecture decision that affects every feature.

**Confidence:** HIGH (ICO guidance is explicit on this)

---

### Pitfall 11: UK Regulatory Considerations for Stripe Connect Marketplace

**What goes wrong:** Operating a marketplace that handles payments in the UK has regulatory implications beyond just "use Stripe." If Indomitable Unity holds funds (even briefly), or if the fee structure looks like a commission on regulated activity, FCA questions may arise. Social enterprises have specific governance requirements that interact with payment processing.

**Prevention:**
- Use Stripe Connect in a way where Stripe holds all funds -- your platform never holds customer money. This avoids triggering Electronic Money Institution (EMI) or Payment Institution (PI) registration requirements with the FCA.
- Don't implement wallet balances or stored value for contributors. If contributors accumulate a balance on your platform, that may constitute e-money issuance, which requires FCA authorisation.
- Document your role as a marketplace intermediary, not a payment service provider. Stripe is the PSP; you're the platform connecting buyers and sellers.
- Stripe Payments UK Limited is the FCA-regulated entity (FRN: 900461). Lean on their compliance infrastructure.
- For the social enterprise structure: ensure your CIC/CIO articles of association align with operating a marketplace. Get legal advice on whether "deploying expertise for pay" intersects with employment agency regulations (Employment Agencies Act 1973). If contributors are being "supplied" to challengers, you may need to register with the Department for Business and Trade.

**Detection (warning signs):**
- Platform holding funds in its own bank account
- Implementing "wallet" or "balance" features
- No legal advice on employment agency classification
- Fee structure not documented for regulatory review

**Phase:** Pre-Phase 1 (legal/regulatory). These questions should be answered before writing code.

**Confidence:** MEDIUM (regulatory classification depends on specific implementation details; recommend legal counsel)

**Sources:**
- [Stripe: Understanding UK Payment Regulations](https://stripe.com/resources/more/uk-payment-regulations)
- [FCA Register: Stripe Payments UK Limited](https://register.fca.org.uk/s/firm?id=001b000000pibOHAAY)

---

## Minor Pitfalls

---

### Pitfall 12: Community Trust/Safety for Professional Platforms

**What goes wrong:** Developers assume "professionals won't misbehave." In reality, professional platforms face specific trust issues: credential fraud (claiming qualifications they don't have), inappropriate contact (using the platform to reach people for non-platform purposes), and scope creep (taking the relationship off-platform to avoid fees). Even with a 50-75 demographic, these issues arise.

**Prevention:**
- Verify professional claims during onboarding. For the pilot, this can be manual (Kirk or a team member reviews each profile). Don't auto-approve.
- Implement a reporting mechanism from day one. Even if it's just a "Report concern" button that sends an email.
- Add terms of service that explicitly address: off-platform payments, credential misrepresentation, and appropriate communication standards.
- For the pilot size (50-100 users), manual moderation is fine. Don't build automated moderation systems yet.
- Consider lightweight DBS check requirements for contributors who'll work with vulnerable populations (if applicable to any of your challenge categories).

**Detection (warning signs):**
- Auto-approved profiles with no review
- No reporting mechanism
- No terms of service addressing platform-specific behaviours
- No plan for handling the first complaint

**Phase:** Pilot launch phase. Keep it manual and simple.

**Confidence:** MEDIUM (general marketplace trust patterns applied to this context)

---

### Pitfall 13: MCP Server OAuth 2.1 Requirement for HTTP Transport

**What goes wrong:** The MCP specification (as of March 2025) requires OAuth 2.1 for HTTP-based transports. If Indomitable Unity's MCP server uses HTTP (SSE) transport and doesn't implement OAuth 2.1, it's non-compliant with the spec. Clients that enforce the spec will refuse to connect.

**Prevention:**
- If the MCP server is used locally (stdio transport), OAuth isn't required.
- If the MCP server is exposed over HTTP/SSE (for remote clients, web UI), implement OAuth 2.1 from the start.
- Use PKCE (Proof Key for Code Exchange) as OAuth 2.1 requires it.
- Don't roll your own OAuth server. Use an existing provider (Auth0, Clerk, or your own via a well-tested library like `oauth4webapi`).

**Detection (warning signs):**
- MCP server exposed over HTTP without any auth
- Custom OAuth implementation without PKCE
- Using OAuth 2.0 patterns instead of 2.1

**Phase:** MCP server architecture phase.

**Confidence:** MEDIUM (spec is evolving; verify current requirements at implementation time)

---

### Pitfall 14: Service Worker Caching Serves Stale Wellbeing Questionnaires

**What goes wrong:** Aggressive PWA caching serves outdated versions of wellbeing questionnaires (UCLA Loneliness Scale, WEMWBS). If you update the questionnaire wording, scoring, or add a new assessment, cached users see the old version. This corrupts data integrity if old and new scores are incomparable.

**Prevention:**
- Use `network-first` or `stale-while-revalidate` caching for all dynamic content, especially questionnaires and forms.
- Version your questionnaires. Include the version in the submitted data so you can distinguish responses to different versions.
- Never cache POST/PUT endpoints.
- Include a cache-busting mechanism: service worker version increments force re-download on next visit.

**Detection (warning signs):**
- Cache-first strategy for form/questionnaire pages
- No version field in questionnaire response data
- No service worker update mechanism

**Phase:** PWA implementation phase.

**Confidence:** HIGH (standard PWA best practice)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Architecture / Data Design | Wellbeing data not isolated as special category | Separate schema, separate encryption, APD + DPIA before code | Critical |
| Architecture / Data Design | Bundled GDPR consent | Granular consent model, per-purpose lawful basis | Critical |
| Architecture / Auth | LinkedIn as sole auth, token expiry trap | Email/password primary, LinkedIn optional enrichment | Critical |
| Architecture / Payments | Wrong Stripe Connect account type | Express accounts + destination charges, decided before code | Critical |
| Pre-Launch / Legal | Employment agency classification | Legal advice on whether platform triggers EAA 1973 | Critical |
| Recruitment / Go-to-market | Cold-start: building features before supply | Supply-first recruitment, 30+ contributors before challengers | High |
| Payment Implementation | Refund/dispute edge cases | Payout delays, dispute webhooks, balance checks | High |
| MCP Server | Agent-hostile error messages | Structured errors in result object, idempotent tools | High |
| UI/UX | Accessibility failures for 50-75 demographic | 7:1 contrast, 16px+ text, 48px targets, keyboard nav | High |
| CV Features | Parsing accuracy destroys trust | LLM-based parsing, review screen, confidence scores | High |
| PWA | Push notifications unreliable on iOS | Email/SMS primary, push as enhancement | Moderate |
| PWA | Stale cached questionnaires | Network-first caching, versioned questionnaires | Moderate |
| Community | Trust/safety gaps | Manual moderation at pilot scale, reporting mechanism | Moderate |
| MCP Server | OAuth 2.1 for HTTP transport | Implement if using HTTP/SSE transport | Moderate |

---

## Summary: Top 5 "Do This First or Regret It" Items

1. **Get legal advice on employment agency classification** before building anything. If deploying expertise for pay triggers the Employment Agencies Act, your entire business model needs a different legal wrapper.

2. **Write the DPIA and APD for wellbeing data** before writing any wellbeing feature code. These are legal prerequisites, not documentation chores.

3. **Choose Express accounts + destination charges for Stripe Connect** and document why. This decision is nearly irreversible.

4. **Build email/password auth first, LinkedIn second.** Don't let LinkedIn OAuth be a gate to anything.

5. **Set base font to 16px and contrast target to 7:1 in the design system** before any UI development. Retrofitting accessibility is 5x more expensive than building it in.

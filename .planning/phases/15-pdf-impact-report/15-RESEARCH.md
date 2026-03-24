# Phase 15: PDF Impact Report - Research

**Researched:** 2026-03-24
**Domain:** PDF generation (Node.js/pdfkit), Express streaming, React download trigger
**Confidence:** HIGH (core patterns verified against official docs and existing codebase)

---

## Summary

Phase 15 adds a CM-only endpoint that generates a branded PDF impact report for an institution on
demand and streams the bytes directly to the browser. No file is stored; each request generates
fresh output. The frontend adds a "Generate Report" button with loading state and a date range
input to the InstitutionManagement page.

The chosen library is **pdfkit ^0.18.0** — a Node.js streaming PDF library selected in prior
research over react-pdf/renderer (ESM breakage issues) and Puppeteer (300 MB binary, slow cold
start). Version 0.18.0 shipped on 2026-03-14 and added native table support (0.17.0) and
accessibility improvements.

**Critical ESM finding:** pdfkit is CJS-only internally and references `__dirname`. The server
uses `"type": "module"` with `module: "Node16"` and `esModuleInterop: true`. Default import
(`import PDFDocument from 'pdfkit'`) works at the TypeScript level, but pdfkit may crash at
runtime when it resolves its built-in fonts because `__dirname` is undefined in ESM scope. The
confirmed workaround is to **always pass an explicit `font:` path** in the PDFDocument
constructor and for every `doc.font()` call — never rely on pdfkit's built-in font auto-discovery.
This makes the font path a required decision, not an optional style concern.

**Primary recommendation:** Use pdfkit 0.18.0, bundle an Inter or a system-compatible TTF inside
`packages/server/src/pdf/fonts/`, import pdfkit with `import PDFDocument from 'pdfkit'`
(esModuleInterop handles the CJS default), pass `{ font: absoluteFontPath }` in the constructor,
and pipe `doc` directly to the Express `res` stream.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfkit | ^0.18.0 | PDF generation and streaming | Decided in v1.2 research; native table support in 0.17+; small, zero-binary |
| @types/pdfkit | ^0.17.5 | TypeScript types for pdfkit | DefinitelyTyped — last published ~19 days ago, current |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:path | built-in | Build absolute font path from `import.meta.url` | Required for ESM `__dirname` workaround |
| node:url | built-in | `fileURLToPath(import.meta.url)` to get `__dirname` equivalent | Same workaround |

### Alternatives Considered (locked out by prior decision)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdfkit | @react-pdf/renderer | 3 open ESM breakage issues — rejected |
| pdfkit | Puppeteer/headless Chrome | 300 MB binary, 2-5 s cold start — rejected |

**Installation:**
```bash
pnpm --filter @indomitable-unity/server add pdfkit
pnpm --filter @indomitable-unity/server add -D @types/pdfkit
```

---

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── pdf/
│   ├── fonts/              # TTF font files committed to repo
│   │   └── Inter-Regular.ttf
│   │   └── Inter-Bold.ttf
│   └── institution-report.ts   # PDF document builder (pure function)
├── routes/
│   └── admin.ts            # New route: GET /institutions/:slug/report.pdf
```

### Pattern 1: ESM-safe pdfkit import and font resolution

**What:** Use `fileURLToPath` + `dirname` to reconstruct `__dirname`, then build an absolute font
path. Pass `font:` in the PDFDocument constructor. Never use pdfkit's built-in font names
(Helvetica, Courier, etc.) without also having a fallback path, because built-in font resolution
uses `__dirname` internally.

**When to use:** Mandatory whenever pdfkit is used in this ESM (`"type": "module"`) codebase.

**Example:**
```typescript
// Source: pdfkit GitHub issue #1491 confirmed workaround
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS = {
  regular: join(__dirname, "fonts", "Inter-Regular.ttf"),
  bold: join(__dirname, "fonts", "Inter-Bold.ttf"),
};

export function buildInstitutionReport(data: ReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    font: FONTS.regular,   // explicit — avoids __dirname crash
    size: "A4",
    margin: 50,
    info: {
      Title: `Impact Report — ${data.institutionName}`,
      Author: "Indomitable Unity",
    },
  });
  return doc;
}
```

### Pattern 2: Streaming PDF directly to Express response

**What:** Pipe the pdfkit document directly to `res`. Set headers before piping. Call `doc.end()`
after all content is written. Do NOT buffer the entire PDF in memory.

**When to use:** Always — requirement PDF-03 explicitly prohibits S3 storage.

**Example:**
```typescript
// Source: pdfkit.org/docs/getting_started.html
router.get("/institutions/:slug/report.pdf", async (req, res) => {
  // ... fetch data, validate ...
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="impact-report-${slug}.pdf"`,
  );
  res.setHeader("Cache-Control", "no-store");

  const doc = buildInstitutionReport(reportData);
  doc.pipe(res);
  doc.end();
});
```

### Pattern 3: Route placement on adminRouter

**What:** The PDF endpoint requires CM auth. The `adminRouter` applies
`authMiddleware + requireRole("community_manager")` to all routes at the top via
`router.use(authMiddleware, requireRole("community_manager"))`. Add the route there.

**Resulting URL:** `GET /api/admin/institutions/:slug/report.pdf`

Note: The roadmap plan description says `/api/institutions/:slug/report.pdf`, but the
institution-public router has no auth. Given the CM-auth requirement and the `adminRouter`
middleware pattern, the canonical URL is `/api/admin/institutions/:slug/report.pdf`.
The planner must resolve this explicitly.

**Example:**
```typescript
// In packages/server/src/routes/admin.ts, after existing routes
router.get("/institutions/:slug/report.pdf", async (req, res) => {
  const slug = req.params["slug"] as string;
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid institution slug" });
    return;
  }
  // fetch institution + stats, guard empty state, stream PDF
});
```

### Pattern 4: Frontend file download (no apiClient — needs blob)

**What:** `apiClient` always calls `res.json()` on success. For binary file download, use raw
`fetch` with `credentials: "include"` and read as `blob()`, then create an object URL.

**When to use:** Any binary-download endpoint (this is the only one in the codebase so far).

**Example:**
```typescript
// Source: MDN File API patterns
async function downloadReport(slug: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/institutions/${slug}/report.pdf`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Report generation failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `impact-report-${slug}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Pattern 5: pdfkit table API (native, v0.17+)

**What:** pdfkit 0.17 introduced native table support. Use `doc.table()` for the stats summary.
Column widths are specified with `"*"` (auto) or numeric points. Cell styling uses `backgroundColor`,
`textColor`, `border`, and `font` properties.

**Example:**
```typescript
// Source: pdfkit.org/docs/table.html
doc.table({
  columnStyles: [200, "*", "*"],
  defaultStyle: {
    padding: 8,
    border: [false, false, true, false],
    borderColor: "#e5e7eb",
  },
  data: [
    [{ text: "Metric", font: { family: FONTS.bold } }, "Value", ""],
    ["Contributors", String(stats.contributors), ""],
    ["Active Challenges", String(stats.challenges), ""],
    ["Total Hours Logged", String(stats.hours), ""],
  ],
});
```

### Anti-Patterns to Avoid

- **Relying on pdfkit built-in font names without explicit paths:** pdfkit resolves 'Helvetica'
  and 'Courier' via `__dirname` internally. In an ESM project this crashes at runtime. Always
  pass TTF paths.
- **Buffering the whole PDF before sending:** Accumulating PDF bytes in memory defeats the
  streaming requirement and wastes memory at scale. Pipe `doc` directly to `res`.
- **Using apiClient for the download trigger:** `apiClient` parses the response as JSON. The
  binary download needs raw `fetch` + `.blob()`.
- **Calling `doc.end()` before all synchronous content is written:** PDFKit writes synchronously
  to an internal stream; `doc.end()` flushes it. All `doc.text()`, `doc.table()`, etc. calls
  must happen before `doc.end()`.
- **Missing `Cache-Control: no-store`:** Requirement PDF-03 specifies "no file appears in S3; a
  second download generates a fresh document." The HTTP cache must also not serve stale copies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF byte generation | Custom PDF serialiser | pdfkit | PDF is a complex binary format with compression, fonts, cross-reference tables |
| PDF table layout | Manual `doc.rect()` grid | pdfkit native `doc.table()` (v0.17+) | Handles cell padding, borders, column sizing, row spanning |
| Font metrics / text wrapping | Custom line-break logic | pdfkit `doc.text()` with `width` option | pdfkit computes glyph widths from embedded font data |
| HTTP streaming | Custom chunked-transfer wrapper | `doc.pipe(res)` | pdfkit is a Node ReadableStream; Express res is a WritableStream |

**Key insight:** Attempting a hand-rolled PDF table for a report with 4 data rows and a header
section would take longer and produce worse output than pdfkit's native table, which handles
page breaks, cell borders, and font embedding automatically.

---

## Common Pitfalls

### Pitfall 1: pdfkit `__dirname` crash in ESM
**What goes wrong:** `ReferenceError: __dirname is not defined` at runtime when pdfkit tries to
resolve built-in fonts or the fontkit sub-library's asset paths.
**Why it happens:** pdfkit is a CJS package that uses `__dirname` for asset resolution; ESM
modules don't define `__dirname`.
**How to avoid:** Always pass `{ font: absolutePath }` to `new PDFDocument()` and every
`doc.font()` call. Store TTF files in `packages/server/src/pdf/fonts/` and resolve their paths
with `fileURLToPath(import.meta.url)`.
**Warning signs:** If the route crashes with `__dirname is not defined` or a font-not-found error,
the explicit path is missing somewhere.

### Pitfall 2: Headers sent after streaming starts
**What goes wrong:** `Error: Cannot set headers after they are sent to the client` if an error
is thrown after `doc.pipe(res)` has begun.
**Why it happens:** Once Express starts piping bytes to the response, headers are flushed. An
exception that tries to send `res.status(500).json(...)` fails.
**How to avoid:** Perform ALL data fetching, validation, and empty-state checks BEFORE calling
`doc.pipe(res)`. The route should follow the pattern: fetch → validate → check empty-state →
set headers → pipe → write content → end.
**Warning signs:** Partial PDF file arriving in browser followed by a network error.

### Pitfall 3: Institution identified by slug vs. id
**What goes wrong:** The CM sees institutions by name/slug on the UI, but the admin routes use
UUID `id`. The PDF route uses `:slug` (matching the roadmap plan and the public institutions
route pattern).
**Why it happens:** The existing admin institution routes use UUID (e.g.,
`/institutions/:id/contributors`). The PDF route uses slug for a cleaner URL and consistency
with the public `/api/institutions/:slug` endpoint. The server must look up the institution by
slug.
**How to avoid:** In the PDF route, look up the institution using `eq(institutions.slug, slug)`.
Reuse the `SLUG_PATTERN` regex already defined in `admin.ts` for validation.
**Warning signs:** 404 returned when a valid institution slug is requested.

### Pitfall 4: Empty-state — no contributors assigned
**What goes wrong:** Generating a report for an institution with no contributors produces a PDF
with null/zero stats or misleading data.
**Why it happens:** The Phase 12 live-stats query returns `null` when `memberIds.length === 0`
(established in prior decisions).
**How to avoid:** Check `liveStats === null` and return HTTP 422 with a JSON error body
_before_ `doc.pipe(res)`. The frontend button should handle this with a user-facing message.
**Warning signs:** A blank or confusing PDF being generated for institutions without contributors.

### Pitfall 5: Date range query scope
**What goes wrong:** The requirements specify "date range" in the report, but the existing
`contributorHours` and `challengeInterests` tables do not have a pre-built date-filtered query.
**Why it happens:** Phase 12 queries aggregate ALL-TIME hours and challenges. Date filtering
requires `WHERE hoursLogged.createdAt BETWEEN startDate AND endDate`.
**How to avoid:** The PDF route handler needs `startDate` / `endDate` query parameters (ISO date
strings). Add `WHERE` clauses to the hours and challenge-interests queries. Both tables have
`createdAt` columns in the Drizzle schema.
**Warning signs:** Report showing all-time data regardless of the selected date range.

### Pitfall 6: Font file size and commit hygiene
**What goes wrong:** Committing large font files (Inter variable font is ~300 KB, Inter complete
family is ~3 MB) inflates the repo.
**Why it happens:** Font files must be co-located with the server binary for the ESM `__dirname`
workaround to resolve paths reliably at runtime.
**How to avoid:** Use the **Inter static subset** — Regular and Bold only. Inter-Regular.ttf ≈
96 KB, Inter-Bold.ttf ≈ 96 KB. These are acceptable to commit. Source from
`rsms.me/inter/` or the `@fontsource/inter` npm package. Do NOT commit the full variable font.
**Warning signs:** Large `git add` for font files.

---

## Code Examples

Verified patterns from official sources and existing codebase conventions:

### Route skeleton (admin.ts addition)
```typescript
// Reuses SLUG_PATTERN already in admin.ts
router.get("/institutions/:slug/report.pdf", async (req, res) => {
  const slug = req.params["slug"] as string;
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid institution slug" });
    return;
  }

  const { from, to } = req.query as { from?: string; to?: string };
  const startDate = from ? new Date(from) : null;
  const endDate = to ? new Date(to) : null;

  const db = getDb();

  const [institution] = await db
    .select()
    .from(institutions)
    .where(eq(institutions.slug, slug))
    .limit(1);

  if (!institution) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // ... compute stats, guard empty state ...

  // All checks done BEFORE piping
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="impact-report-${slug}.pdf"`);
  res.setHeader("Cache-Control", "no-store");

  const doc = buildInstitutionReport({ institution, stats, dateRange: { startDate, endDate } });
  doc.pipe(res);
  doc.end();
});
```

### institution-report.ts skeleton
```typescript
// Source: pdfkit.org/docs/getting_started.html + verified ESM workaround
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS = {
  regular: join(__dirname, "fonts", "Inter-Regular.ttf"),
  bold: join(__dirname, "fonts", "Inter-Bold.ttf"),
};

// Brand hex equivalents (converted from OKLCH design tokens)
const BRAND = {
  navy: "#1a1d2e",       // oklch(0.18 0.04 260) primary-900
  navyMid: "#30354f",    // oklch(0.30 0.06 260) primary-700 — approximate
  amber: "#c89a30",      // oklch(0.72 0.17 75) accent-500 — approximate
  nearWhite: "#f7f7fa",  // oklch(0.97 0.003 260) neutral-50 — approximate
  midGrey: "#787880",    // oklch(0.55 0.01 260) neutral-500 — approximate
  border: "#d9d9e0",     // oklch(0.85 0.01 260) neutral-200 — approximate
};

export interface ReportData {
  institutionName: string;
  institutionCity: string | null;
  stats: { contributors: number; challenges: number; hours: number };
  generatedAt: Date;
  dateRange: { startDate: Date | null; endDate: Date | null };
}

export function buildInstitutionReport(data: ReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    font: FONTS.regular,
    size: "A4",
    margin: 50,
    info: {
      Title: `Impact Report — ${data.institutionName}`,
      Author: "Indomitable Unity",
      Subject: "Contributor impact summary",
    },
  });

  // Header band
  doc
    .rect(0, 0, doc.page.width, 80)
    .fill(BRAND.navy);

  doc
    .fillColor("#ffffff")
    .font(FONTS.bold)
    .fontSize(22)
    .text("Indomitable Unity", 50, 20);

  doc
    .fillColor(BRAND.amber)
    .font(FONTS.regular)
    .fontSize(11)
    .text("Deploying Expertise That Hasn't Passed Its Sell-By Date.", 50, 48);

  // Report title
  doc
    .fillColor(BRAND.navy)
    .font(FONTS.bold)
    .fontSize(18)
    .text("Impact Report", 50, 110);

  doc
    .fillColor(BRAND.midGrey)
    .font(FONTS.regular)
    .fontSize(12)
    .text(data.institutionName, 50, 136);

  // Stats table (pdfkit native table API, v0.17+)
  doc.moveDown(2);
  doc.table({
    columnStyles: ["*", "*"],
    defaultStyle: {
      padding: 10,
      border: [false, false, true, false],
      borderColor: BRAND.border,
      font: { family: FONTS.regular },
    },
    data: [
      [
        { text: "Metric", font: { family: FONTS.bold }, backgroundColor: BRAND.nearWhite },
        { text: "Value", font: { family: FONTS.bold }, backgroundColor: BRAND.nearWhite },
      ],
      ["Contributors", String(data.stats.contributors)],
      ["Active Challenges", String(data.stats.challenges)],
      ["Total Hours Logged", String(data.stats.hours)],
    ],
  });

  // Footer
  const footerY = doc.page.height - 40;
  doc
    .fillColor(BRAND.midGrey)
    .font(FONTS.regular)
    .fontSize(9)
    .text(
      `Generated ${data.generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      50,
      footerY,
      { align: "right" },
    );

  return doc;
}
```

### Frontend download function (raw fetch, not apiClient)
```typescript
// packages/web/src/api/admin.ts addition
export async function downloadInstitutionReport(
  slug: string,
  from?: string,
  to?: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(
    `${API_BASE_URL}/api/admin/institutions/${slug}/report.pdf${query}`,
    { credentials: "include" },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Report generation failed" }));
    throw new Error((err as { error: string }).error);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `impact-report-${slug}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Button loading state pattern (matches existing codebase)
```tsx
// Pattern from AttentionDashboard.tsx and existing Button component
const [isGenerating, setIsGenerating] = useState(false);
const [reportError, setReportError] = useState<string | null>(null);

const handleGenerateReport = async () => {
  setIsGenerating(true);
  setReportError(null);
  try {
    await downloadInstitutionReport(institution.slug, from, to);
  } catch (err) {
    setReportError(err instanceof Error ? err.message : "Failed to generate report");
  } finally {
    setIsGenerating(false);
  }
};

<Button
  variant="outline"
  onClick={() => void handleGenerateReport()}
  loading={isGenerating}
  disabled={isGenerating || !institution.stats}
>
  Generate Report
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer/headless PDF | pdfkit programmatic PDF | Project-start decision | Zero extra binary, instant cold start |
| pdfkit external table plugin (pdfkit-table) | pdfkit native `doc.table()` | pdfkit v0.17.0 (April 2025) | No extra dependency; better maintained |
| Buffer full PDF in memory, send | Pipe doc stream to res | Always recommended | Constant memory regardless of PDF size |

**Deprecated/outdated:**
- `pdfkit-table` (npm package): Superseded by native table support in pdfkit v0.17+. Do not add this dependency.
- `doc.write()` and `doc.output()`: Removed in pdfkit v0.5+. Use `doc.pipe()` + `doc.end()`.

---

## Open Questions

1. **Route URL: `/api/admin/institutions/:slug/report.pdf` vs. `/api/institutions/:slug/report.pdf`**
   - What we know: Roadmap plan text says `/api/institutions/:slug/report.pdf`; the auth
     requirement (CM-only) means it must live behind the `adminRouter` middleware.
   - What's unclear: Whether the intent was to add a second auth guard to the public
     institution router or to place it on the admin router under a different URL.
   - Recommendation: Planner should use `/api/admin/institutions/:slug/report.pdf` (admin router,
     no new middleware needed). Frontend will call this URL. If the roadmap URL was the intent,
     that requires adding `authMiddleware + requireRole` inline on the public router, which is
     non-standard for this codebase.

2. **Exact hex values for OKLCH brand colours**
   - What we know: The CSS uses OKLCH; pdfkit requires hex/RGB. Approximate conversions are
     provided in this document.
   - What's unclear: Whether the exact OKLCH→sRGB conversions matter at PDF quality, or if
     close approximations are acceptable.
   - Recommendation: The planner should treat the provided hex values as working approximations.
     A visual check during implementation is sufficient. Exact conversion requires a browser-side
     CSS engine; the PDF will render on paper where sub-1% colour differences are imperceptible.

3. **Font source: bundle TTF vs. reference system font**
   - What we know: Bundling TTF is the required workaround for the ESM `__dirname` issue;
     system fonts (e.g., Windows/Linux paths) are not portable across deploy environments.
   - What's unclear: Which Inter weight files to use (Google Fonts subset vs. full charset).
   - Recommendation: Download Inter-Regular.ttf and Inter-Bold.ttf from `rsms.me/inter/` (the
     canonical Inter source). Both files are ~96 KB each — acceptable to commit.

4. **Date range: query params vs. request body**
   - What we know: This is a GET request (streaming file download); POST with body is awkward
     for a download trigger and incompatible with the `<a download>` pattern.
   - What's unclear: Whether the date range is mandatory or optional (defaults to all-time).
   - Recommendation: Make `from` and `to` query parameters optional. When absent, query all-time
     data and note "All time" in the PDF header.

---

## Sources

### Primary (HIGH confidence)
- pdfkit.org/docs/getting_started.html — streaming to HTTP response, `doc.pipe(res)`, `doc.end()`
- pdfkit.org/docs/table.html — native table API: `doc.table()`, `columnStyles`, cell options (v0.17+)
- github.com/foliojs/pdfkit/issues/1491 — ESM incompatibility confirmed by maintainer (March 2024);
  explicit font path as workaround
- Existing codebase: `packages/server/src/routes/admin.ts` — `SLUG_PATTERN`, `adminRouter` guard
  pattern, UUID validation
- Existing codebase: `packages/server/src/routes/institutions.ts` — live stats query pattern
  (contributors, challenges, hours from three tables)
- Existing codebase: `packages/web/src/styles/app.css` — brand OKLCH colour tokens
- Existing codebase: `packages/web/src/api/client.ts` — apiClient only handles JSON; raw fetch
  needed for binary

### Secondary (MEDIUM confidence)
- pdfbolt.com/blog/generate-pdf-pdfkit-nodejs — pdfkit Express streaming pattern confirmed;
  `res.setHeader` + `doc.pipe(res)` pattern
- github.com/foliojs/pdfkit CHANGELOG.md — v0.17.0 native table; v0.18.0 latest (2026-03-14)

### Tertiary (LOW confidence)
- Approximate OKLCH→hex conversions in this document: derived manually from lightness/chroma/hue
  values. Treat as close starting points; validate visually during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pdfkit is pre-decided; version and types package verified via npm/GitHub
- Architecture: HIGH — patterns directly derived from official pdfkit docs and existing codebase
  conventions (adminRouter guard, slug pattern, live stats query shape)
- ESM workaround: HIGH — confirmed by pdfkit maintainer in GitHub issue #1491
- Native table API: HIGH — verified against pdfkit.org/docs/table.html (v0.17+ feature)
- Pitfalls: HIGH — all derived from concrete codebase facts or official issue confirmations
- OKLCH hex conversions: LOW — manual approximations, not run through a colour profile engine

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (pdfkit is stable; ESM situation unlikely to change before then)

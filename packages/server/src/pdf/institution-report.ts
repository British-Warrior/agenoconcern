import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS = {
  regular: join(__dirname, "fonts", "Inter-Regular.ttf"),
  bold: join(__dirname, "fonts", "Inter-Bold.ttf"),
};

// Brand colours
const NAVY = "#1a1d2e";
const AMBER = "#c89a30";
const MID_GREY = "#787880";
const LIGHT_GREY = "#f0f0f2";
const WHITE = "#ffffff";

export interface ReportData {
  institutionName: string;
  institutionCity: string | null;
  stats: { contributors: number; challenges: number; hours: number };
  generatedAt: Date;
  dateRange: { startDate: Date | null; endDate: Date | null };
  wellbeingBand?: "Low" | "Typical" | "High" | null;
  wellbeingMessage?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function dateRangeLabel(range: ReportData["dateRange"]): string {
  const { startDate, endDate } = range;
  if (!startDate && !endDate) return "All time";
  if (startDate && endDate) return `${formatDate(startDate)} – ${formatDate(endDate)}`;
  if (startDate) return `From ${formatDate(startDate)}`;
  return `Up to ${formatDate(endDate!)}`;
}

export function buildInstitutionReport(data: ReportData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    font: FONTS.regular,
    size: "A4",
    margin: 50,
    info: {
      Title: `Impact Report — ${data.institutionName}`,
      Author: "Indomitable Unity",
    },
  });

  const pageWidth = doc.page.width;

  // ── Header band ─────────────────────────────────────────────────────────────
  doc
    .rect(0, 0, pageWidth, 80)
    .fill(NAVY);

  doc
    .font(FONTS.bold)
    .fontSize(22)
    .fillColor(WHITE)
    .text("Indomitable Unity", 50, 20, { lineBreak: false });

  doc
    .font(FONTS.regular)
    .fontSize(11)
    .fillColor(AMBER)
    .text("Deploying Expertise That Hasn't Passed Its Sell-By Date.", 50, 48, { lineBreak: false });

  // ── Report title section ─────────────────────────────────────────────────────
  let y = 110;

  doc
    .font(FONTS.bold)
    .fontSize(18)
    .fillColor(NAVY)
    .text("Impact Report", 50, y, { lineBreak: false });

  y += 28;

  doc
    .font(FONTS.regular)
    .fontSize(12)
    .fillColor(MID_GREY)
    .text(data.institutionName, 50, y, { lineBreak: false });

  y += 20;

  if (data.institutionCity) {
    doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(MID_GREY)
      .text(data.institutionCity, 50, y, { lineBreak: false });
    y += 18;
  }

  doc
    .font(FONTS.regular)
    .fontSize(11)
    .fillColor(MID_GREY)
    .text(dateRangeLabel(data.dateRange), 50, y, { lineBreak: false });

  y += 40;

  // ── Stats section ────────────────────────────────────────────────────────────
  // Header bar
  const statsX = 50;
  const statsWidth = pageWidth - 100;
  doc
    .rect(statsX, y, statsWidth, 30)
    .fill(NAVY);

  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(WHITE)
    .text("Metric", statsX + 16, y + 9, { lineBreak: false });

  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(WHITE)
    .text("Value", statsX + statsWidth - 120, y + 9, { lineBreak: false });

  y += 30;

  const statRows = [
    { label: "Contributors", value: data.stats.contributors.toLocaleString("en-GB") },
    { label: "Challenges participated", value: data.stats.challenges.toLocaleString("en-GB") },
    { label: "Total hours logged", value: data.stats.hours.toLocaleString("en-GB") },
  ];

  for (let i = 0; i < statRows.length; i++) {
    const rowBg = i % 2 === 0 ? WHITE : LIGHT_GREY;
    doc.rect(statsX, y, statsWidth, 28).fill(rowBg);

    doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(NAVY)
      .text(statRows[i].label, statsX + 16, y + 8, { lineBreak: false });

    doc
      .font(FONTS.bold)
      .fontSize(11)
      .fillColor(NAVY)
      .text(statRows[i].value, statsX + statsWidth - 120, y + 8, { lineBreak: false });

    y += 28;
  }

  // ── Wellbeing band row ────────────────────────────────────────────────────────
  if (data.wellbeingBand !== undefined) {
    const wellbeingRowBg = statRows.length % 2 === 0 ? WHITE : LIGHT_GREY;
    doc.rect(statsX, y, statsWidth, 28).fill(wellbeingRowBg);

    doc
      .font(FONTS.regular)
      .fontSize(11)
      .fillColor(NAVY)
      .text("Wellbeing Band", statsX + 16, y + 8, { lineBreak: false });

    const bandValue = data.wellbeingBand
      ? data.wellbeingBand
      : "—";

    doc
      .font(FONTS.bold)
      .fontSize(11)
      .fillColor(NAVY)
      .text(bandValue, statsX + statsWidth - 120, y + 8, { lineBreak: false });

    y += 28;

    // Suppression or note message
    if (data.wellbeingMessage) {
      doc
        .font(FONTS.regular)
        .fontSize(9)
        .fillColor(MID_GREY)
        .text(data.wellbeingMessage, statsX + 16, y + 8, {
          width: statsWidth - 32,
          lineBreak: true,
        });
      y += 32;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 50;
  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(MID_GREY)
    .text(
      `Generated ${formatDate(data.generatedAt)} · Indomitable Unity`,
      50,
      footerY,
      { align: "center", width: statsWidth },
    );

  return doc;
}

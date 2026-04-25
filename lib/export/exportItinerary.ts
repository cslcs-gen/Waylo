// ============================================================
// lib/export/exportItinerary.ts — Client-side export engine
// Supports: PDF (jsPDF), XLSX (SheetJS), PPTX (pptxgenjs), DOCX (docx)
// ============================================================
import type { TripCard, ParsedTrip } from "@/types/trip";

// ─── PDF ─────────────────────────────────────────────────────
export async function exportToPDF(trip: ParsedTrip, cards: TripCard[]) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const margin = 20;
  let y = margin;

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`✈ ${trip.destination} Itinerary`, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${trip.duration_days} days · ${trip.travel_dates.month}${trip.budget_usd ? ` · $${trip.budget_usd.toLocaleString()} budget` : ""}`,
    margin,
    y
  );
  y += 12;
  doc.setTextColor(0, 0, 0);

  // Group cards by category
  const grouped = groupByCategory(cards);

  for (const [category, items] of Object.entries(grouped)) {
    if (y > 260) { doc.addPage(); y = margin; }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(category, margin, y);
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    for (const card of items) {
      if (y > 255) { doc.addPage(); y = margin; }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`• ${card.title}`, margin + 3, y);
      y += 5;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${card.location} · ${card.duration}${card.priceRange ? ` · ${card.priceRange}` : ""}`, margin + 6, y);
      y += 5;

      const lines = doc.splitTextToSize(card.whyVisit, pageW - margin * 2 - 6);
      doc.setTextColor(60, 60, 60);
      doc.text(lines, margin + 6, y);
      y += lines.length * 4 + 5;
      doc.setTextColor(0, 0, 0);
    }
    y += 4;
  }

  doc.save(`${trip.destination.toLowerCase().replace(/\s+/g, "-")}-itinerary.pdf`);
}

// ─── XLSX ─────────────────────────────────────────────────────
export async function exportToXLSX(trip: ParsedTrip, cards: TripCard[]) {
  const XLSX = await import("xlsx");

  const rows = [
    [`${trip.destination} Itinerary`, "", "", "", ""],
    [`Duration: ${trip.duration_days} days`, `Month: ${trip.travel_dates.month}`, `Budget: $${trip.budget_usd ?? "Flexible"}`, "", ""],
    [""],
    ["Category", "Title", "Location", "Duration", "Price Range", "Why Visit", "Link"],
    ...cards.map((c) => [
      c.category,
      c.title,
      c.location,
      c.duration,
      c.priceRange ?? "",
      c.whyVisit,
      c.referenceUrl,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 14 }, { wch: 28 }, { wch: 24 },
    { wch: 14 }, { wch: 12 }, { wch: 55 }, { wch: 36 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
  XLSX.writeFile(wb, `${trip.destination.toLowerCase().replace(/\s+/g, "-")}-itinerary.xlsx`);
}

// ─── PPTX ─────────────────────────────────────────────────────
export async function exportToPPTX(trip: ParsedTrip, cards: TripCard[]) {
  const { default: pptxgen } = await import("pptxgenjs");
  const prs = new pptxgen();

  prs.layout = "LAYOUT_WIDE";
  prs.theme = { headFontFace: "Helvetica", bodyFontFace: "Helvetica" };

  // Title slide
  const titleSlide = prs.addSlide();
  titleSlide.background = { color: "111111" };
  titleSlide.addText(`✈ ${trip.destination}`, {
    x: 0.8, y: 1.2, w: "90%", h: 1.2,
    fontSize: 40, bold: true, color: "FFFFFF",
  });
  titleSlide.addText(
    `${trip.duration_days} days · ${trip.travel_dates.month}${trip.budget_usd ? ` · $${trip.budget_usd.toLocaleString()}` : ""}`,
    { x: 0.8, y: 2.6, w: "90%", h: 0.5, fontSize: 16, color: "AAAAAA" }
  );
  titleSlide.addText(`Interests: ${trip.interests.join(", ")}`, {
    x: 0.8, y: 3.2, w: "90%", h: 0.5, fontSize: 14, color: "888888",
  });

  // One slide per card
  for (const card of cards) {
    const slide = prs.addSlide();
    slide.background = { color: "FAFAF9" };

    // Category badge
    slide.addText(card.category.toUpperCase(), {
      x: 0.4, y: 0.3, w: 2, h: 0.3,
      fontSize: 9, bold: true, color: "888888", charSpacing: 2,
    });

    // Title
    slide.addText(card.title, {
      x: 0.4, y: 0.7, w: 5.5, h: 0.7,
      fontSize: 24, bold: true, color: "111111",
    });

    // Meta
    slide.addText(`📍 ${card.location}   ⏱ ${card.duration}${card.priceRange ? `   ${card.priceRange}` : ""}`, {
      x: 0.4, y: 1.5, w: 6, h: 0.4,
      fontSize: 12, color: "888888",
    });

    // Why Visit
    slide.addText(card.whyVisit, {
      x: 0.4, y: 2.1, w: 5.8, h: 1.0,
      fontSize: 14, color: "444444", lineSpacingMultiple: 1.35,
    });

    // Reference link
    slide.addText(`Learn more →`, {
      x: 0.4, y: 3.3, w: 3, h: 0.35,
      fontSize: 11, color: "4F8EF7", hyperlink: { url: card.referenceUrl },
    });
  }

  await prs.writeFile({
    fileName: `${trip.destination.toLowerCase().replace(/\s+/g, "-")}-itinerary.pptx`,
  });
}

// ─── DOCX ─────────────────────────────────────────────────────
export async function exportToDOCX(trip: ParsedTrip, cards: TripCard[]) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, AlignmentType, BorderStyle } =
    await import("docx");

  const grouped = groupByCategory(cards);
  const children: unknown[] = [];

  // Doc title
  children.push(
    new Paragraph({
      text: `✈ ${trip.destination} Itinerary`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${trip.duration_days} days · ${trip.travel_dates.month}`,
          color: "888888", size: 22,
        }),
        ...(trip.budget_usd
          ? [new TextRun({ text: ` · $${trip.budget_usd.toLocaleString()} budget`, color: "888888", size: 22 })]
          : []),
      ],
      spacing: { after: 400 },
    })
  );

  for (const [category, items] of Object.entries(grouped)) {
    children.push(
      new Paragraph({
        text: category,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E5E5E5" } },
      })
    );

    for (const card of items) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: card.title, bold: true, size: 26 })],
          spacing: { before: 200, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `📍 ${card.location}  ·  ⏱ ${card.duration}`, color: "888888", size: 20 }),
            ...(card.priceRange ? [new TextRun({ text: `  ·  ${card.priceRange}`, color: "888888", size: 20 })] : []),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: card.whyVisit, size: 22, color: "444444" })],
          spacing: { after: 80 },
          alignment: AlignmentType.JUSTIFIED,
        }),
        new Paragraph({
          children: [
            new ExternalHyperlink({
              link: card.referenceUrl,
              children: [new TextRun({ text: "Learn more →", style: "Hyperlink", size: 20 })],
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: { default: { document: { run: { font: "Helvetica", size: 22 } } } },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${trip.destination.toLowerCase().replace(/\s+/g, "-")}-itinerary.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helper ───────────────────────────────────────────────────
function groupByCategory(cards: TripCard[]): Record<string, TripCard[]> {
  return cards.reduce<Record<string, TripCard[]>>((acc, card) => {
    if (!acc[card.category]) acc[card.category] = [];
    acc[card.category].push(card);
    return acc;
  }, {});
}

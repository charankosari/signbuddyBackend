const fs = require("fs");
const path = require("path");
const {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName, // Needed for link annotation
} = require("pdf-lib");
/**
 * Builds a single-page PDF with the audit info (finalData).
 * Returns the PDF as a Uint8Array buffer.
 *
 * @param {Object} data - The finalData object with documentName, etc.
 * @param {number} pageWidth - Page width in PDF points (e.g. ~595.28 for A4).
 * @param {number} pageHeight - Page height in PDF points (e.g. ~841.89 for A4).
 * @returns {Promise<Uint8Array>} PDF bytes as a buffer.
 */
async function createAuditPdfBuffer(data, pageWidth, pageHeight) {
  // 1. Create a new blank PDF
  const pdfDoc = await PDFDocument.create();

  // Optional: embed a check icon if you need it for the footer
  let checkIconImage;
  try {
    const checkIconPath = path.join(__dirname, "../assets/check.png");
    const checkIconBytes = fs.readFileSync(checkIconPath);
    checkIconImage = await pdfDoc.embedPng(checkIconBytes);
  } catch (err) {
    console.error("Error reading check icon file:", err);
  }

  // Some sizes
  const SmallTextSize = 42;
  const BigTextSize = 52;
  const footerIconWidth = 32;
  const footerIconHeight = 32;

  // 2. Add one page at the specified size
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // 3. Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout constants
  let x = 50; // left margin
  let y = pageHeight - 50; // top margin
  const lineHeight = 15;

  // Helper to draw text & update y
  function drawLineOfText(
    txt,
    font = helvetica,
    size = 12,
    color = rgb(0, 0, 0)
  ) {
    page.drawText(txt, { x, y, font, size, color });
    y -= lineHeight;
  }

  // --- Title: SignBuddy ---
  page.drawText("SignBuddy", {
    x,
    y,
    font: helveticaBold,
    size: BigTextSize,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight + 10;

  // === Make "Document is verified & completed with signbuddy.in" a LINK ===
  const linkText = "Document is verified & completed with signbuddy.in";
  const linkFontSize = 12;

  // 1) Draw the text
  page.drawText(linkText, {
    x,
    y,
    font: helvetica,
    size: linkFontSize,
    color: rgb(0, 0, 1), // typically links are bluish
  });

  // 2) Measure its width
  const linkWidth = helvetica.widthOfTextAtSize(linkText, linkFontSize);

  // 3) Create a Link annotation
  //    The annotation rect is [left, bottom, right, top] in PDF coordinates.
  //    Because we just drew the text at (x, y) with size=12, the top is y+12
  //    and the right is x+linkWidth.
  const linkAnnotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + linkWidth, y + linkFontSize],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: "https://signbuddy.in", // <-- clickable URL
    },
  });

  // 4) Attach the annotation to the page
  let annots = page.node.get(PDFName.of("Annots"));
  if (!annots) {
    annots = pdfDoc.context.obj([]);
    page.node.set(PDFName.of("Annots"), annots);
  }
  annots.push(linkAnnotation);

  // Move y down for next line
  y -= lineHeight;

  // --- Basic Info Table ---
  y -= 20;
  drawLineOfText(`Document Name: ${data.documentName}`);
  drawLineOfText(`Document ID: ${data.documentId}`);
  drawLineOfText(`Document Creation Time: ${data.creationTime}`);
  drawLineOfText(`Document Creation IP: ${data.creationIp}`);
  drawLineOfText(`Completed At: ${data.completedTime}`);

  // --- Section Title: Complete Audit Record ---
  y -= 30;
  page.drawText("Complete Audit Record", {
    x,
    y,
    font: helveticaBold,
    size: SmallTextSize,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight + 10;

  // --- Created row (sender info) ---
  drawLineOfText(
    `Created by ${data.createdRow.senderName} (${data.createdRow.senderEmail}) at ${data.createdRow.time}`,
    helvetica,
    12
  );
  drawLineOfText(
    `IP - ${data.createdRow.ip}`,
    helvetica,
    SmallTextSize,
    rgb(0.4, 0.4, 0.4)
  );

  // --- Sent Rows ---
  for (const row of data.sentRows) {
    y -= 25;
    drawLineOfText(
      `Document sent to ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      helvetica,
      SmallTextSize
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, 10, rgb(0.4, 0.4, 0.4));
  }

  // --- Viewed Rows ---
  for (const row of data.viewedRows) {
    y -= 25;
    drawLineOfText(
      `Document viewed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      helvetica,
      SmallTextSize
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, 10, rgb(0.4, 0.4, 0.4));
  }

  // --- Signed Rows ---
  for (const row of data.signedRows) {
    y -= 25;
    drawLineOfText(
      `Signed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      helvetica,
      SmallTextSize
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, 10, rgb(0.4, 0.4, 0.4));
  }

  // --- Footer line & text ---
  const footerY = 80;
  page.drawLine({
    start: { x: 50, y: footerY },
    end: { x: pageWidth - 50, y: footerY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Example footer text + check icon
  page.drawText(`Document ID: ${data.documentId}`, {
    x: 50,
    y: footerY - 20,
    font: helvetica,
    size: 32,
    color: rgb(0, 0, 0),
  });

  if (checkIconImage) {
    page.drawImage(checkIconImage, {
      x: pageWidth - 155,
      y: footerY - 20,
      width: footerIconWidth,
      height: footerIconHeight,
    });
  } else {
    // If you want a fallback check mark if PNG not found
    page.drawText("✓", {
      x: pageWidth - 155,
      y: footerY - 20,
      size: footerIconHeight,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  page.drawText("Verified by SignBuddy", {
    x: pageWidth - 160,
    y: footerY - 20,
    font: helvetica,
    size: 32,
    color: rgb(0, 0, 0),
  });

  // 4. Return the PDF as a buffer (Uint8Array)
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { createAuditPdfBuffer };

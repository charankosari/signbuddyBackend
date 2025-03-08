const fs = require("fs");
const path = require("path");
const {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFName,
  pushGraphicsState,
  setGraphicsState,
  popGraphicsState,
} = require("pdf-lib");

/**
 * Creates a single-page PDF buffer containing audit information in a more polished style.
 *
 * @param {Object} data - The audit data to be displayed.
 * @param {number} pageWidth - The width of the page to create.
 * @param {number} pageHeight - The height of the page to create.
 * @returns {Promise<Buffer>} - A Promise that resolves with the PDF buffer.
 */
async function createAuditPdfBuffer(data, pageWidth, pageHeight) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Attempt to load a check icon (optional)
  let checkIconImage;
  try {
    const checkIconPath = path.join(__dirname, "../assets/check.png");
    const checkIconBytes = fs.readFileSync(checkIconPath);
    checkIconImage = await pdfDoc.embedPng(checkIconBytes);
  } catch (err) {
    console.error("Error reading check icon file:", err);
  }
  const leftFooterText = `Document Id - ${data.documentId || "N/A"}`;
  const rightFooterText = "Verified via signbuddy";
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // --- Layout & Styling Constants ---
  const margin = 148; // 2 inch margin
  const heading1Size = 60;
  const heading2Size = 46;
  const bodySize = 40;

  // We'll reduce some of these line spacings to tighten the layout
  const lineSpacingHeading1 = heading1Size * 1.2; // was *2, now 1.2
  const lineSpacingHeading2 = heading2Size * 2; // was *2, now 1.2
  const lineSpacingBody = bodySize * 2; // was *3, now 1.4
  const bottomMargin = 40; // Distance from bottom edge
  const leftMargin = margin;
  const rightMargin = margin;
  const footerIconWidth = 32;
  const footerIconHeight = 32;
  const footerFontSize = 32;
  // A narrower line spacing for second lines (like "IP - ...")
  const lineSpacingBodyNarrow = bodySize * 1.0;

  // Create a page with the specified dimensions
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Current writing coordinates (start near top-left margin)
  let x = margin;
  let y = pageHeight - margin;

  /**
   * Draw a line of text and update the y-position.
   * @param {string} txt - The text to draw.
   * @param {object} options - Additional options: font, size, color, lineSpacing.
   */
  function drawLineOfText(txt, options = {}) {
    const {
      font = helvetica,
      size = bodySize,
      color = rgb(0, 0, 0),
      lineSpacing = lineSpacingBody,
    } = options;

    page.drawText(txt, { x, y, font, size, color });
    y -= lineSpacing;
  }

  /**
   * Draw a light grey horizontal line across the page.
   */
  function drawSeparatorLine(spacingAbove = 10, spacingBelow = 10) {
    y -= spacingAbove;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 2,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= spacingBelow;
  }

  /**
   * Draw partial text, then a clickable link in blue for "signbuddy.in".
   */
  function drawVerifiedLine() {
    const baseText = "Document is verified & completed with ";
    const linkText = "signbuddy.in";

    // Draw baseText in normal color
    page.drawText(baseText, {
      x,
      y,
      font: helvetica,
      size: bodySize,
      color: rgb(0, 0, 0),
    });

    // Measure how wide baseText is, so we know where to place the link
    const baseTextWidth = helvetica.widthOfTextAtSize(baseText, bodySize);
    // Move x for the link
    const linkX = x + baseTextWidth;

    // Draw linkText in blue
    page.drawText(linkText, {
      x: linkX,
      y,
      font: helvetica,
      size: bodySize,
      color: rgb(0, 0, 1),
    });

    // Create the link annotation around the linkText
    const linkWidth = helvetica.widthOfTextAtSize(linkText, bodySize);
    const linkAnnotation = pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [linkX, y, linkX + linkWidth, y + bodySize],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: "https://signbuddy.in",
      },
    });
    let annots = page.node.get(PDFName.of("Annots"));
    if (!annots) {
      annots = pdfDoc.context.obj([]);
      page.node.set(PDFName.of("Annots"), annots);
    }
    annots.push(linkAnnotation);

    // After drawing both pieces, move y for the next line
    y -= bodySize * 3;
  }

  // --- 1) Draw Main Heading "SignBuddy" ---
  drawLineOfText("SignBuddy", {
    font: helveticaBold,
    size: heading1Size,
    lineSpacing: lineSpacingHeading1,
  });

  // --- 2) Make a smaller gap, then draw partial text with link "signbuddy.in" ---
  y -= 10; // reduce gap further
  drawVerifiedLine(); // draws the partial text + link

  // --- 3) Document Info ---
  // We'll reduce the spacing a bit more so it's not too tall
  drawLineOfText(`Document Name: ${data.documentName || "N/A"}`, {
    lineSpacing: lineSpacingBody * 1.3,
  });
  drawLineOfText(`Document ID: ${data.documentId || "N/A"}`, {
    lineSpacing: lineSpacingBody * 1.3,
  });
  drawLineOfText(`Document Creation Time: ${data.creationTime || "N/A"}`, {
    lineSpacing: lineSpacingBody * 1.3,
  });
  drawLineOfText(`Document Creation IP: ${data.creationIp || "N/A"}`, {
    lineSpacing: lineSpacingBody * 1.3,
  });
  drawLineOfText(`Completed At: ${data.completedTime || "N/A"}`, {
    lineSpacing: lineSpacingBody * 1.3,
  });

  // --- 4) Draw a light grey line before "Complete Audit Record" ---
  drawSeparatorLine(20, 30);

  // --- 5) "Complete Audit Record" heading ---
  y -= 20;
  drawLineOfText("Complete Audit Record", {
    font: helveticaBold,
    size: heading2Size,
    lineSpacing: heading2Size * 2.5,
  });

  // --- 6) Created Row ---
  // We'll reduce the gap between lines by using lineSpacingBodyNarrow
  drawLineOfText(
    `Created by ${data.createdRow.senderName} (${data.createdRow.senderEmail}) at ${data.createdRow.time}`,
    { lineSpacing: lineSpacingBody * 1 }
  );
  drawLineOfText(`IP - ${data.createdRow.ip}`, {
    color: rgb(0.4, 0.4, 0.4),
    lineSpacing: lineSpacingBodyNarrow,
  });
  // draw a separator line after the block
  drawSeparatorLine(20, 30);
  y -= 20;
  // --- 7) Sent Rows ---
  for (const row of data.sentRows) {
    drawLineOfText(
      `Document sent to ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      { lineSpacing: lineSpacingBody * 1 }
    );
    drawLineOfText(`IP - ${row.ip}`, {
      color: rgb(0.4, 0.4, 0.4),
      lineSpacing: lineSpacingBodyNarrow,
    });
    // line after each row
    drawSeparatorLine(20, 30);
  }
  y -= 20;
  // --- 8) Viewed Rows ---
  for (const row of data.viewedRows) {
    drawLineOfText(
      `Document viewed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      { lineSpacing: lineSpacingBody * 1 }
    );
    drawLineOfText(`IP - ${row.ip}`, {
      color: rgb(0.4, 0.4, 0.4),
      lineSpacing: lineSpacingBodyNarrow,
    });
    drawSeparatorLine(20, 30);
    y -= 20;
  }

  // --- 9) Signed Rows ---
  for (const row of data.signedRows) {
    drawLineOfText(
      `Signed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
      { lineSpacing: lineSpacingBody * 1 }
    );
    drawLineOfText(`IP - ${row.ip}`, {
      color: rgb(0.4, 0.4, 0.4),
      lineSpacing: lineSpacingBodyNarrow,
    });
    drawSeparatorLine(20, 30);
    y -= 20;
  }

  // --- 10) Footer (near bottom) ---
  page.pushOperators(pushGraphicsState(), setGraphicsState(PDFName.of("GS0")));

  // Left footer text
  page.drawText(leftFooterText, {
    x: leftMargin,
    y: bottomMargin,
    size: footerFontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // We'll measure how wide the rightFooterText is
  const rightTextWidth = helvetica.widthOfTextAtSize(
    rightFooterText,
    footerFontSize
  );
  const totalRightFooterWidth = footerIconWidth + 5 + rightTextWidth;

  // Calculate iconX, iconY for the check icon
  const iconX = pageWidth - rightMargin - totalRightFooterWidth;
  const iconY = bottomMargin;

  // Draw check icon or fallback text
  if (checkIconImage) {
    page.drawImage(checkIconImage, {
      x: iconX,
      y: iconY,
      width: footerIconWidth,
      height: footerIconHeight,
    });
  } else {
    page.drawText("✓", {
      x: iconX,
      y: iconY,
      size: footerIconHeight,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
  }

  // Now draw the right footer text to the right of the icon
  page.drawText(rightFooterText, {
    x: iconX + footerIconWidth + 5,
    y: iconY + (footerIconHeight - footerFontSize) / 2,
    size: footerFontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Pop graphics state
  page.pushOperators(popGraphicsState());

  // Save the PDF and return the bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { createAuditPdfBuffer };

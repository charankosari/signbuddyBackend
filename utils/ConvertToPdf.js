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
 * Creates a multi-page PDF buffer containing audit information.
 *
 * @param {Object} data - The audit data to be displayed.
 * @param {number} pageWidth - The width of the page to create.
 * @param {number} pageHeight - The height of the page to create.
 * @returns {Promise<Buffer>} - A Promise that resolves with the PDF buffer.
 */
async function createAuditPdfBuffer(data, pageWidth, pageHeight) {
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

  // Footer text
  const leftFooterText = `Document Id - ${data.documentId || "N/A"}`;
  const rightFooterText = "Verified via signbuddy";

  // Fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Layout & styling
  const margin = 32;
  const heading1Size = 14;
  const heading2Size = 12;
  const bodySize = 10;

  // Line spacing
  const lineSpacingHeading1 = heading1Size * 2;
  const lineSpacingHeading2 = heading2Size * 2;
  const lineSpacingBody = bodySize * 1.4;
  const lineSpacingBodyNarrow = bodySize * 1.0;

  // Footer settings
  const bottomMargin = 20;
  const leftMargin = margin;
  const rightMargin = margin;
  const footerIconWidth = 10;
  const footerIconHeight = 10;
  const footerFontSize = 8;

  // Create initial page
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Add footer to current page and create a new one
  function newPage() {
    addFooter();
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  // Add footer on the current page using the provided footer settings
  function addFooter() {
    page.pushOperators(
      pushGraphicsState(),
      setGraphicsState(PDFName.of("GS0"))
    );
    // Left footer
    page.drawText(leftFooterText, {
      x: leftMargin,
      y: bottomMargin,
      size: footerFontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    // Right footer (icon + text)
    const rightTextWidth = helvetica.widthOfTextAtSize(
      rightFooterText,
      footerFontSize
    );
    const totalRightFooterWidth = footerIconWidth + 5 + rightTextWidth;
    const iconX = pageWidth - rightMargin - totalRightFooterWidth;
    const iconY = bottomMargin;
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
    page.drawText(rightFooterText, {
      x: iconX + footerIconWidth + 5,
      y: iconY + (footerIconHeight - footerFontSize) / 2,
      size: footerFontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    page.pushOperators(popGraphicsState());
  }

  // Helper to check if there is enough space; if not, add a new page.
  function ensureSpace(requiredSpace) {
    if (y - requiredSpace < bottomMargin) {
      newPage();
    }
  }

  /**
   * Draw a line of text and update the y-position.
   */
  function drawLineOfText(txt, options = {}) {
    const {
      font = helvetica,
      size = bodySize,
      color = rgb(0, 0, 0),
      lineSpacing = lineSpacingBody,
    } = options;
    ensureSpace(lineSpacing);
    page.drawText(txt, { x: margin, y, font, size, color });
    y -= lineSpacing;
  }

  /**
   * Draw a light grey horizontal line across the page.
   */
  function drawSeparatorLine(spacingAbove = 10, spacingBelow = 10) {
    ensureSpace(spacingAbove + spacingBelow);
    y -= spacingAbove;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= spacingBelow;
  }

  /**
   * Draw partial text, then a clickable link to signbuddy.in.
   */
  function drawVerifiedLine() {
    const baseText = "Document is verified & completed with ";
    const linkText = "signbuddy.in";
    // Check space for two lines
    ensureSpace(bodySize * 2);
    // Draw base text
    page.drawText(baseText, {
      x: margin,
      y,
      font: helvetica,
      size: bodySize,
      color: rgb(0, 0, 0),
    });
    const baseTextWidth = helvetica.widthOfTextAtSize(baseText, bodySize);
    const linkX = margin + baseTextWidth;
    // Draw link text
    page.drawText(linkText, {
      x: linkX,
      y,
      font: helvetica,
      size: bodySize,
      color: rgb(0, 0, 1),
    });
    // Create link annotation
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
    y -= bodySize * 2;
  }

  // ---------------------------
  // Begin Drawing Content
  // ---------------------------

  // 1) Main heading
  drawLineOfText("SignBuddy", {
    font: helveticaBold,
    size: heading1Size,
    lineSpacing: lineSpacingHeading1,
  });

  // 2) Verified line
  drawVerifiedLine();

  // 3) Document Info
  drawLineOfText(`Document Name: ${data.documentName || "N/A"}`, {
    lineSpacing: bodySize * 1.5,
  });
  drawLineOfText(`Document ID: ${data.documentId || "N/A"}`, {
    lineSpacing: bodySize * 1.5,
  });
  drawLineOfText(`Document Creation Time: ${data.creationTime || "N/A"}`, {
    lineSpacing: bodySize * 1.5,
  });
  drawLineOfText(`Document Creation IP: ${data.creationIp || "N/A"}`, {
    lineSpacing: bodySize * 1.5,
  });
  drawLineOfText(`Completed At: ${data.completedTime || "N/A"}`, {
    lineSpacing: bodySize * 1.5,
  });

  drawSeparatorLine(15, 20);

  // 4) Audit heading
  drawLineOfText("Complete Audit Record", {
    font: helveticaBold,
    size: heading2Size,
    lineSpacing: lineSpacingHeading2,
  });

  // 5) Created row
  if (data.createdRow) {
    drawLineOfText(
      `Created by ${data.createdRow.senderName} (${data.createdRow.senderEmail}) at ${data.createdRow.time}`,
      { lineSpacing: bodySize * 1.2 }
    );
    drawLineOfText(`IP - ${data.createdRow.ip}`, {
      color: rgb(0.4, 0.4, 0.4),
      lineSpacing: lineSpacingBodyNarrow,
    });
    drawSeparatorLine(15, 20);
  }

  // 6) Sent rows
  if (data.sentRows && data.sentRows.length) {
    for (const row of data.sentRows) {
      drawLineOfText(
        `Document sent to ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
        { lineSpacing: bodySize * 1.2 }
      );
      drawLineOfText(`IP - ${row.ip}`, {
        color: rgb(0.4, 0.4, 0.4),
        lineSpacing: lineSpacingBodyNarrow,
      });
      drawSeparatorLine(15, 20);
    }
  }

  // 7) Viewed rows
  if (data.viewedRows && data.viewedRows.length) {
    for (const row of data.viewedRows) {
      drawLineOfText(
        `Document viewed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
        { lineSpacing: bodySize * 1.2 }
      );
      drawLineOfText(`IP - ${row.ip}`, {
        color: rgb(0.4, 0.4, 0.4),
        lineSpacing: lineSpacingBodyNarrow,
      });
      drawSeparatorLine(15, 20);
    }
  }

  // 8) Signed rows
  if (data.signedRows && data.signedRows.length) {
    for (const row of data.signedRows) {
      drawLineOfText(
        `Signed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`,
        { lineSpacing: bodySize * 1.2 }
      );
      drawLineOfText(`IP - ${row.ip}`, {
        color: rgb(0.4, 0.4, 0.4),
        lineSpacing: lineSpacingBodyNarrow,
      });
      drawSeparatorLine(15, 20);
    }
  }

  // Final footer on the last page
  addFooter();

  // Return PDF buffer
  return pdfDoc.save();
}

module.exports = { createAuditPdfBuffer };

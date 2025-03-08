const fs = require("fs");
const path = require("path");
const { PDFDocument, StandardFonts, rgb, PDFName } = require("pdf-lib");

async function createAuditPdfBuffer(data, pageWidth, pageHeight) {
  const pdfDoc = await PDFDocument.create();

  let checkIconImage;
  try {
    const checkIconPath = path.join(__dirname, "../assets/check.png");
    const checkIconBytes = fs.readFileSync(checkIconPath);
    checkIconImage = await pdfDoc.embedPng(checkIconBytes);
  } catch (err) {
    console.error("Error reading check icon file:", err);
  }

  // Increased font sizes
  const textSize = 64;
  const footerTextSize = 40;
  // Increased line spacing for clearer separation
  const lineSpacing = 80;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let x = 50;
  let y = pageHeight - 50;

  function drawLineOfText(
    txt,
    font = helvetica,
    size = textSize,
    color = rgb(0, 0, 0)
  ) {
    page.drawText(txt, { x, y, font, size, color });
    y -= lineSpacing;
  }

  page.drawText("SignBuddy", {
    x,
    y,
    font: helveticaBold,
    size: textSize,
    color: rgb(0, 0, 0),
  });
  y -= lineSpacing;

  const linkText = "Document is verified & completed with signbuddy.in";

  page.drawText(linkText, {
    x,
    y,
    font: helvetica,
    size: textSize,
    color: rgb(0, 0, 1),
  });

  const linkWidth = helvetica.widthOfTextAtSize(linkText, textSize);

  const linkAnnotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + linkWidth, y + textSize],
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

  y -= lineSpacing;

  drawLineOfText(`Document Name: ${data.documentName}`);
  drawLineOfText(`Document ID: ${data.documentId}`);
  drawLineOfText(`Document Creation Time: ${data.creationTime}`);
  drawLineOfText(`Document Creation IP: ${data.creationIp}`);
  drawLineOfText(`Completed At: ${data.completedTime}`);

  y -= lineSpacing;
  page.drawText("Complete Audit Record", {
    x,
    y,
    font: helveticaBold,
    size: textSize,
    color: rgb(0, 0, 0),
  });
  y -= lineSpacing;

  drawLineOfText(
    `Created by ${data.createdRow.senderName} (${data.createdRow.senderEmail}) at ${data.createdRow.time}`,
    helvetica,
    textSize
  );
  drawLineOfText(
    `IP - ${data.createdRow.ip}`,
    helvetica,
    textSize,
    rgb(0.4, 0.4, 0.4)
  );

  for (const row of data.sentRows) {
    y -= lineSpacing;
    drawLineOfText(
      `Document sent to ${row.recipientName} (${row.recipientEmail}) at ${row.time}`
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, textSize, rgb(0.4, 0.4, 0.4));
  }

  for (const row of data.viewedRows) {
    y -= lineSpacing;
    drawLineOfText(
      `Document viewed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, textSize, rgb(0.4, 0.4, 0.4));
  }

  for (const row of data.signedRows) {
    y -= lineSpacing;
    drawLineOfText(
      `Signed by ${row.recipientName} (${row.recipientEmail}) at ${row.time}`
    );
    drawLineOfText(`IP - ${row.ip}`, helvetica, textSize, rgb(0.4, 0.4, 0.4));
  }

  const footerY = 80;
  page.drawLine({
    start: { x: 50, y: footerY },
    end: { x: pageWidth - 50, y: footerY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(`Document ID: ${data.documentId}`, {
    x: 50,
    y: footerY - 20,
    font: helvetica,
    size: footerTextSize,
    color: rgb(0, 0, 0),
  });

  if (checkIconImage) {
    page.drawImage(checkIconImage, {
      x: pageWidth - 155,
      y: footerY - 20,
      width: 32,
      height: 32,
    });
  } else {
    page.drawText("✓", {
      x: pageWidth - 155,
      y: footerY - 20,
      size: 32,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  page.drawText("Verified by SignBuddy", {
    x: pageWidth - 160,
    y: footerY - 20,
    font: helvetica,
    size: footerTextSize,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = { createAuditPdfBuffer };

const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const axios = require("axios");

async function createPdfWithOverlay(
  baseImageUrl,
  overlayImageUrl,
  x,
  y,
  width,
  height
) {
  try {
    // Fetch images using axios
    const baseImageResponse = await axios.get(baseImageUrl, {
      responseType: "arraybuffer",
    });
    const overlayImageResponse = await axios.get(overlayImageUrl, {
      responseType: "arraybuffer",
    });

    const baseImageBytes = baseImageResponse.data;
    const overlayImageBytes = overlayImageResponse.data;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Embed base image (Check if it's JPEG or PNG)
    const baseImage = await pdfDoc
      .embedJpg(baseImageBytes)
      .catch(() => pdfDoc.embedPng(baseImageBytes));
    const { width: baseWidth, height: baseHeight } = baseImage.scale(1);

    // Set page size to match base image
    page.setSize(baseWidth, baseHeight);
    page.drawImage(baseImage, {
      x: 0,
      y: 0,
      width: baseWidth,
      height: baseHeight,
    });

    // Embed overlay image (Auto-detect PNG/JPG)
    const overlayImage = await pdfDoc
      .embedJpg(overlayImageBytes)
      .catch(() => pdfDoc.embedPng(overlayImageBytes));

    page.drawImage(overlayImage, {
      x,
      y,
      width,
      height,
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    // Write PDF to file
    fs.writeFileSync("output.pdf", pdfBytes);
    console.log("PDF created: output.pdf");
  } catch (error) {
    console.error("Error creating PDF:", error);
  }
}

// Example usage
createPdfWithOverlay(
  "https://signbuddy.s3.ap-south-1.amazonaws.com/images/7db19e78-48cb-43bf-87e2-4d95545f5636-Cover_Letter.pdf/7db19e78-48cb-43bf-87e2-4d95545f5636-1.jpg",
  "https://signbuddy.s3.ap-south-1.amazonaws.com/signatures/agreements/7db19e78-48cb-43bf-87e2-4d95545f5636-Cover_Letter.pdf/efaa4db9-1282-476b-8e56-a22677980fcd.jpg",
  100,
  150,
  200,
  200
);

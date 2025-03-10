const axios = require("axios");
const { PDFDocument } = require("pdf-lib");
const asyncHandler = require("../middleware/asynchandler");

/**
 * Downloads a file from the given URL and returns its ArrayBuffer.
 * @param {string} url - URL of the file.
 * @returns {Promise<ArrayBuffer>}
 */
async function fetchArrayBuffer(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return response.data;
}

/**
 * Loads a PDF from a URL and overlays images based on placement data.
 * The placement object must contain:
 *   - pageNumber (1-indexed)
 *   - position: { x: string, y: string } as percentages
 *   - size: { width: string, height: string } as percentages
 *   - value: string (URL of the PNG image)
 *
 * @param {string} pdfUrl - The URL of the PDF (e.g., document.pdfDoc)
 * @param {Array} placements - An array of placeholder objects.
 * @returns {Promise<Buffer>} - A promise that resolves with the modified PDF as a Buffer.
 */
const createPdfWithImagePlacements = asyncHandler(
  async (pdfUrl, placements) => {
    // Fetch the PDF from the provided URL.
    const pdfArrayBuffer = await fetchArrayBuffer(pdfUrl);
    const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

    // Process each placeholder placement.
    for (const placement of placements) {
      // Ensure the PDF has enough pages.
      while (pdfDoc.getPageCount() < placement.pageNumber) {
        pdfDoc.addPage();
      }
      // Get the target page (pages are zero-indexed).
      const page = pdfDoc.getPage(placement.pageNumber - 1);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      // Convert percentage values to absolute values.
      const absX = (parseFloat(placement.position.x) / 100) * pageWidth;
      const absHeight = (parseFloat(placement.size.height) / 100) * pageHeight;
      const absY =
        pageHeight -
        (parseFloat(placement.position.y) / 100) * pageHeight -
        absHeight;
      const absWidth = (parseFloat(placement.size.width) / 100) * pageWidth;

      // Fetch the image from the placeholder's value URL.
      const imageBuffer = await fetchArrayBuffer(placement.value);
      const embeddedImage = await pdfDoc.embedPng(imageBuffer);

      // Draw the image using the calculated absolute positions.
      page.drawImage(embeddedImage, {
        x: absX,
        y: absY,
        width: absWidth,
        height: absHeight,
      });
    }

    // Save and return the modified PDF.
    const newPdfBytes = await pdfDoc.save();
    return Buffer.from(newPdfBytes);
  }
);

module.exports = {
  createPdfWithImagePlacements,
};

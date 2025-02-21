const axios = require("axios");
const { PDFDocument } = require("pdf-lib");
const sharp = require("sharp");

async function PdfToImage(pdfUrl) {
  try {
    // Download PDF from S3 URL
    const { data: pdfBuffer } = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
    });

    // Load the PDF into pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const [firstPage] = await pdfDoc.copyPages(pdfDoc, [0]);

    // Convert first page to an image (JPEG format)
    const imageBuffer = await firstPage.render().toBuffer();
    const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString(
      "base64"
    )}`;

    return imageBase64;
  } catch (error) {
    console.error("Error converting PDF to image:", error);
    throw error;
  }
}

module.exports = PdfToImage;

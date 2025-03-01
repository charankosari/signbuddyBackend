const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
config({ path: "config/config.env" });
const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
exports.processFile = asyncHandler(async (cloudFile, outputFilename) => {
  // Configuration – adjust these values as needed.
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const tool = process.env.ILOVEPDF_TOOL;
  const mainServer = process.env.ILOVEPDF_MAINSERVER;

  // Helper function to obtain a new token.
  async function getNewToken() {
    const authUrl = `https://${mainServer}/v1/auth`;
    const response = await axios.post(authUrl, { public_key: publicKey });
    if (response.status === 200 && response.data.token) {
      return response.data.token;
    }
    throw new Error("Authentication failed: " + response.data.message);
  }

  // Step 1: Authenticate.
  let token = await getNewToken();
  let headers = { Authorization: `Bearer ${token}` };

  // Step 2: Start process.
  const startUrl = `https://${mainServer}/v1/start/${tool}`;
  let startResponse;
  try {
    startResponse = await axios.get(startUrl, { headers });
  } catch (error) {
    // Re-authenticate if token is expired.
    if (error.response && error.response.status === 401) {
      const errorData = error.response.data;
      if (errorData && errorData.message === "Expired token") {
        token = await getNewToken();
        headers = { Authorization: `Bearer ${token}` };
        startResponse = await axios.get(startUrl, { headers });
      } else {
        throw new Error("Start process error: " + errorData.message);
      }
    } else {
      throw new Error("Error starting process: " + error.message);
    }
  }

  const { server, task } = startResponse.data;
  if (!server || !task) {
    throw new Error("Invalid start response: missing server or task.");
  }

  // Step 3: Upload file.
  const uploadUrl = `https://${server}/v1/upload`;
  const uploadResponse = await axios.post(
    uploadUrl,
    { task, cloud_file: cloudFile },
    { headers }
  );
  if (uploadResponse.status !== 200 || !uploadResponse.data.server_filename) {
    throw new Error("Upload failed: " + JSON.stringify(uploadResponse.data));
  }
  const serverFilename = uploadResponse.data.server_filename;

  // Step 4: Process file.
  const processUrl = `https://${server}/v1/process`;
  const processPayload = {
    task,
    tool,
    files: [
      {
        server_filename: serverFilename,
        filename: outputFilename,
      },
    ],
  };
  const processResponse = await axios.post(processUrl, processPayload, {
    headers,
  });
  if (processResponse.status !== 200) {
    throw new Error("Process failed: " + JSON.stringify(processResponse.data));
  }
  const processUpdate = processResponse.data;
  if (processUpdate.status !== "TaskSuccess") {
    throw new Error("Processing did not succeed: " + processUpdate.status);
  }

  // Step 5: Download processed file.
  const downloadUrl = `https://${server}/v1/download/${task}`;
  const downloadResponse = await axios.get(downloadUrl, {
    headers,
    responseType: "stream",
  });
  if (downloadResponse.status !== 200) {
    throw new Error("Download failed: " + downloadResponse.statusText);
  }

  // Ensure the ../temp folder exists.
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const outputPath = path.join(tempDir, outputFilename);
  const writer = fs.createWriteStream(outputPath);
  downloadResponse.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return processUpdate;
});

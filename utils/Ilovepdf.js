const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
config({ path: "config/config.env" });

exports.processFile = async (cloudFile, uniqueId) => {
  // Configuration – adjust these values as needed.
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const tool = process.env.ILOVEPDF_TOOL;
  const mainServer = process.env.ILOVEPDF_MAIN_SERVER;

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
  const payload = {
    task: task,
    cloud_file: encodeURI(cloudFile),
  };

  let uploadResponse;
  try {
    uploadResponse = await axios.post(uploadUrl, payload, { headers });
  } catch (error) {
    console.error(
      "Upload error details:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }

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
        filename: uniqueId, // using the uniqueId as the base file name
      },
    ],
  };

  let processResponse;
  try {
    processResponse = await axios.post(processUrl, processPayload, { headers });
  } catch (error) {
    console.error(
      "Process error details:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }

  if (processResponse.status !== 200) {
    throw new Error("Process failed: " + JSON.stringify(processResponse.data));
  }
  const processUpdate = processResponse.data;
  if (processUpdate.status !== "TaskSuccess") {
    throw new Error("Processing did not succeed: " + processUpdate.status);
  }

  // Step 5: Download processed file.
  const downloadUrl = `https://${server}/v1/download/${task}`;
  let downloadResponse;
  try {
    downloadResponse = await axios.get(downloadUrl, {
      headers,
      responseType: "stream",
    });
  } catch (error) {
    console.error(
      "Download error details:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
  if (downloadResponse.status !== 200) {
    throw new Error("Download failed: " + downloadResponse.statusText);
  }

  // Create a dedicated unique folder inside ../temp.
  const tempFolder = path.join(__dirname, "../temp", uniqueId);
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const outputFileName = `${uniqueId}.pdf`;
  const outputPath = path.join(tempFolder, outputFileName);

  const writer = fs.createWriteStream(outputPath);
  downloadResponse.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return fs.readFileSync(outputPath);
};

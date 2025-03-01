const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
config({ path: "config/config.env" });

exports.processFile = async (cloudFile, outputFilename) => {
  // Configuration – adjust these values as needed.
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
  const tool = process.env.ILOVEPDF_TOOL;
  const mainServer = process.env.ILOVEPDF_MAIN_SERVER;

  console.log("Starting processFile with:");
  console.log("publicKey:", publicKey);
  console.log("tool:", tool);
  console.log("mainServer:", mainServer);
  console.log("cloudFile:", cloudFile);
  console.log("outputFilename:", outputFilename);

  // Helper function to obtain a new token.
  async function getNewToken() {
    const authUrl = `https://${mainServer}/v1/auth`;
    console.log("Authenticating at:", authUrl);
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
    console.log("Starting process at:", startUrl);
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
  console.log("Start response:", { server, task });

  // Step 3: Upload file.
  const uploadUrl = `https://${server}/v1/upload`;
  const payload = {
    task: task,
    cloud_file: encodeURI(cloudFile),
  };

  console.log("Uploading file to:", uploadUrl);
  console.log("Upload payload:", payload);

  let uploadResponse;
  try {
    uploadResponse = await axios.post(uploadUrl, payload, { headers });
    console.log("Upload response:", uploadResponse.data);
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
  console.log(
    "Processing file at:",
    processUrl,
    "with serverFilename:",
    serverFilename
  );
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
  console.log("Process payload:", processPayload);

  let processResponse;
  try {
    processResponse = await axios.post(processUrl, processPayload, { headers });
    console.log("Process response:", processResponse.data);
  } catch (error) {
    console.error(
      "Process error details:",
      error.response ? error.response.data : error.message,
      error.response.data.param,
      error.message.param
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
  console.log("Downloading file from:", downloadUrl);
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
  console.log("Download response received.");

  // Ensure the ../temp folder exists.
  if (!outputFilename.endsWith(".pdf")) {
    outputFilename += ".pdf";
  }

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

  console.log("File saved successfully at:", outputPath);
  return processUpdate;
};

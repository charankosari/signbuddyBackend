const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { config } = require("dotenv");
config({ path: "config/config.env" });
// connection
exports.s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Client = exports.s3Client;

// Function to get an object from S3
exports.getObject = async (key) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };
    const command = new GetObjectCommand(params);
    const { Body } = await s3Client.send(command);

    // Convert stream to string (if needed)
    const streamToString = async (stream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf-8"))
        );
        stream.on("error", reject);
      });
    };

    const content = await streamToString(Body);
    console.log(content);

    return { content };
  } catch (err) {
    console.error("Error getting object:", err);
    return { error: err.message };
  }
};

// Function to delete an object from S3
exports.deleteObject = async (key) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    };
    const command = new DeleteObjectCommand(params);
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 204) {
      return { status: 400, message: "Failed to delete object", data };
    }
    return { status: 204, message: "Object deleted successfully" };
  } catch (err) {
    console.error("Error deleting object:", err);
    return { status: 500, error: err.message };
  }
};

// Function to upload an object to S3
exports.putObject = async (
  file,
  fileName,
  contentType = "application/octet-stream"
) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);

    if (data.$metadata.httpStatusCode !== 200) {
      return { status: 400, message: "Upload failed", data };
    }

    let url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    console.log("File uploaded:", url);

    return { status: 200, url, key: params.Key };
  } catch (err) {
    console.error("Error uploading object:", err);
    return { status: 500, error: err.message };
  }
};

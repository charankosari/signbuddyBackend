const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { config } = require("dotenv");
const asyncHandler = require("../middleware/asynchandler");
const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
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

exports.getImagesFromFolder = async (folderName) => {
  try {
    if (!folderName) {
      return { error: "Folder name is required" };
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Prefix: `images/${folderName}/`,
    };

    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    if (!data.Contents || data.Contents.length === 0) {
      return { message: "No images found in this folder" };
    }

    // Generate URLs
    const imageUrls = data.Contents.map((file) => ({
      key: file.Key,
      url: `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
    }));

    return imageUrls;
  } catch (error) {
    console.error("Error fetching images:", error);
    return { error: "Failed to fetch images" };
  }
};
exports.getAvatars = async (req, res) => {
  try {
    const folderName = "avatars";
    const prefix = folderName.endsWith("/") ? folderName : `${folderName}/`;

    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      return res.status(500).json({ error: "AWS_BUCKET_NAME is not defined" });
    }

    const params = {
      Bucket: bucketName,
      Prefix: prefix,
    };

    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    if (!data.Contents || data.Contents.length === 0) {
      return res
        .status(404)
        .json({ message: "No images found in this folder" });
    }

    const imageUrls = data.Contents.map((file) => ({
      key: file.Key,
      url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
    }));

    return res.status(200).json(imageUrls);
  } catch (error) {
    console.error("Error fetching images:", error);
    return res.status(500).json({ error: "Failed to fetch images" });
  }
};

exports.getAvatarsList = async (req, res) => {
  const folderName = "avatars";
  const prefix = folderName.endsWith("/") ? folderName : `${folderName}/`;
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET is not defined");
  }
  const params = {
    Bucket: bucketName,
    Prefix: prefix,
  };
  const command = new ListObjectsV2Command(params);
  const data = await s3Client.send(command);
  if (!data.Contents || data.Contents.length === 0) {
    throw new Error("No images found in this folder");
  }
  const imageUrls = data.Contents.map((file) => ({
    key: file.Key,
    url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
  }));
  return imageUrls;
};

exports.UploadDocx = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("No file provided");
  }

  const fileContent = file.buffer;
  const fileName = file.originalname;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileContent,
    ContentType:
      file.mimetype ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

  return url;
};

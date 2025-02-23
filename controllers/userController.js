const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const TempOTP = require("../models/TempModel");
const bcrypt = require("bcrypt");
const pdf2image = require("pdf-poppler");
const fs = require("fs");
const path = require("path");
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const multer = require("multer");
const { putObject, deleteObject, getObject } = require("../utils/s3objects");
const storage = multer.memoryStorage();
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { error } = require("console");
const generateAgreement = require("../utils/grokAi");
const PreUser = require("../models/preUsers");
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .docx files are allowed"));
    }
  },
}).single("file");
const uploadDocs = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only .docx files are allowed"));
    }
  },
}).single("file");
const emailBody = (name, previewImageUrl, redirectUrl, email) => {
  return `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #121111; color: #ffffff;">
      <div style="background-color: #121111; color: #ffffff; text-align: left;">
        <a href="#" style="font-size: 28px; font-weight: 300; color: #ffffff; text-decoration: none; margin-bottom: 5px; display: block; letter-spacing: 1px;">SignBuddy</a>
        <span style="font-size: 14px; color: #cccccc; margin-bottom: 20px; display: block;">Bridging Communication Gaps</span>
      </div>

      <div style="padding: 30px; margin: 30px; background-color: #000000; border: 1px solid #333333; color: #ffffff;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
          <img src="[PROFILE_IMAGE_URL]" alt="Profile Picture" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 12px;" />
          <div style="display: flex; flex-direction: column; justify-content: center; height: 30px;alin-items:center">
            <h2 style="margin: 0; font-size: 13px; font-weight: 600; line-height: 1.2;">${name}</h2>
          </div>
        </div>

        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">Dear ${name},</p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          A document has been shared with you for your electronic signature through SignBuddy's secure digital signing platform.
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          This document requires your attention and electronic signature to proceed. Our system ensures a secure, legally-binding signature
          process that complies with international e-signature regulations.
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">To complete this process:</p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          1. Review the document preview below<br />
          2. Click the "Sign Document" button to access the full document<br />
          3. Follow the guided signing process<br />
          4. Receive your signed copy via email
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          For security reasons, this signing link will expire in 72 hours. If you have any questions or need assistance, please contact our support
          team.
        </p>

        <img src="${previewImageUrl}" alt="document" style="width: 100%; max-width: 300px; height: 400px; object-fit: cover; margin: 25px auto; display: block; border: 1px solid #333; border-radius: 4px;" />

        <a href="${redirectUrl}" style="display: inline-block; padding: 12px 30px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 4px; margin: 20px auto; display: block; width: fit-content; font-size: 13px; font-weight: 500;">Sign Document</a>
      </div>

      <div style="background-color: #121111; text-align: left; color: #6d6b6b; font-size: 12px;">
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 20px;color:#ffffff">
          SignBuddy is a cutting-edge electronic signature platform that combines security, simplicity, and legal compliance. Our mission is to
          streamline document signing processes while ensuring the highest standards of data protection and user experience.
        </p>
        <hr style="border: none; border-top: 1px solid #333333; margin: 15px 0;" />
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; font-size: 10px;color:#8a8a8a">© 2025 SignBuddy. All rights reserved.</p>
          <p style="margin: 0; font-size: 10px;">
            <a href="#" style="margin-left: 15px; color: #8a8a8a;">Privacy Policy</a>
            <a href="#" style="margin-left: 15px; color: #8a8a8a;">Terms & Conditions</a>
          </p>
        </div>

        <div style="margin-top: 15px;">
       <a href="https://www.linkedin.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.45 3H3.55C2.69 3 2 3.69 2 4.55v14.9C2 20.31 2.69 21 3.55 21h16.9c.86 0 1.55-.69 1.55-1.55V4.55C22 3.69 21.31 3 20.45 3zM8.337 17.125H5.578V9.375h2.759v7.75zM6.957 8.283a1.595 1.595 0 1 1 0-3.19 1.595 1.595 0 0 1 0 3.19zM18.42 17.125h-2.76v-3.738c0-.89-.018-2.038-1.24-2.038-1.24 0-1.43.967-1.43 1.97v3.806H10.23V9.375h2.64v1.067h.036c.369-.7 1.27-1.44 2.61-1.44 2.79 0 3.305 1.838 3.305 4.224v3.9z"/>
  </svg>
</a>

<a href="https://www.instagram.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.75 2h8.5C19.54 2 22 4.46 22 7.75v8.5c0 3.29-2.46 5.75-5.75 5.75h-8.5C4.46 22 2 19.54 2 16.25v-8.5C2 4.46 4.46 2 7.75 2zM12 7.12a4.88 4.88 0 1 0 0 9.76 4.88 4.88 0 0 0 0-9.76zm0 8a3.12 3.12 0 1 1 0-6.24 3.12 3.12 0 0 1 0 6.24zM17.63 6.37a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0z"/>
  </svg>
</a>

<a href="https://www.twitter.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.23 5.924a8.38 8.38 0 0 1-2.415.662 4.216 4.216 0 0 0 1.849-2.323 8.3 8.3 0 0 1-2.644 1.012 4.187 4.187 0 0 0-7.234 3.814 11.86 11.86 0 0 1-8.605-4.362 4.2 4.2 0 0 0 1.297 5.596 4.176 4.176 0 0 1-1.894-.52v.052a4.19 4.19 0 0 0 3.355 4.104 4.17 4.17 0 0 1-1.887.072 4.2 4.2 0 0 0 3.92 2.915 8.39 8.39 0 0 1-6.157 1.723 11.83 11.83 0 0 0 6.4 1.872c7.675 0 11.876-6.36 11.876-11.876l-.014-.54a8.53 8.53 0 0 0 2.063-2.174z"/>
  </svg>
</a>


        </div>

        <div style="text-align: center; padding-top: 15px;">
          <p style="color: #6d6b6b; font-size: 10px; margin: 0;">
            Powered by SyncoreLabs
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
};

const emailForPreuser = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Thanks for Joining the waitlist!</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #242424;
          font-family: Arial, sans-serif;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          padding: 10px 0;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          background-color: #dadadb;
          padding: 24px 32px 0px;
        }
        #person_header {
          width: 40%;
          margin-bottom: 0;
        }
        #greet {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }
        .header-text {
          margin-top: 0;
          text-align: right;
          font-size: 20px;
          font-weight: 700;
          align-self: flex-end;
          margin-bottom: 20px;
        }
        .thanks {
          font-size: 32px;
          font-weight: bold;
          color: #09090b;
          margin-bottom: 0px;
          text-align: right;
          align-self: flex-end !important;
        }
        .black-section {
          background-color: #09090b;
          color: #ffffff;
          padding: 40px;
        }
        .message-text {
          margin: 0 0 20px 0;
          font-size: 14px;
          line-height: 1.5;
          color: #dadadb;
          margin-bottom: 8px;
        }
        p.credits {
          margin-bottom: 32px;
        }
        .credits-container {
          background-color: #242424;
          width: fit-content;
          padding: 16px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: auto;
        }
        #credits_icon {
          width: 24px;
          height: 24px;
        }
        .credits-text {
          font-size: 24px;
          font-weight: bold;
        }
        .benefits-title {
          font-size: 14px;
          text-align: center;
          color: #dadadb;
          font-weight: 600;
        }
        .footer {
          margin-top: 32px;
        }
        .extra-text {
          font-size: 12px;
          margin-top: 0;
          color: #7a7a81;
          line-height: 1.5;
        }
        hr {
          height: 1px;
          border: none;
          border-top: 1px solid #404040;
        }
        .footer-copyright {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-links {
          display: flex;
          gap: 20px;
          font-size: 10px;
          text-decoration: underline;
          text-decoration-color: #404040;
        }
        .footer-text {
          font-size: 10px;
          color: #7a7a81;
        }
        .footer-link {
          color: #666666;
          text-decoration: none;
        }
        .footer-text-powered {
          font-size: 12px;
          color: #7a7a81;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://signbuddy.s3.ap-south-1.amazonaws.com/person-image.png" alt="a person greeting" id="person_header" />
          <div id="greet">
            <p class="header-text">Signbuddy</p>
            <p class="thanks">Thanks for joining the waitlist!</p>
          </div>
        </div>
        <div class="black-section">
          <p class="message-text">
            Thank you for joining the <strong>SignBuddy</strong> waitlist! We're excited to have you onboard.
            We're giving you 100 Free Credits to use when the application launches.
          </p>
          <p class="message-text">Stay tuned! We'll be live sooner than you expect.</p>
          <p class="message-text credits">Best Regards<br />- Team SignBuddy</p>
          <div class="credits-container">
            <span><img src="https://signbuddy.s3.ap-south-1.amazonaws.com/credits-icon.png" alt="credits icon" id="credits_icon"/></span>
            <span class="credits-text">100 Credits</span>
          </div>
          <p class="benefits-title">Here are your benefits for trusting us in the early stages.</p>
        </div>
        <div class="footer">
          <hr />
          <div class="footer-copyright" style="display:flex;flex-direction:row;gap:10">
            <p class="footer-text">Copyright © 2025 SignFastly. All Rights Reserved.</p>
       
          </div>
          <p class="footer-text-powered">Powered by <strong>Syncore Labs</strong></p>
        </div>
      </div>
    </body>
  </html>
  `;

exports.sendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new errorHandler("Email is required", 400));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already exists"));
  }
  const otp = crypto.randomInt(1000, 9999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  await TempOTP.findOneAndUpdate(
    { email },
    { otp: hashedOtp, createdAt: new Date() },
    { upsert: true, new: true }
  );
  const subject = "Your OTP Code";
  const body = `<h1>Your OTP is: ${otp}</h1><p>Use this OTP to verify your account.</p>`;
  sendEmail(email, subject, body);
  console.log(otp);
  res.status(200).json({ success: true, message: "OTP sent to email" });
});

exports.register = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return next(new errorHandler("Email, OTP, and Password are required", 400));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already registered", 400));
  }
  if (!passwordRegex.test(password)) {
    return next(
      new errorHandler(
        "Password must include at least one letter, one number, and one special character",
        400
      )
    );
  }
  const tempOTP = await TempOTP.findOne({ email });
  if (!tempOTP) {
    return next(new errorHandler("OTP expired or email not found", 400));
  }
  const matchOtp = await bcrypt.compare(String(otp), tempOTP.otp);
  if (!matchOtp) {
    return next(new errorHandler("Invalid OTP", 400));
  }
  const user = await User.create({ email, password });

  await TempOTP.deleteOne({ email });
  res.status(201);
  sendJwt(user, 200, "Registration successful", res);
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Ensure user exists and fetch password
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Debugging Step: Print Passwords
  console.log("Entered Password:", password);
  console.log("Stored Hashed Password:", user.password);

  // Compare password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password);
  console.log("Password Match Result:", isMatch);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  sendJwt(user, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }

  const token = user.resetToken();
  const resetUrl = `http://localhost:5173/resetpassword/${token}`;
  const message = `your reset url is ${resetUrl} leave it if you didnt requested for it`;
  await user.save({ validateBeforeSave: false });
  try {
    const mailMessage = await sendEmail({
      email: user.email,
      subject: "password reset mail",
      message: message,
    });
    res.status(201).json({
      success: true,
      message: "mail sent successfully",
      mailMessage: mailMessage,
    });
  } catch (e) {
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save({ validateBeforeSave: false });
    next(new errorHandler(e.message, 401));
  }
});

// reset password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.id;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new errorHandler("Reset password is invalid or expired", 400));
  }

  user.password = req.body.password;
  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;
  await user.save();
  sendJwt(user, 201, "reset password successfully", res);
});

// my details
exports.userDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  res.status(200).send({ success: true, user });
});
// update details
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const { avatar, userName } = req.body;
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  user.avatar = avatar;
  user.userName = userName;
  await user.save();
  res.status(200).send({ success: true, user });
});

exports.addTemplate = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileName = `templates/${Date.now()}-${req.file.originalname}`;
      const result = await putObject(
        req.file.buffer,
        fileName,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      if (result.status !== 200) {
        return res.status(500).json({ error: "Failed to upload file" });
      }

      res.status(201).json({
        message: "File uploaded successfully",
        fileUrl: result.url,
        key: result.key,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};
exports.deleteTemplate = async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "File key is required" });
    }

    const result = await deleteObject(key);

    if (result.status !== 204) {
      return res.status(500).json({ error: "Failed to delete file" });
    }

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.sendAgreement = asyncHandler(async (req, res, next) => {
  uploadDocs(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized user" });
      }
      if (
        user.subscriptionType === "free" &&
        user.documentsSent.length >= 3 &&
        user.credits === 0
      ) {
        return res.status(403).json({
          error: "Free subscription users can send a maximum of 3 documents.",
        });
      }
      const emails = Object.values(JSON.parse(req.body.emails));
      const names = Object.values(JSON.parse(req.body.names));
      if (!emails.length || !names.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const uniqueId = uuidv4();
      const originalname = req.file.originalname.trimStart();
      const fileKey = `agreements/${uniqueId}-${originalname}`;
      const imagesFolder = `images/${uniqueId}-${originalname}`;

      // Temp file paths
      const tempFilePath = path.join(__dirname, "../temp", `${uniqueId}.pdf`);

      // Save file locally
      fs.writeFileSync(tempFilePath, req.file.buffer);

      // Upload PDF to S3
      const fileBuffer = fs.readFileSync(tempFilePath);
      const docUpload = await putObject(fileBuffer, fileKey, req.file.mimetype);
      if (docUpload.status !== 200) {
        return res.status(500).json({ error: "Failed to upload document" });
      }
      const docUrl = docUpload.url;
      const pdfToImageOptions = {
        format: "jpeg",
        out_dir: path.dirname(tempFilePath),
        out_prefix: uniqueId,
      };
      await pdf2image.convert(tempFilePath, pdfToImageOptions);

      const imageFiles = fs
        .readdirSync(path.dirname(tempFilePath))
        .filter((file) => file.startsWith(uniqueId) && file.endsWith(".jpg"))
        .sort();

      if (!imageFiles.length) {
        return res
          .status(500)
          .json({ error: "Failed to convert PDF to images" });
      }

      let imageUrls = [];

      for (const imageFile of imageFiles) {
        const imagePath = path.join(path.dirname(tempFilePath), imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageKey = `${imagesFolder}/${imageFile}`;

        const imageUpload = await putObject(
          imageBuffer,
          imageKey,
          "image/jpeg"
        );

        if (imageUpload.status !== 200) {
          return res.status(500).json({ error: "Failed to upload images" });
        }

        imageUrls.push(imageUpload.url);
        fs.unlinkSync(imagePath);
      }

      fs.unlinkSync(tempFilePath);

      const redirectUrl = `https://signbuddy.in?document=${encodeURIComponent(
        docUrl
      )}`;
      const subject = "Agreement Document for Signing";
      const previewImageUrl = imageUrls[0];

      emails.forEach((email, index) => {
        sendEmail(
          email,
          subject,
          emailBody(names[index], previewImageUrl, redirectUrl, email)
        );
      });

      const newDocument = {
        documentKey: fileKey,
        recipients: emails.map((email) => ({
          email,
          status: "pending",
        })),
        ImageUrls: imageUrls,
      };

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $push: { documentsSent: newDocument } },
        { new: true, runValidators: true }
      );

      console.log("Updated user:", updatedUser);

      await user.save();

      res.status(200).json({
        message: "Agreement sent successfully",
        documentUrl: docUrl,
        previewImageUrl: previewImageUrl,
        allImageUrls: imageUrls,
      });
    } catch (error) {
      console.error("Error sending agreement:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

exports.agreeDocument = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }

    const senderEmail = req.body.senderEmail;
    const documentKey = req.body.documentKey;
    const file = req.file;

    console.log("Sender Email:", senderEmail);
    console.log("Document Key:", documentKey);
    console.log("Uploaded File:", file);

    if (!senderEmail || !documentKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sender = await User.findOne({ email: senderEmail });
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }

    const document = sender.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    const recipient = document.recipients.find(
      (rec) => rec.email === user.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }

    if (recipient.status === "signed") {
      return res.status(400).json({ error: "Document already signed" });
    }

    // Generate unique filename for storage
    const uniqueId = uuidv4();
    const originalname = file.originalname.trimStart();
    const fileKey = `signedagreements/${uniqueId}-${originalname}`;
    const fileBuffer = file.buffer;

    // Upload file to S3 (or your storage service)
    const docUpload = await putObject(fileBuffer, fileKey, file.mimetype);
    if (docUpload.status !== 200) {
      return res
        .status(500)
        .json({ error: "Failed to upload signed document" });
    }

    const signedUrl = docUpload.url;

    recipient.status = "signed";
    recipient.signedDocument = signedUrl;
    await sender.save();

    user.agreements.push(signedUrl);
    await user.save();
    // Notify sender and signer via email
    const subject = "Agreement Signed Notification";
    const senderBody = `Hello,\n\nYour document (${documentKey}) has been signed by ${user.email}.\n\nYou can view the signed document here: ${signedUrl}\n\nRegards,\nSignBuddy Team`;
    const signerBody = `Hello ${user.userName},\n\nYou have successfully signed the document (${documentKey}).\n\nYou can download the signed document here: ${signedUrl}\n\nThank you for using SignBuddy!`;

    sendEmail(senderEmail, subject, senderBody);
    sendEmail(user.email, subject, signerBody);

    return res.status(200).json({
      message: "Document signed successfully",
      signedDocumentUrl: signedUrl,
    });
  } catch (error) {
    console.error("Error signing document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.viewedDocument = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }
    const { documentKey, senderEmail } = req.body;

    if (!documentKey || !senderEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sender = await User.findOne({ email: senderEmail });

    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    const document = sender.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    const recipient = document.recipients.find(
      (rec) => rec.email === user.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }

    recipient.status = "viewed";
    await sender.save();
    const subject = "viewed document";
    const body = `<h1>${user.userName} viewed document </h1>`;
    sendEmail(senderEmail, subject, body);
    return res
      .status(200)
      .json({ message: "Document status updated to viewed" });
  } catch (error) {
    console.error("Error updating document status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.createAgreement = asyncHandler(async (req, res) => {
  try {
    const { prompt, type } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.subscriptionType === "free" && user.credits === 0) {
      return res
        .status(400)
        .json({ error: "Free users are not able to use AI features " });
    }
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    if (user.cooldownPeriod && new Date() > user.cooldownPeriod) {
      user.cooldownPeriod = null;
      user.creditsUsedInMembership = 0;
      await user.save();
    }
    const creditsRequired = type === "section" ? 4 : 10;
    const now = new Date();
    if (user.subscriptionType !== "free") {
      if (
        !user.cooldownPeriod &&
        user.creditsUsedInMembership + creditsRequired > 4000
      ) {
        user.cooldownPeriod = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      }
    }
    if (user.cooldownPeriod && user.cooldownPeriod > now) {
      if (user.credits < creditsRequired) {
        return res.status(403).json({
          error: "You are in cooldown period and have insufficient credits.",
        });
      } else {
        user.credits -= creditsRequired;
      }
    } else {
      if (user.subscriptionType === "free" && user.credits < creditsRequired) {
        return res.status(403).json({ error: "Insufficient credits." });
      }

      user.creditsUsedInMembership += creditsRequired;
      user.credits -= creditsRequired;
    }

    // Generate agreement using Grok API
    const agreementText = await generateAgreement(prompt, type || "full");

    await user.save();

    return res.status(200).json({ agreement: agreementText });
  } catch (error) {
    console.error("Error generating agreement:", error);
    res.status(500).json({ error: error.message });
  }
});

exports.getEmails = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await PreUser.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const newPreUser = new PreUser({ email });
    await newPreUser.save();
    const subject = "Joined the waitlist!";
    sendEmail(email, subject, emailForPreuser);

    res.status(201).json({ message: "Email saved successfully", email });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

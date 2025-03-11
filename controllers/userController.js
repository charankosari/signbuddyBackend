const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");
const TempOTP = require("../models/TempModel");
const DeletedAccounts = require("../models/DeletedAccounts");
const Agreement = require("../models/AgreementSchema");
const Plans = require("../models/PlansSchema");
const bcrypt = require("bcrypt");
const pdf = require("html-pdf");
const { createAuditPdfBuffer } = require("../utils/ConvertToPdf");
const { Poppler } = require("node-poppler");
const {
  VerifyEmailTemplate,
  signUpOtpMail,
  emailForPreuser,
  emailBody,
  ViewedDocument,
  sendDocument,
  CarbonCopy,
  CompletedSenderDocument,
  CompletedRecievedDocument,
} = require("../utils/Templates");
const {
  PDFDocument,
  rgb,
  StandardFonts,
  pushGraphicsState,
  PDFName,
  popGraphicsState,
  AnnotationFlags,
  setGraphicsState,
} = require("pdf-lib");
const { createPdfWithImagePlacements } = require("../utils/PrePdf");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const multer = require("multer");
const { putObject, deleteObject, UploadDocx } = require("../utils/s3objects");
const { processFile } = require("../utils/Ilovepdf");
const storage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const generateAgreement = require("../utils/grokAi");
const PreUser = require("../models/preUsers");
const poppler = new Poppler();
const { getAvatarsList } = require("../utils/s3objects");
const { S3Client } = require("@aws-sdk/client-s3");
const {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { config } = require("dotenv");
const SendUsersWithNoAccount = require("../models/SendUsersWithNoAccount");
const { OAuth2Client } = require("google-auth-library");
const Counter = require("../models/CountModel");
config({ path: "config/config.env" });
// connection
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
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

const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // Difference in seconds

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
};

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
  const body = signUpOtpMail(otp);
  sendEmail(email, subject, body);
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

  // Create the user
  const user = await User.create({ email, password });
  const updatedCounter = await Counter.incrementUserCount();
  const deletedAccount = await DeletedAccounts.findOne({ email });
  if (deletedAccount) {
    user.credits = deletedAccount.credits;
    message =
      "Registration successful. Your previous credits have been restored.";
    await DeletedAccounts.deleteOne({ email });
  } else {
    // Check if the email exists in PreUser. If so, assign 100 credits.
    const preUser = await PreUser.findOne({ email });
    if (preUser) {
      user.credits.freeCredits = 100;
      message =
        "Registration successful. You have been rewarded with 100 credits.";
      await PreUser.deleteOne({ email });
    } else {
      user.credits.freeCredits = 30;
      message =
        "Registration successful. You have been awarded with 30 credits.";
    }
  }
  const sendUserRecord = await SendUsersWithNoAccount.findOne({ email });
  if (sendUserRecord) {
    // Merge incoming agreements from sendUserRecord to user's incomingAgreements.
    if (
      sendUserRecord.incomingAgreements &&
      sendUserRecord.incomingAgreements.length > 0
    ) {
      user.incomingAgreements = user.incomingAgreements.concat(
        sendUserRecord.incomingAgreements
      );
    }
    // Delete the record from SendUsersWithNoAccount.
    await SendUsersWithNoAccount.deleteOne({ email });
  }

  // Remove the used OTP
  await TempOTP.deleteOne({ email });

  // Save the updated user with credits and incoming agreements.
  await user.save();

  res.status(201);
  sendJwt(user, 200, message, res);
});

exports.googleAuth = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new errorHandler("Google token is required", 400));
  }

  let ticket;
  try {
    // Verify the token using the Google client
    ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    return next(new errorHandler("Invalid Google token", 400));
  }

  const payload = ticket.getPayload();
  const { email, name } = payload;

  // Check if user already exists
  let user = await User.findOne({ email });
  let message = "";
  let navigationUrl = "";

  if (user) {
    // Existing user: send token & navigate to dashboard
    message = "Google authentication successful";
    navigationUrl = "/dashboard";
    return sendJwt(user, 200, { message, navigationUrl }, res);
  }

  // New user flow
  user = new User({ email, userName: name });
  const updatedCounter = await Counter.incrementUserCount();
  // Check if the email exists in PreUser => grant 100 credits
  const deletedAccount = await DeletedAccounts.findOne({ email });
  if (deletedAccount) {
    user.credits = deletedAccount.credits;
    message =
      "Registration successful. Your previous credits have been restored.";
    await DeletedAccounts.deleteOne({ email });
  } else {
    // Check if the email exists in PreUser. If so, assign 100 credits.
    const preUser = await PreUser.findOne({ email });
    if (preUser) {
      user.credits.freeCredits = 100;
      message =
        "Registration successful. You have been rewarded with 100 credits.";
      await PreUser.deleteOne({ email });
    } else {
      // If neither record exists, assign 30 credits.
      user.credits.freeCredits = 30;
      message =
        "Registration successful. You have been awarded with 30 credits.";
    }
  }

  // Check if this email exists in SendUsersWithNoAccount
  const sendUserRecord = await SendUsersWithNoAccount.findOne({ email });
  if (sendUserRecord) {
    if (
      sendUserRecord.incomingAgreements &&
      sendUserRecord.incomingAgreements.length > 0
    ) {
      user.incomingAgreements = user.incomingAgreements.concat(
        sendUserRecord.incomingAgreements
      );
    }
    // Delete the record from SendUsersWithNoAccount.
    await SendUsersWithNoAccount.deleteOne({ email });
  }
  // Save the new user
  await user.save();

  // Navigate to profile setup for newly created users
  navigationUrl = "/profile-setup";
  return sendJwt(user, 200, { message, navigationUrl }, res);
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Ensure user exists and fetch password
  const user = await User.findOne({ email }).select("+password");
  user.refillFreeCredits();
  user.updateSubscriptionIfExpired();
  user.save();
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Compare password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  sendJwt(user, 200, "Login successful", res);
});

// change password
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // If no password is set, assume user signed up with email only.
  if (!user.password) {
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: "Password set successfully" });
  }

  // Otherwise, compare the provided old password.
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password not matched" });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "Password changed successfully" });
});

// my details
exports.userDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  user.updateSubscriptionIfExpired();
  user.refillFreeCredits();
  user.save();
  const templatesCount = user.templates.length;

  // Calculate total documents count (documentsSent + drafts)
  const totalDocuments = user.documentsSent.length + user.drafts.length;

  // Documents in which all recipients have signed
  const completedDocuments = user.documentsSent.filter(
    (doc) =>
      doc.recipients.length > 0 &&
      doc.recipients.every((recipient) => recipient.status === "signed")
  ).length;

  // Documents that have at least one pending recipient
  const pendingDocuments = user.documentsSent.filter((doc) =>
    doc.recipients.some((recipient) => recipient.status === "pending")
  ).length;

  res.status(200).send({
    success: true,
    user,
    templatesCount,
    totalDocuments,
    completedDocuments,
    pendingDocuments,
  });
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
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileName = `templates/${Date.now()}-${req.file.originalname}`;

      const file = req.file;

      const result = await UploadDocx(file, fileName);

      if (result.status !== 200) {
        return res.status(500).json({ error: "Failed to upload file" });
      }
      const template = {
        fileKey: fileName,
        fileUrl: result,
        uploadedAt: new Date(),
      };

      user.templates.push(template);
      await user.save();
      res.status(201).json({
        message: "File uploaded successfully",
        fileUrl: result,
        key: result.key,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};
exports.addDraft = (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileName = `drafts/${Date.now()}-${req.file.originalname}`;

      const file = req.file;
      const result = await UploadDocx(file, fileName);

      if (result.status !== 200) {
        return res.status(500).json({ error: "Failed to upload file" });
      }
      const draft = {
        fileKey: fileName,
        fileUrl: result,
        uploadedAt: new Date(),
      };

      user.drafts.push(draft);
      await user.save();
      res.status(201).json({
        message: "File uploaded successfully",
        fileUrl: result,
        key: fileName,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};

exports.deleteTemplate = async (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
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

exports.viewedDocument = asyncHandler(async (req, res, next) => {
  try {
    // Get the currently logged-in user (the recipient)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }
    const { documentKey, senderEmail } = req.body;
    if (!documentKey || !senderEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the sender
    const sender = await User.findOne({ email: senderEmail });
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }

    // Find the document in sender's documentsSent
    const document = sender.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Find the recipient in the sender's document recipients
    const recipient = document.recipients.find(
      (rec) => rec.email === user.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }

    // If already marked viewed, return early
    if (recipient.status === "viewed") {
      return res
        .status(200)
        .json({ message: "Document already marked as viewed" });
    }

    // Capture IP address and update sender's document recipient status
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() || req.ip;
    recipient.status = "viewed";
    recipient.statusTime = new Date();
    recipient.recipientViewedIp = ipAddress;
    recipient.recipientViewedTime = Date.now();
    await sender.save();

    // Update the global Agreement document by finding it using the documentKey
    const agreement = await Agreement.findOne({ documentKey });
    if (agreement) {
      // Find the recipient entry in the Agreement's recipients array
      const globalRecipient = agreement.recipients.find(
        (rec) => rec.email === user.email
      );
      if (globalRecipient) {
        globalRecipient.status = "viewed";
        globalRecipient.statusTime = new Date();
        globalRecipient.documentViewedTime = new Date();

        // Optionally, add additional fields (e.g. recipientViewedIp) if you update the schema
      }
      await agreement.save();
    }

    // Optionally, notify the sender via email that the document was viewed
    const subject = `${document.documentName} has been viewed by ${user.userName}`;

    const body = ViewedDocument(
      sender.avatar,
      sender.userName,
      senderEmail,
      user.userName,
      document.documentName
    );
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
    if (user.subscription.type === "free" && user.credits === 0) {
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
    if (user.subscription.type !== "free") {
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
      if (user.subscription.type === "free" && user.credits < creditsRequired) {
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
exports.recentDocuments = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  let avatars = [];
  try {
    avatars = await getAvatarsList();
  } catch (error) {
    console.error("Error fetching avatars:", error);
  }

  // Process sender's documentsSent for recentDocs
  const recentDocs = user.documentsSent
    .filter((doc) => doc.documentKey) // Ensure documentKey is not empty
    .map((doc) => {
      const {
        documentKey,
        documentName,
        ImageUrls,
        recipients,
        placeholders,
        signedDocument,
      } = doc;

      const recipientDetails = recipients.map((r) => {
        const randomAvatar =
          !r.avatar && avatars.length > 0
            ? avatars[Math.floor(Math.random() * avatars.length)].url
            : r.avatar;
        return {
          name: r.userName || r.email,
          email: r.email,
          updates: `${formatTimeAgo(new Date(r.statusTime))} `,
          recipientsAvatar: randomAvatar,
        };
      });

      const recipientStatuses = recipients.map((r) => r.status);
      let status = "pending";

      if (!recipientStatuses || recipientStatuses.length === 0) {
        status = "draft";
      } else if (recipientStatuses.every((s) => s === "signed")) {
        status = "completed";
      } else if (recipientStatuses.includes("viewed")) {
        status = "viewed";
      }

      return {
        documentKey,
        title: documentName,
        documentUrl: ImageUrls,
        status,
        recipients: recipientDetails,
        signedDocument,
        placeholders,
      };
    });

  // Process drafts
  const draftsList = user.drafts
    .filter((draft) => draft.fileKey)
    .map((draft) => ({
      name: draft.fileKey,
      url: draft.fileUrl,
      placeholders: draft.placeholders,
      recipients: draft.recipients,
      time: formatTimeAgo(new Date(draft.uploadedAt)),
    }));

  // -------------------------------
  // Fetch incomingAgreements from the global Agreement model using agreementId
  // -------------------------------
  const incomingAgreementIds = user.incomingAgreements.map(
    (item) => item.agreementId
  );
  let incomingAgreements = [];
  if (incomingAgreementIds.length > 0) {
    const agreementsFromDB = await Agreement.find({
      _id: { $in: incomingAgreementIds },
    });

    incomingAgreements = agreementsFromDB.map((agreement) => {
      const recipients = agreement.recipients || [];
      const recipientDetails = recipients.map((r) => {
        const randomAvatar =
          !r.avatar && avatars.length > 0
            ? avatars[Math.floor(Math.random() * avatars.length)].url
            : r.avatar;
        return {
          name: r.userName || r.email,
          email: r.email,
          updates: r.statusTime
            ? `${formatTimeAgo(new Date(r.statusTime))} `
            : "",
          recipientsAvatar: randomAvatar,
        };
      });

      const recipientStatuses = recipients.map((r) => r.status);
      let computedStatus = "pending";
      if (!recipientStatuses || recipientStatuses.length === 0) {
        computedStatus = "draft";
      } else if (recipientStatuses.every((s) => s === "signed")) {
        computedStatus = "completed";
      } else if (recipientStatuses.includes("viewed")) {
        computedStatus = "viewed";
      }

      return {
        agreementKey: agreement.documentKey,
        senderEmail: agreement.senderEmail,
        imageUrls: agreement.imageUrls,
        title: agreement.title,
        placeholders: agreement.placeholders,
        receivedAt: formatTimeAgo(new Date(agreement.receivedAt)),
        status: computedStatus,
        recipients: recipientDetails,
        documentCreationTime: agreement.receivedAt,
        signedDocument: agreement.signedDocument,
      };
    });
  }

  res.status(200).json({
    recentDocuments: recentDocs,
    drafts: draftsList,
    incomingAgreements,
  });
});

exports.sendReminder = asyncHandler(async (req, res, next) => {
  const u = await User.findById(req.user.id).select("+creditsHistory");
  u.refillFreeCredits();
  u.updateSubscriptionIfExpired();
  u.save();
  let user = await User.findById(req.user.id).select("+creditsHistory");
  if (!user) return res.status(404).json({ message: "User not found" });
  try {
    // Check and deduct credit if the user is on a free subscription
    const currentDate = new Date();
    let deductCredits = false;

    // Check if user has an active paid subscription.
    // If the subscription type is not "free" and the endDate exists and is in the future,
    // then no deduction is required.
    if (
      user.subscription.type !== "free" &&
      user.subscription.endDate &&
      user.subscription.endDate > currentDate
    ) {
      deductCredits = false; // Active paid subscription: no credits are deducted.
    } else {
      deductCredits = true; // Free subscription or expired paid subscription: credits should be deducted.
    }

    if (deductCredits) {
      // Deduct credits: first try freeCredits, then purchasedCredits.
      if (user.credits.freeCredits >= 1) {
        user.credits.freeCredits -= 1;
      } else if (user.credits.purchasedCredits >= 1) {
        user.credits.purchasedCredits -= 1;
      } else {
        return res.status(403).json({
          error: "You do not have enough credits to send a reminder.",
        });
      }
      // Update the totalCredits field.
      user.credits.totalCredits =
        user.credits.freeCredits + user.credits.purchasedCredits;

      // Log the deduction event in creditsHistory.
      user.creditsHistory.push({
        thingUsed: "Reminder",
        creditsUsed: "1",
        timestamp: currentDate,
        description: "Reminder sent using credits",
      });
    } else {
      // For active paid subscriptions, no credits are deducted.
      // Still log the event (you can mark creditsUsed as "0" to indicate no deduction).
      user.creditsHistory.push({
        thingUsed: "Reminder",
        creditsUsed: "1",
        timestamp: currentDate,
        description: "Reminder sent using subscription",
      });
    }

    const {
      emails,
      names,
      previewImageUrl,
      redirectUrl,
      senderEmail,
      fileKey,
    } = req.body;
    const sender = await User.findOne({ email: senderEmail });
    if (!sender) {
      return res.status(404).json({ message: "Sender user not found" });
    }

    // 6) Locate the specific document in sender.documentsSent by documentKey
    const foundDoc = sender.documentsSent.find(
      (d) => d.documentKey === fileKey
    );

    if (!foundDoc) {
      return res
        .status(404)
        .json({ message: "Document not found in sender's account" });
    }

    // 7) Validate emails/names arrays
    if (!Array.isArray(emails) || !Array.isArray(names)) {
      return res
        .status(400)
        .json({ message: "Emails and names must be provided as arrays" });
    }
    if (emails.length !== names.length) {
      return res
        .status(400)
        .json({ message: "Emails and names arrays must have the same length" });
    }

    // 8) Retrieve custom email details from the user model
    //    If you want to use doc.CustomEmail instead, you can do so
    if (
      !foundDoc.CustomEmail ||
      !foundDoc.CustomEmail.subject ||
      !foundDoc.CustomEmail.emailBody
    ) {
      return res.status(400).json({
        message: "Custom email details not set in the document",
      });
    }
    // const customEmail = foundDoc.CustomEmail;

    // 9) For each recipient, send a reminder
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      await sendEmail(
        email,
        "Complete pending document",
        sendDocument(
          foundDoc.documentName,
          sender.avatar,
          sender.userName,
          sender.email,
          foundDoc.CustomEmail.emailBody,
          foundDoc.ImageUrls[0],
          redirectUrl
        )
      );
    }

    // Save the updated user document with deducted credits and new history entry.
    await user.save();

    res.status(200).json({ message: "Reminder sent successfully" });
  } catch (error) {
    next(error);
  }
});

exports.deleteDocument = asyncHandler(async (req, res, next) => {
  const { key, type } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing document key" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const docIndex = user.documentsSent.findIndex(
    (doc) => doc.documentKey === key
  );
  if (docIndex === -1) {
    return res.status(404).json({ error: "Document not found" });
  }
  const document = user.documentsSent[docIndex];

  const mainDeleteResult = await deleteObject(key);
  if (mainDeleteResult.status !== 204) {
    return res.status(500).json({
      error: "Failed to delete document file from S3",
      details: mainDeleteResult,
    });
  }

  const imagesPrefix = `images/${key}/`;
  try {
    const listParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: imagesPrefix,
    };
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await this.s3Client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      for (const file of listResponse.Contents) {
        const imageDeleteResult = await deleteObject(file.Key);
        if (imageDeleteResult.status !== 204) {
          console.error(
            `Failed to delete image ${file.Key}`,
            imageDeleteResult
          );
        }
      }
    }
  } catch (error) {
    console.error("Error deleting images from S3:", error);
    return res.status(500).json({ error: "Failed to delete images from S3" });
  }

  user.documentsSent.splice(docIndex, 1);
  if (type === "draft") {
    user.drafts = user.drafts.filter((draft) => draft.fileKey !== key);
    const draftDeleteResult = await deleteObject(key);
    if (draftDeleteResult.status !== 204) {
      console.error(
        `Failed to delete draft file from S3 with key: ${key}`,
        draftDeleteResult
      );
    }
  }
  await user.save();

  res.status(200).json({ message: "Document deleted successfully" });
});

exports.getCredits = asyncHandler(async (req, res, next) => {
  const u = await User.findById(req.user.id)
    .select("credits subscription billingHistory")
    .select("+creditsHistory");
  u.updateSubscriptionIfExpired();
  u.save();
  const user = await User.findById(req.user.id)
    .select("credits subscription billingHistory")
    .select("+creditsHistory");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    credits: user.credits,
    creditsHistory: user.creditsHistory,
    subscription: user.subscription,
    billingHistory: user.billingHistory,
  });
});

exports.ConvertToImages = asyncHandler(async (req, res, next) => {
  // Ensure the user exists.
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  // Generate a unique ID for this process.
  const uniqueId = uuidv4();
  const originalName = file.originalname.trimStart();
  const fileKey = `agreements/${uniqueId}-${originalName}`;
  const imagesFolder = `images/${uniqueId}-${originalName}`;

  // Define the main temp directory.
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create a dedicated subfolder using the unique id.
  const processDir = path.join(tempDir, uniqueId);
  if (!fs.existsSync(processDir)) {
    fs.mkdirSync(processDir, { recursive: true });
  }

  let pdfBuffer;
  let docUrl;

  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX branch:
    // 1. Upload the DOCX file with a unique name.
    const docxUpload = await UploadDocx(file, `${uniqueId}-${originalName}`);
    // 2. Use the DOCX URL in the response.
    // 3. Process the DOCX to get a PDF buffer (for image conversion only).
    pdfBuffer = await processFile(docxUpload, uniqueId);
    const pdfUpload = await putObject(
      pdfBuffer,
      `agreements/${uniqueId}.pdf`,
      "application/pdf"
    );

    if (pdfUpload.status !== 200) {
      throw new Error("Failed to upload converted PDF");
    }

    docUrl = pdfUpload.url; // Store the uploaded PDF URL
  } else if (file.mimetype === "application/pdf") {
    // PDF branch:
    // Get the PDF buffer directly.
    pdfBuffer = file.buffer || fs.readFileSync(file.path);
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  // Write the PDF buffer to a file in the dedicated subfolder.
  const tempFilePath = path.join(processDir, `${uniqueId}.pdf`);
  fs.writeFileSync(tempFilePath, pdfBuffer);

  // If the input file is a PDF, upload the PDF to S3.
  if (file.mimetype === "application/pdf") {
    const fileBuffer = fs.readFileSync(tempFilePath);
    const pdfUpload = await putObject(fileBuffer, fileKey, "application/pdf");
    if (pdfUpload.status !== 200) {
      throw new Error("Failed to upload document");
    }
    docUrl = pdfUpload.url;
  }

  // Set up options for the PDF-to-image conversion.
  const options = {
    jpegFile: true,
    resolutionXYAxis: 300,
    singleFile: false,
  };

  // Define an output prefix for Poppler conversion.
  // This prefix will be used to generate files like <uniqueId>-1.jpg, <uniqueId>-2.jpg, etc.
  const outputPrefix = path.join(processDir, uniqueId);

  await poppler.pdfToCairo(tempFilePath, outputPrefix, options);

  // List files in the process directory after conversion.
  const filesAfterConversion = fs.readdirSync(processDir);

  // Filter for image files (accepting both .jpg and .jpeg).
  const imageFiles = filesAfterConversion.filter((f) => {
    const lower = f.toLowerCase();
    return (
      (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) &&
      f.startsWith(uniqueId)
    );
  });

  let imageUrls = [];
  for (const imageFile of imageFiles) {
    const imagePath = path.join(processDir, imageFile);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageKey = `${imagesFolder}/${imageFile}`;

    const imageUpload = await putObject(imageBuffer, imageKey, "image/jpeg");
    if (imageUpload.status !== 200) {
      throw new Error("Failed to upload image");
    }
    imageUrls.push(imageUpload.url);
    fs.unlinkSync(imagePath);
  }

  if (fs.existsSync(processDir)) {
    fs.rmSync(processDir, { recursive: true, force: true });
  }

  const date = new Date();
  const ipAddress =
    req.headers["x-forwarded-for"]?.split(",").shift() || req.ip;
  if (fileKey) {
    const newDocument = {
      documentKey: fileKey,
      ImageUrls: imageUrls,
      documentName: originalName,
      sentAt: date,
      documentCreationIp: ipAddress,
      documentCreationTime: Date.now(),
      uniqueId: uniqueId,
      pdfDoc: docUrl,
    };

    // Also create a new draft object to push into user.drafts.
    const newDraft = {
      fileKey: fileKey,
      fileUrl: docUrl,
      uploadedAt: date,
    };

    // Save the IP address as the recipient's signed IP
    // user.documentsSent.
    // Update the user's documentsSent and drafts arrays.
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          documentsSent: newDocument,
          drafts: newDraft,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Converted successfully",
      fileKey,
      docUrl,
      imageUrls,
      previewImageUrl: imageUrls,
      originalName,
    });
  }
  req.status(400).json({ error: "no required details provided" });
});

exports.sendAgreements = asyncHandler(async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id).select("+creditsHistory");
    u.refillFreeCredits();
    u.updateSubscriptionIfExpired();
    u.save();
    const user = await User.findById(req.user.id).select("+creditsHistory");

    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }
    const currentDate = new Date();
    let deductCredits = false;

    // Check if user has an active paid subscription.
    // If the subscription type is not "free" and the endDate exists and is in the future,
    // then no deduction is required.
    if (
      user.subscription.type !== "free" &&
      user.subscription.endDate &&
      user.subscription.endDate > currentDate
    ) {
      deductCredits = false; // Active paid subscription: no credits are deducted.
    } else {
      deductCredits = true; // Free subscription or expired paid subscription: credits should be deducted.
    }

    if (deductCredits) {
      // Deduct credits: first try freeCredits, then purchasedCredits.
      if (user.credits.freeCredits >= 10) {
        user.credits.freeCredits -= 10;
      } else if (user.credits.purchasedCredits >= 10) {
        user.credits.purchasedCredits -= 10;
      } else {
        return res
          .status(403)
          .json({ error: "You do not have enough credits to send." });
      }
      // Update the totalCredits field.
      user.credits.totalCredits =
        user.credits.freeCredits + user.credits.purchasedCredits;

      // Log the deduction event in creditsHistory.
      user.creditsHistory.push({
        thingUsed: "documentSent",
        creditsUsed: "10",
        timestamp: currentDate,
        description: "Document sent using credits",
      });
    } else {
      // For active paid subscriptions, no credits are deducted.
      // Still log the event (you can mark creditsUsed as "0" to indicate no deduction).
      user.creditsHistory.push({
        thingUsed: "documentSent",
        creditsUsed: "10",
        timestamp: currentDate,
        description: "Document sent using subscription",
      });
    }

    if (!req.body.emails || !req.body.names) {
      return res.status(400).json({ error: "Emails and names are required" });
    }

    const previewImageUrl = req.body.previewImageUrl;
    const customEmail = req.body.customEmail;
    const emailB = customEmail.emailBody;
    const subjectB = customEmail.subject;
    const fileKey = req.body.fileKey;
    const emails =
      typeof req.body.emails === "string"
        ? Object.values(JSON.parse(req.body.emails))
        : Object.values(req.body.emails);
    const names =
      typeof req.body.names === "string"
        ? Object.values(JSON.parse(req.body.names))
        : Object.values(req.body.names);
    const ccEmails =
      typeof req.body.CC === "string"
        ? Object.values(JSON.parse(req.body.CC))
        : req.body.CC;
    let placeholders;
    try {
      placeholders =
        typeof req.body.placeholders === "string"
          ? JSON.parse(req.body.placeholders)
          : req.body.placeholders;
    } catch (error) {
      return res.status(400).json({ error: "Invalid placeholders format" });
    }

    const redirectUrl = `https://signbuddy.in/sign/agreements/${encodeURIComponent(
      fileKey
    )}`;
    const d = user.documentsSent.find((doc) => doc.documentKey === fileKey);
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() || req.ip;
    d.documentSentIp = ipAddress;
    emails.forEach((email, index) => {
      sendEmail(
        email,
        subjectB,
        sendDocument(
          d.documentName,
          user.avatar,
          user.userName,
          user.email,
          emailB,
          d.ImageUrls[0],
          redirectUrl
        )
      );
    });

    const date = new Date();

    // Build recipients info (used for updating sender's documentsSent).
    const recipients = await Promise.all(
      emails.map(async (email, index) => {
        const recipientUser = await User.findOne({ email });
        return {
          email,
          userName: names[index] || email,
          status: "pending",
          statusTime: date,
          avatar:
            recipientUser && recipientUser.avatar ? recipientUser.avatar : null,
        };
      })
    );

    // Update sender's document entry.
    const docIndex = user.documentsSent.findIndex(
      (doc) => doc.documentKey === fileKey
    );
    const newDate = Date.now();
    if (docIndex !== -1) {
      user.documentsSent[docIndex] = {
        ...user.documentsSent[docIndex],
        signedDocument: null,
        documentKey: fileKey,
        documentName: user.documentsSent[docIndex].documentName,
        ImageUrls: user.documentsSent[docIndex].ImageUrls,
        uniqueId: user.documentsSent[docIndex].uniqueId,
        sentAt: date,
        documentCreationIp: user.documentsSent[docIndex].documentCreationIp,
        documentCreationTime: user.documentsSent[docIndex].documentCreationTime,
        documentSentTime: newDate,
        documentSentIp: ipAddress,
        recipients: recipients,
        pdfDoc: user.documentsSent[docIndex].pdfDoc,
        placeholders: placeholders,
        CC: ccEmails,
        CustomEmail: {
          subject: customEmail.subject,
          emailBody: customEmail.emailBody,
        },
      };
    }

    const agreementData = {
      documentKey: fileKey,
      senderEmail: user.email,
      imageUrls: d.ImageUrls || [],
      placeholders: placeholders,
      receivedAt: date,
      title: d.documentName || "",
      recipients: recipients,
      customEmail: customEmail,
    };
    const agreement = new Agreement(agreementData);
    await agreement.save();
    const agreementId = agreement._id;

    // For each recipient, store the agreement reference.
    for (let i = 0; i < emails.length; i++) {
      const recipientEmail = emails[i];
      // Find recipient as a registered user.
      const recipientUser = await User.findOne({
        email: recipientEmail,
      }).select("incomingAgreements");
      if (recipientUser) {
        // Push the agreement reference.
        recipientUser.incomingAgreements.push({
          agreementId,
        });
        await recipientUser.save();
      } else {
        // For non-registered users, update or create a record in SendUsersWithNoAccount.
        let noAccountRecord = await SendUsersWithNoAccount.findOne({
          email: recipientEmail,
        });
        if (!noAccountRecord) {
          noAccountRecord = new SendUsersWithNoAccount({
            email: recipientEmail,
            incomingAgreements: [{ agreementId }],
          });
        } else {
          noAccountRecord.incomingAgreements.push({ agreementId });
        }
        await noAccountRecord.save();
      }
    }

    // Remove the document from drafts if present.
    if (user.drafts && user.drafts.length) {
      user.drafts = user.drafts.filter((draft) => draft.fileKey !== fileKey);
    }
    await user.save();
    const updatedCounter = await Counter.incrementDocumentsSentCount();
    res.status(200).json({
      message: "Agreement sent successfully",
      previewImageUrl,
      fileKey,
      allImageUrls: d.ImageUrls,
    });
  } catch (error) {
    console.error("Error sending agreement:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const keysToDelete = [];
  if (user.drafts && Array.isArray(user.drafts)) {
    user.drafts.forEach((draft) => {
      if (draft.fileKey) {
        keysToDelete.push({ Key: draft.fileKey });
      }
    });
  }
  if (user.templates && Array.isArray(user.templates)) {
    user.templates.forEach((template) => {
      if (template.fileKey) {
        keysToDelete.push({ Key: template.fileKey });
      }
    });
  }

  if (user.documentsSent && Array.isArray(user.documentsSent)) {
    for (const doc of user.documentsSent) {
      if (doc.documentKey) {
        keysToDelete.push({ Key: doc.documentKey });
      }
      if (doc.ImageUrls && Array.isArray(doc.ImageUrls)) {
        doc.ImageUrls.forEach((imageKey) => {
          keysToDelete.push({ Key: imageKey });
        });
      }
      if (doc.documentKey) {
        const prefix = `images/${doc.documentKey}/`;
        const listParams = {
          Bucket: process.env.AWS_S3_BUCKET, // Your S3 bucket name
          Prefix: prefix,
        };
        try {
          const listCommand = new ListObjectsV2Command(listParams);
          const listResponse = await this.s3Client.send(listCommand);
          if (listResponse.Contents && listResponse.Contents.length > 0) {
            listResponse.Contents.forEach((item) => {
              keysToDelete.push({ Key: item.Key });
            });
          }
        } catch (error) {
          console.error(`Error listing objects for prefix ${prefix}:`, error);
        }
      }
    }
  }

  if (keysToDelete.length > 0) {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: keysToDelete,
        Quiet: false,
      },
    };

    try {
      const deleteCommand = new DeleteObjectsCommand(deleteParams);
      const deleteResponse = await this.s3Client.send(deleteCommand);
    } catch (error) {
      console.error("Error deleting S3 objects:", error);
    }
  }
  await DeletedAccounts.create({
    email: user.email,
    credits: user.credits,
  });

  await User.findByIdAndDelete(userId);
  res
    .status(200)
    .json({ message: "User and associated files deleted successfully" });
});

exports.updateProfileDetails = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { userName, email, avatar } = req.body;

  if (!userName && !email && !avatar) {
    return res.status(400).json({
      error:
        "At least one field (username, email, or avatar) must be provided to update.",
    });
  }

  const updateData = {};
  if (userName) updateData.userName = userName;
  if (avatar) updateData.avatar = avatar;

  let updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (email) {
    const user = await User.findById(userId);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.hashedOtp = hashedOtp;
    user.hashedOtpExpire = Date.now() + 10 * 60 * 1000;

    await user.save();
    const body = VerifyEmailTemplate(otp, user.userName);

    sendEmail(email, "Verify your new email", body);
    if (!userName && !avatar) {
      return res.status(200).json({
        message: "Sent Otp to email.",
      });
    }
  }
  res.status(200).json({
    message: "Profile updated successfully.",
    user: updatedUser,
  });
});
exports.verifyEmailUpdate = asyncHandler(async (req, res, next) => {
  const { otp, email, newEmail } = req.body;
  if (!otp) {
    return res.status(400).json({ error: "OTP is required." });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  if (!user.hashedOtp) {
    return res.status(400).json({ error: "Signup successfull." });
  }

  // Insert expiry check here using your method
  if (user.CheckExpiryOfOtp()) {
    user.hashedOtp = null;
    user.hashedOtpExpire = null;
    user.save();
    return res
      .status(400)
      .json({ error: "OTP has expired. Please request a new OTP." });
  }

  const isMatch = await bcrypt.compare(otp, user.hashedOtp);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  user.email = newEmail;
  user.hashedOtp = null;
  user.hashedOtpExpire = null;
  await user.save();
  res.status(200).json({
    message: "Email updated successfully.",
    user,
  });
});

// forgot password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  user.hashedOtp = hashedOtp;
  user.hashedOtpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();
  const body = VerifyEmailTemplate(otp, user.userName);
  sendEmail(email, "Forgot passowrd", body);
  return res.status(201).json({ message: "OTP Sent successfully" });
});

// reset password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { otp, newPassword, email } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }
  if (!user.hashedOtpExpire || Date.now() > user.hashedOtpExpire) {
    user.hashedOtp = null;
    user.hashedOtpExpire = null;
    await user.save();
    return res
      .status(400)
      .json({ error: "OTP has expired. Please request a new OTP." });
  }

  const isMatch = await bcrypt.compare(otp, user.hashedOtp);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  user.password = newPassword;
  user.hashedOtp = null;
  user.hashedOtpExpire = null;
  await user.save();
  res.status(200).json({
    message: "Pasword updated successfully.",
    user,
  });
});

exports.updateDraft = asyncHandler(async (req, res, next) => {
  const { fileKey, updatedDraft } = req.body;
  if (!fileKey || !updatedDraft) {
    return res
      .status(400)
      .json({ error: "Both fileKey and updatedDraft data are required" });
  }

  // Find the user document using the authenticated user's ID
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Locate the index of the draft in the drafts array by fileKey
  const draftIndex = user.drafts.findIndex(
    (draft) => draft.fileKey === fileKey
  );
  if (draftIndex === -1) {
    return res.status(404).json({ error: "Draft not found" });
  }

  // Replace the entire draft object with the updated data.
  // Ensure the fileKey is maintained.
  user.drafts[draftIndex] = { ...updatedDraft, fileKey };

  // Save the updated user document.
  await user.save();

  res.status(200).json({
    message: "Draft updated successfully",
    draft: user.drafts[draftIndex],
  });
});

exports.getPlans = asyncHandler(async (req, res, next) => {
  const plans = await Plans.findOne({});
  if (!plans) {
    return res.status(404).json({ success: false, message: "Plans not found" });
  }

  res.status(200).json({
    success: true,
    plans,
  });
});

exports.getIp = (req, res, next) => {
  try {
    // Get the IP from x-forwarded-for header if present; otherwise, use req.ip.
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() || req.ip;
    res.json({ ip: ipAddress });
  } catch (error) {
    next(error);
  }
};

exports.getCounter = async (req, res, next) => {
  try {
    const count = await Counter.findOne({});

    if (count && count.date) {
      const now = new Date();
      const differenceInMs = count.date - now;
      let diffDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
      if (Math.abs(diffDays) === 1) {
        daysText = `Documents sent in ${Math.abs(diffDays)} Day`;
      } else {
        daysText = `Documents sent in ${Math.abs(diffDays)} Days`;
      }
    }

    res.status(200).json({
      success: true,
      count: {
        users: count ? count.userCount : 0,
        documents: count ? count.documentsSentCount : 0,
        days: daysText,
      },
    });
  } catch (err) {
    next(err);
  }
};

// exports.createOrUpdatePlans = asyncHandler(async (req, res, next) => {
//   const { creditPackages, subscriptionPlans } = req.body;
//   if (!creditPackages || !subscriptionPlans) {
//     return res.status(400).json({
//       success: false,
//       message: "Both creditPackages and subscriptionPlans are required",
//     });
//   }

//   // Check if a Plans document already exists
//   let plans = await Plans.findOne({});
//   if (plans) {
//     // Update existing document
//     plans.creditPackages = creditPackages;
//     plans.subscriptionPlans = subscriptionPlans;
//   } else {
//     // Create a new Plans document
//     plans = new Plans({ creditPackages, subscriptionPlans });
//   }
//   await plans.save();
//   res.status(200).json({
//     success: true,
//     plans,
//   });
// });
exports.agreeDocument = asyncHandler(async (req, res, next) => {
  try {
    const { senderEmail, documentKey } = req.body;
    if (!senderEmail || !documentKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Parse placeholders array from the request body.
    let placeholdersFromReq = [];
    if (req.body.placeholders) {
      try {
        placeholdersFromReq = JSON.parse(req.body.placeholders);
      } catch (parseErr) {
        return res.status(400).json({ error: "Invalid JSON in placeholders" });
      }
    }

    // 2. Find sender user and present user.
    const senderUser = await User.findOne({ email: senderEmail });
    if (!senderUser) {
      return res.status(404).json({ error: "Sender user not found" });
    }
    const presentUser = await User.findById(req.user.id);
    if (!presentUser) {
      return res.status(404).json({ error: "Present user not found" });
    }

    // 3. Locate the document in senderUser.documentsSent by documentKey.
    const document = senderUser.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res
        .status(404)
        .json({ error: "Document not found in sender user's documentsSent" });
    }

    // 4. Mark the recipient (whose email matches the present user) as "signed".
    const recipient = document.recipients.find(
      (r) => r.email === presentUser.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }
    if (recipient.status === "signed") {
      return res
        .status(200)
        .json({ message: "Document already marked as signed" });
    }
    recipient.status = "signed";
    recipient.statusTime = new Date();
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",").shift() || req.ip;
    const nowDate = Date.now();
    recipient.recipientSignedIp = ipAddress;
    if (recipient.recipientViewedIp === null) {
      recipient.recipientViewedIp = ipAddress;
    }
    if (recipient.recipientViewedTime === null) {
      recipient.recipientViewedTime = nowDate;
    }
    recipient.recipientSignedTime = nowDate;

    // Update placeholders with any new signature or text/date values.
    for (const phReq of placeholdersFromReq) {
      const { email, type, value } = phReq;
      const docPlaceholder = document.placeholders.find(
        (p) => p.email === email && p.type === type
      );
      if (!docPlaceholder) continue;
      const matchingFile = req.files.find((f) => f.originalname === value);
      if (matchingFile) {
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const uniqueId = uuidv4();
        const imageFile = `${uniqueId}.png`;
        const tempFilePath = path.join(tempDir, imageFile);
        fs.writeFileSync(tempFilePath, matchingFile.buffer);
        const imageBuffer = fs.readFileSync(tempFilePath);
        const imagesFolder = `signatures/${documentKey}`;
        const imageKey = `${imagesFolder}/${imageFile}`;
        const imageUpload = await putObject(imageBuffer, imageKey, "image/png");
        if (imageUpload.status !== 200) {
          fs.unlinkSync(tempFilePath);
          return res
            .status(500)
            .json({ error: "Failed to upload image placeholder" });
        }
        docPlaceholder.value = imageUpload.url;
        fs.unlinkSync(tempFilePath);
      } else {
        // For text/date placeholders, simply store the literal value.
        if ((type === "text" || type === "date") && value) {
          docPlaceholder.value = value;
        }
      }
    }

    await senderUser.save();

    // -----------------------------------------------------------------
    // Update the global Agreement document (if exists) to reflect the changes.
    // -----------------------------------------------------------------
    const agreement = await Agreement.findOne({ documentKey });
    if (agreement) {
      const globalRecipient = agreement.recipients.find(
        (rec) => rec.email === presentUser.email
      );
      if (globalRecipient) {
        globalRecipient.status = "signed";
        globalRecipient.statusTime = new Date();
        globalRecipient.documentSignedTime = new Date();
        if (globalRecipient.documentViewedTime === null) {
          globalRecipient.documentViewedTime = new Date();
        }
      }
      for (const phReq of placeholdersFromReq) {
        const { email, type, value } = phReq;
        const globalPlaceholder = agreement.placeholders.find(
          (p) => p.email === email && p.type === type
        );
        if (!globalPlaceholder) continue;
        const localPh = document.placeholders.find(
          (p) => p.email === email && p.type === type
        );
        if (type === "signature" && email === presentUser.email) {
          globalPlaceholder.value = localPh ? localPh.value : "";
        } else if ((type === "text" || type === "date") && localPh) {
          globalPlaceholder.value = localPh.value;
        }
      }
      await agreement.save();
    }

    // 5. If all recipients have signed, generate the final PDF with overlays.
    const allSigned = document.recipients.every((r) => r.status === "signed");
    if (allSigned) {
      // Use document.pdfDoc (the URL to the original PDF) and document.placeholders
      // as the placements for overlaying the images.
      const modifiedPdfBuffer = await createPdfWithImagePlacements(
        document.pdfDoc,
        document.placeholders
      );
      // Now load the modified PDF to add a footer.
      const finalPdfDoc = await PDFDocument.load(modifiedPdfBuffer);
      const pages = finalPdfDoc.getPages();
      const font = await finalPdfDoc.embedFont(StandardFonts.Helvetica);

      // Decrease footer font size and adjust margins.
      const footerFontSize = 8; // decreased from 32
      const bottomMargin = 20;
      const leftMargin = 20;
      const rightMargin = 20;

      // Load check icon.
      const checkIconPath = path.join(__dirname, "../assets/check.png");
      let checkIconBytes;
      try {
        checkIconBytes = fs.readFileSync(checkIconPath);
      } catch (err) {
        console.error("Error reading check icon file:", err);
        checkIconBytes = null;
      }
      let checkIconImage = null;
      if (checkIconBytes) {
        checkIconImage = await finalPdfDoc.embedPng(checkIconBytes);
      }
      const footerIconWidth = 8; // decreasFed from 32
      const footerIconHeight = 8;
      const rightFooterText = "Secured via signbuddy";
      const leftFooterText = `Document Id - ${document.uniqueId}`;

      // Add footer to each page.
      pages.forEach((page) => {
        const pageWidth = page.getWidth();
        // Draw left footer text.
        page.drawText(leftFooterText, {
          x: leftMargin,
          y: bottomMargin,
          size: footerFontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        // Compute right footer positioning.
        const rightTextWidth = font.widthOfTextAtSize(
          rightFooterText,
          footerFontSize
        );
        const totalRightFooterWidth = footerIconWidth + 5 + rightTextWidth;
        const iconX = pageWidth - rightMargin - totalRightFooterWidth;
        const iconY = bottomMargin;
        if (checkIconImage) {
          page.drawImage(checkIconImage, {
            x: iconX,
            y: iconY,
            width: footerIconWidth,
            height: footerIconHeight,
          });
        } else {
          page.drawText("✓", {
            x: iconX,
            y: iconY,
            size: footerIconHeight,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
        page.drawText(rightFooterText, {
          x: iconX + footerIconWidth + 5,
          y: iconY + (footerIconHeight - footerFontSize) / 2,
          size: footerFontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });

      // ------------------------------------------------------------------
      // STEP B: ADD AN EXTRA PAGE FOR THE AUDIT RECORD.
      // ------------------------------------------------------------------
      const docName = document.documentName || "Untitled";
      const docId = document.uniqueId || document.documentKey;
      const creationTime = document.documentCreationTime
        ? new Date(document.documentCreationTime).toLocaleString()
        : "N/A";
      const creationIp = document.documentCreationIp || "N/A";
      const completedTime = new Date().toLocaleString();

      const createdRow = {
        senderName: senderUser.userName || senderUser.email,
        senderEmail: senderUser.email,
        time: creationTime,
        ip: creationIp,
      };
      const sentRows = document.recipients.map((rec) => ({
        recipientName: rec.userName || rec.email,
        recipientEmail: rec.email,
        time: document.documentSentTime
          ? new Date(document.documentSentTime).toLocaleString()
          : "N/A",
        ip: document.documentSentIp || "N/A",
      }));
      const viewedRows = document.recipients
        .filter((rec) => rec.status === "viewed" || rec.recipientViewedTime)
        .map((rec) => ({
          recipientName: rec.userName || rec.email,
          recipientEmail: rec.email,
          time: rec.recipientViewedTime
            ? new Date(rec.recipientViewedTime).toLocaleString()
            : "N/A",
          ip: rec.recipientViewedIp || "N/A",
        }));
      const signedRows = document.recipients
        .filter((rec) => rec.status === "signed")
        .map((rec) => ({
          recipientName: rec.userName || rec.email,
          recipientEmail: rec.email,
          time: rec.recipientSignedTime
            ? new Date(rec.recipientSignedTime).toLocaleString()
            : "N/A",
          ip: rec.recipientSignedIp || "N/A",
        }));

      const finalData = {
        documentName: docName,
        documentId: docId,
        creationTime,
        creationIp,
        completedTime,
        createdRow,
        sentRows,
        viewedRows,
        signedRows,
      };

      // Assume createAuditPdfBuffer is defined elsewhere.
      const { width: firstPageWidth, height: firstPageHeight } = finalPdfDoc
        .getPage(0)
        .getSize();
      const auditPdfBuffer = await createAuditPdfBuffer(
        finalData,
        firstPageWidth,
        firstPageHeight
      );
      const appendedPdfDoc = await PDFDocument.load(auditPdfBuffer);
      const appendedPages = await finalPdfDoc.copyPages(
        appendedPdfDoc,
        appendedPdfDoc.getPageIndices()
      );
      appendedPages.forEach((page) => finalPdfDoc.addPage(page));

      const pdfBytes = await finalPdfDoc.save();
      const pdfKey = `signedDocuments/${documentKey}.pdf`;
      const pdfUpload = await putObject(pdfBytes, pdfKey, "application/pdf");
      if (pdfUpload.status !== 200) {
        return res
          .status(500)
          .json({ error: "Failed to upload final signed PDF" });
      }
      console.log("Final signed PDF URL:", pdfUpload.url);
      const finalDocumentUrl = pdfUpload.url;
      document.signedDocument = pdfUpload.url;
      const globalAgreement = await Agreement.findOne({ documentKey });
      if (globalAgreement) {
        globalAgreement.signedDocument = pdfUpload.url;
        globalAgreement.status = "signed";
        await globalAgreement.save();
      }

      try {
        const senderMailBody = CompletedSenderDocument(
          docName,
          senderUser.userName || senderUser.email,
          document.recipients.map((r) => r.userName).join(", "),
          document.ImageUrls[0],
          finalDocumentUrl
        );
        await sendEmail(
          senderUser.email,
          `${docName} has been completed`,
          senderMailBody
        );
      } catch (err) {
        console.error("Error sending CompletedSenderDocument email:", err);
      }

      for (const rec of document.recipients) {
        try {
          if (!rec.email) continue;
          const recipientMailBody = CompletedRecievedDocument(
            docName,
            rec.userName || rec.email,
            document.ImageUrls[0],
            finalDocumentUrl
          );
          await sendEmail(
            rec.email,
            `You have a completed document: "${docName}"`,
            recipientMailBody
          );
        } catch (err) {
          console.error(
            `Error sending CompletedRecievedDocument to ${rec.email}:`,
            err
          );
        }
      }

      if (document.CC && document.CC.length > 0) {
        try {
          const subject = `Carbon Copy of the ${docName}`;
          const ccBody = CarbonCopy(
            document.documentName || "Untitled",
            senderUser.avatar || "",
            senderUser.userName || senderUser.email,
            senderUser.email,
            document.ImageUrls[0] || "",
            pdfUpload.url
          );
          for (const ccEmail of document.CC) {
            await sendEmail(ccEmail, subject, ccBody);
          }
        } catch (err) {
          console.error("Error sending final document to CC emails:", err);
        }
      }
    }

    await senderUser.save();
    res.status(200).json({
      message: "Placeholders updated successfully",
    });
  } catch (error) {
    console.error("Error in agreeDocument:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

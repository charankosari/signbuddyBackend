const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const TempOTP = require("../models/TempModel");
const bcrypt = require("bcrypt");
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const multer = require("multer");
const { putObject, deleteObject, getObject } = require("../utils/s3objects");
const storage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
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
    // const mailMessage = await sendEmail({
    //   email: user.email,
    //   subject: "password reset mail",
    //   message: message,
    // });
    res.status(201).json({
      success: true,
      message: "mail sent successfully",
      mailMessage: message,
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

      const { emails, names } = req.body;
      if (!emails || !names || !req.file) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Extract file details
      const fileBuffer = req.file.buffer;
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype;
      const fileKey = `agreements/${uuidv4()}-${fileName}`;

      // Upload document to S3
      const docUpload = await putObject(fileBuffer, fileKey, fileType);
      if (docUpload.status !== 200) {
        return res.status(500).json({ error: "Failed to upload document" });
      }

      // Document URL & Sign-in link
      const docUrl = docUpload.url;
      const redirectUrl = `https://signbuddy.in?document=${encodeURIComponent(
        docUrl
      )}`;

      // Email subject & body
      const subject = "Agreement Document for Signing";
      const emailBody = (name) => `
        <h2>Hello ${name},</h2>
        <p>You have received an agreement document for signing.</p>
        <p><a href="${docUrl}" target="_blank">Click here to view the document</a></p>
        <p><a href="${redirectUrl}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Sign Now</a></p>
        <p>Best regards,<br/>SignBuddy Team</p>
      `;

      // Send emails to all recipients
      emails.forEach((email, index) => {
        sendEmail(email, subject, emailBody(names[index] || "User"));
      });

      res.status(200).json({
        message: "Agreement sent successfully",
        documentUrl: docUrl,
      });
    } catch (error) {
      console.error("Error sending agreement:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});

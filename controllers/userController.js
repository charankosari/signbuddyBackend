const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const TempOTP = require("../models/TempModel");
const bcrypt = require("bcrypt");
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

// temp otp
exports.sendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new errorHandler("Email is required", 400));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already exists"));
  }
  // Generate a 4-digit OTP
  const otp = crypto.randomInt(1000, 9999).toString();

  // Store OTP in the TempOTP collection (overwrite if exists)
  await TempOTP.findOneAndUpdate(
    { email },
    { otp, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // Send OTP to email
  // await sendMail(email, "Your OTP Code", `Your OTP is ${otp}`);

  res.status(200).json({ success: true, message: "OTP sent to email" });
});

exports.register = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return next(new errorHandler("Email, OTP, and Password are required", 400));
  }

  if (!passwordRegex.test(password)) {
    return next(
      new errorHandler(
        "Password must include at least one letter, one number, and one special character",
        400
      )
    );
  }
  // Check if the email exists in TempOTP
  const tempOTP = await TempOTP.findOne({ email });
  if (!tempOTP) {
    return next(new errorHandler("OTP expired or email not found", 400));
  }

  // Validate OTP
  if (tempOTP.otp !== otp) {
    return next(new errorHandler("Invalid OTP", 400));
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already registered", 400));
  }

  // Encrypt the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const user = await User.create({ email, password: hashedPassword });

  // Delete OTP from TempOTP after successful verification
  await TempOTP.deleteOne({ email });

  res.status(201);
  sendJwt(user, 200, "Registration successful", res);
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (email == "" || password == "") {
    return next(new errorHandler("Enter Email and Password", 403));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new errorHandler("Invalid Email or Password", 403));
  }
  //conparing password
  const passwordMatch = await user.comparePassword(password);

  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email or Password", 403));
  }
  //sending response
  sendJwt(user, 200, "login successfully", res);
});

// forgot password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }

  const token = user.resetToken();
  // const resetUrl=`http://localhost:5080/api/v1/resetpassword/${token}`
  const resetUrl = `http://127.0.0.1:5173/resetpassword/${token}`;
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
  if (req.body.password != req.body.confirmPassword) {
    return next(new errorHandler("Password dosnt match", 401));
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

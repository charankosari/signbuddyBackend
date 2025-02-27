const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [false, "Please Enter Username"],
    maxlength: [40, "Username should not exceed 40 characters"],
    minlength: [4, "Username should not be less than 4 characters"],
  },
  email: {
    type: String,
    required: [true, "Please Enter User Email"],
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  avatar: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: "user",
  },
  credits: {
    type: Number,
    default: 0,
  },
  subscriptionType: {
    type: String,
    enum: ["free", "premium", "enterprise"],
    default: "free",
  },
  cooldownPeriod: {
    type: Date,
    default: null,
  },
  creditsUsedInMembership: { type: Number, default: 0 },
  agreements: {
    type: [String],
    default: [],
  },
  documentsSent: {
    type: [
      {
        documentKey: { type: String, required: true },
        documentName: { type: String },
        ImageUrls: { type: [String], default: [] },
        signedDocument: { type: String, default: null },
        recipients: [
          {
            email: { type: String, required: true },
            status: {
              type: String,
              enum: ["pending", "signed", "viewed", "rejected"],
              default: "pending",
            },
            avatar: {
              type: String,
            },
            userName: { type: String },
            statusTime: { type: Date, default: Date.now },
          },
        ],
        placeholders: {
          type: [
            {
              placeholderNumber: { type: Number, required: true },
              position: {
                x: { type: String, required: true },
                y: { type: String, required: true },
              },
              type: {
                type: String,
                required: true,
                enum: ["text", "signature", "date"],
              },
              size: {
                width: { type: String, required: true },
                height: { type: String, required: true },
              },
              assignedTo: { type: String, required: true },
              email: { type: String, required: true },
              pageNumber: { type: Number, required: true },
              value: { type: String },
            },
          ],
          default: [],
        },
      },
    ],
    default: [],
    validate: {
      validator: function (val) {
        if (this.subscriptionType === "free") {
          if (this.credits > 10) {
            return true;
          }
          return val.length <= 3;
        }
        return true;
      },
      message:
        "Free subscription users can send a maximum of 3 documents unless they have more than 10 credits.",
    },
  },
  templates: {
    type: [
      {
        fileKey: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  drafts: {
    type: [
      {
        fileKey: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Pre-hook to hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Generate JWT token
userSchema.methods.jwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.jwt_secret, {
    expiresIn: process.env.jwt_expire,
  });
};

// Compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate password reset token
userSchema.methods.resetToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  this.resetPasswordToken = hashedToken;
  this.resetPasswordExpire = Date.now() + 1000 * 60 * 60 * 24 * 15;
  return token;
};
// ai cool down features

userSchema.virtual("isInCooldown").get(function () {
  return this.cooldownPeriod && new Date() < this.cooldownPeriod;
});

// 🔹 Set cooldown period for 6 hours
userSchema.methods.setCooldownPeriod = function () {
  this.cooldownPeriod = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours from now
};

// 🔹 Check if cooldown period has expired
userSchema.methods.isCooldownExpired = function () {
  if (!this.cooldownPeriod) return true; // No cooldown set
  return new Date() > this.cooldownPeriod;
};

// 🔹 Reset cooldown period if expired
userSchema.methods.resetCooldownIfExpired = function () {
  if (this.isCooldownExpired()) {
    this.cooldownPeriod = null;
  }
};
module.exports = mongoose.model("User", userSchema);

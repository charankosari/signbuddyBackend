const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { type } = require("os");

const CreditHistorySchema = new mongoose.Schema({
  thingUsed: {
    type: String,
    enum: ["Ai", "documentSent", "Reminder", "purchase", "Refill"],
    required: true,
  },
  creditsUsed: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
  },
});

const BillingHistorySchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  invoiceUrl: { type: String, required: true },
  dateOfPurchase: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  planName: {
    type: String,
    required: true,
  },
  creditsPurchased: { type: String, default: 0 },
  creditsPrice: { type: String, default: 0 },
});

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
    required: false,
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
    freeCredits: { type: Number, default: 30 },
    purchasedCredits: { type: Number, default: 0 },
    totalCredits: { type: Number, default: 30 },
    refillTime: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  subscription: {
    type: {
      type: String,
      enum: ["free", "yearly", "monthly"],
      default: "free",
    },
    timeStamp: { type: Date, default: Date.now }, // use Date.now without parentheses
    endDate: { type: Date, default: null },
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
        documentKey: { type: String },
        uniqueId: { type: String },
        documentCreationIp: { type: String },
        documentSentIp: { type: String },
        documentCreationTime: { type: Date },
        documentSentTime: { type: Date },
        documentName: { type: String },
        pdfDoc: { type: String },
        ImageUrls: { type: [String], default: [] },
        signedDocument: { type: String, default: null },
        CC: { type: [String], default: [] },
        CustomEmail: {
          subject: { type: String, default: null },
          emailBody: { type: String, default: null },
        },

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
            viewed: { type: Boolean, default: false },
            recipientViewedIp: { type: String, default: null },
            recipientSignedIp: { type: String, default: null },
            recipientViewedTime: { type: Date },
            recipientSignedTime: { type: Date },
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
        recipients: [
          {
            email: { type: String },
            status: {
              type: String,
              enum: ["pending", "signed", "viewed", "rejected"],
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
              placeholderNumber: { type: Number },
              position: {
                x: { type: String },
                y: { type: String },
              },
              type: {
                type: String,
                enum: ["text", "signature", "date"],
              },
              size: {
                width: { type: String },
                height: { type: String },
              },
              assignedTo: { type: String },
              email: { type: String },
              pageNumber: { type: Number },
              value: { type: String },
            },
          ],
          default: [],
        },
      },
    ],
    default: [],
  },
  creditsHistory: {
    type: [CreditHistorySchema],
    default: [],
    select: false,
  },
  incomingAgreements: [
    {
      agreementId: { type: mongoose.Schema.Types.ObjectId, ref: "Agreement" },
      // You might cache some data, but keep the dynamic status in the global model.
    },
  ],
  billingHistory: {
    type: [BillingHistorySchema],
    default: [],
    select: false,
  },
  pass: { type: Boolean, default: false },
  hashedOtp: { type: String, default: null, required: false },
  hashedOtpExpire: { type: Date, default: null },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Pre-hook to hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  this.pass = true;
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
userSchema.methods.setSubscriptionEndDate = function () {
  const msInDay = 24 * 60 * 60 * 1000; // milliseconds in a day

  // Ensure subscription.timestamp is set (if not, use current date)
  if (!this.subscription.timeStamp) {
    this.subscription.timeStamp = new Date();
  }

  if (this.subscription.type === "monthly") {
    this.subscription.endDate = new Date(
      this.subscription.timeStamp.getTime() + 30 * msInDay
    );
  } else if (this.subscription.type === "yearly") {
    // For yearly, add 30 days * 12 = 360 days
    this.subscription.endDate = new Date(
      this.subscription.timeStamp.getTime() + 360 * msInDay
    );
  } else {
    // For free or other types, you might want to clear the endDate
    this.subscription.endDate = null;
  }
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

userSchema.methods.CheckExpiryOfOtp = function () {
  if (!this.hashedOtp || !this.hashedOtpExpire) {
    return true;
  }
  return Date.now() > this.hashedOtpExpire;
};

userSchema.methods.updateSubscriptionIfExpired = function () {
  const now = new Date();
  // Check if endDate exists and is in the past
  if (this.subscription.endDate && this.subscription.endDate <= now) {
    // Save the old endDate as the new start date
    this.subscription.timeStamp = this.subscription.endDate;
    // Convert the subscription to free
    this.subscription.type = "free";
    // Clear the subscription endDate
    this.subscription.endDate = null;
  }
};

userSchema.methods.refillFreeCredits = async function () {
  const now = new Date();
  if (this.credits.refillTime && now >= this.credits.refillTime) {
    // Only refill free credits if they are less than 30
    if (this.credits.freeCredits < 30) {
      this.credits.freeCredits = 30;
      // Update total credits to be the sum of free and purchased credits
      this.credits.totalCredits =
        this.credits.freeCredits + this.credits.purchasedCredits;

      // Add a record in creditsHistory about the refill
      this.creditsHistory.push({
        thingUsed: "Refill",
        creditsUsed: "30",
        description: "Free credits refilled",
        timestamp: new Date(),
      });
    }

    // Always set a new refillTime 30 days from now, regardless of whether a refill occurred
    this.credits.refillTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.save();
  }
};

module.exports = mongoose.model("User", userSchema);

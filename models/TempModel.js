const mongoose = require("mongoose");

const tempOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // Auto-delete after 5 min
});

// Ensure TTL index is applied
tempOTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model("TempOTP", tempOTPSchema);

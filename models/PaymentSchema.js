// models/Payment.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  paymentId: { type: String, required: true },
  planType: { type: String, enum: ["credits", "subscription"], required: true },
  subscriptionType: {
    type: String,
    enum: ["monthly", "yearly"],
    default: null,
  },
  credits: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["initiated", "success", "failed", "refunded"],
    default: "initiated",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);

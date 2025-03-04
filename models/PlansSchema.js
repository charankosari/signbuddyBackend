const mongoose = require("mongoose");

// Schema for individual credit packages
const CreditPackageSchema = new mongoose.Schema(
  {
    credits: { type: Number, required: true },
    price: { type: Number, required: true }, // Price in rupees
  },
  { _id: false }
);

// Schema for individual subscription plans
const SubscriptionPlanSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    price: { type: Number, required: true }, // Price per month (for yearly, it's the per-month price)
    description: { type: String, default: "Unlimited credits" },
  },
  { _id: false }
);

// Main Plans schema which holds both types of plans
const PlansSchema = new mongoose.Schema(
  {
    creditPackages: {
      type: [CreditPackageSchema],
      default: [], // For example: [ { credits: 50, price: 199 }, { credits: 100, price: 349 }, { credits: 300, price: 899 } ]
    },
    subscriptionPlans: {
      type: [SubscriptionPlanSchema],
      default: [], // For example: [ { planType: "monthly", price: 699 }, { planType: "yearly", price: 599 } ]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plans", PlansSchema);

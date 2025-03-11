const mongoose = require("mongoose");

const deletedAccountsSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
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
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const DeletedAccounts = mongoose.model(
  "DeletedAccounts",
  deletedAccountsSchema
);

module.exports = DeletedAccounts;

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
      type: Number,
      required: true,
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

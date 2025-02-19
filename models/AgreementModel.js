const mongoose = require("mongoose");

const AgreementSchema = new mongoose.Schema(
  {
    sender: {
      email: { type: String, required: true },
      unsignedDocument: { type: String, required: true },
      signedDocuments: [{ type: String }], // Array to store multiple signed documents
    },
    receivers: [
      {
        email: { type: String, required: true },
        signedDocument: { type: String }, // Optional, added once signed
        status: {
          type: String,
          enum: ["pending", "viewed", "completed"],
          default: "pending",
        },
        timestamp: { type: Date, default: Date.now }, // Records when the receiver was added
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agreements", AgreementSchema);

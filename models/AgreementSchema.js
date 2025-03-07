const mongoose = require("mongoose");

const PlaceholderSchema = new mongoose.Schema({
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
});

const AgreementSchema = new mongoose.Schema({
  documentKey: { type: String, required: true },
  senderEmail: { type: String, required: true },
  imageUrls: { type: [String], default: [] },
  placeholders: { type: [PlaceholderSchema], default: [] },
  signedDocument: { type: String, default: null },
  recipients: [
    {
      email: { type: String, required: true },
      userName: { type: String, required: true },
      status: {
        type: String,
        enum: ["pending", "signed", "viewed", "rejected"],
        default: "pending",
      },
      avatar: { type: String },
      statusTime: { type: Date, default: Date.now },
      documentViewedTime: { type: Date },
      documentSignedTime: { type: Date },
    },
  ],
  customEmail: {
    subject: { type: String },
    emailBody: { type: String },
  },
  title: { type: String },
  receivedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "signed", "rejected"],
    default: "pending",
  },
});

module.exports = mongoose.model("Agreement", AgreementSchema);

const mongoose = require("mongoose");

const SendUsersWithNoAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  incomingAgreements: [
    {
      agreementKey: { type: String, required: true },
      senderEmail: { type: String, required: true },
      imageUrls: { type: [String], default: [] },
      placeholders: { type: Array, default: [] },
      receivedAt: { type: Date, default: Date.now },
      title: { type: String },
      allRecipients: [
        {
          email: { type: String, required: true },
          status: {
            type: String,
            enum: ["pending", "signed", "viewed", "rejected"],
            default: "pending",
          },
          avatar: { type: String },
          statusTime: { type: Date, default: Date.now() },
          userName: { type: String, required: true },
        },
      ],
      status: {
        type: String,
        enum: ["pending", "signed", "rejected"],
        default: "pending",
      },
    },
  ],
});

module.exports = mongoose.model(
  "SendUsersWithNoAccount",
  SendUsersWithNoAccountSchema
);

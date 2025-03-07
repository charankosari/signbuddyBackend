const mongoose = require("mongoose");

const SendUsersWithNoAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  incomingAgreements: [
    {
      agreementId: { type: mongoose.Schema.Types.ObjectId, ref: "Agreement" },
    },
  ],
});

module.exports = mongoose.model(
  "SendUsersWithNoAccount",
  SendUsersWithNoAccountSchema
);

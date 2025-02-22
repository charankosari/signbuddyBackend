const mongoose = require("mongoose");

const preUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const PreUser = mongoose.model("PreUser", preUserSchema);

module.exports = PreUser;

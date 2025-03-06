const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceUrl: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  invoiceNo: {
    type: String,
    required: true,
    unique: true,
  },
  customerNo: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Invoice", invoiceSchema);

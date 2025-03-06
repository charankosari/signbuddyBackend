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
});

module.exports = mongoose.model("Invoice", invoiceSchema);

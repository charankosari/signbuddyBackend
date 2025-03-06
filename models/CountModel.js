const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  userCount: {
    type: Number,
    default: 0,
    required: true,
  },
  documentsSentCount: {
    type: Number,
    default: 0,
    required: true,
  },
  date: {
    type: Date,
    deafult: Date.now(),
  },
});

counterSchema.statics.incrementUserCount = async function () {
  let counter = await this.findOne({});
  if (!counter) {
    counter = await this.create({ userCount: 1, documentsSentCount: 0 });
  } else {
    counter.userCount++;
    counter = await counter.save();
  }
  return counter;
};

counterSchema.statics.incrementDocumentsSentCount = async function () {
  let counter = await this.findOne({});
  if (!counter) {
    counter = await this.create({ userCount: 0, documentsSentCount: 1 });
  } else {
    counter.documentsSentCount++;
    counter = await counter.save();
  }
  return counter;
};

module.exports = mongoose.model("Counter", counterSchema);

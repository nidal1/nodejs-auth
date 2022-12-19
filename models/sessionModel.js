const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    require: [true, "The user id is required!"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  expiredAt: {
    type: Date,
    default: Date.now() + 7776000000, // 90 days
  },
  active: {
    type: Boolean,
    default: true,
  },
});

sessionSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;

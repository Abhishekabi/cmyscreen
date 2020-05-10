const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const callerSchema = new Schema({
  uname: {
    type: String,
    required: true,
  },
  guestId: {
    type: String,
  },
  offer: {
    type: String,
  },
  answer: {
    type: String,
  },
  iceCandidates: [{
    type: String
  }],
  hasGuestSession: {
    type: Boolean,
    default: false
  },
  guestIceCandidates: [{
    type: String
  }],
  date: {
    type: Date,
    default: Date.now,
  },
}, { versionKey: false });

module.exports = caller = mongoose.model("caller", callerSchema);

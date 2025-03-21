import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupChat"
  },
  isGroupCall: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ["audio", "video"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "ended", "missed"],
    default: "pending"
  },
  startTime: Date,
  endTime: Date
}, {
  timestamps: true
});

const Call = mongoose.model("Call", callSchema);
export default Call;

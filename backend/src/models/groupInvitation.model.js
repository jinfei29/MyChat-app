import mongoose from "mongoose";

const groupInvitationSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupChat",
    required: true
  },
  inviterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  inviteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  }
}, {
  timestamps: true
});

const GroupInvitation = mongoose.model("GroupInvitation", groupInvitationSchema);

export default GroupInvitation; 
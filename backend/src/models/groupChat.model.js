import mongoose from "mongoose";

const groupChatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profilePic: {
      type: String,
      default: "/group-avatar.jpg"  // 默认群聊头像
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    lastMessage: {
      content: String,
      sender: String,
      timestamp: Date,
    },
    announcements: [{
      content: {
        type: String,
        required: true
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }]      
  },
  { timestamps: true }
);

const GroupChat = mongoose.model("GroupChat", groupChatSchema);

export default GroupChat; 
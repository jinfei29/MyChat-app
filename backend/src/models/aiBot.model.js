import mongoose from "mongoose";

const aiBotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  conversationHistory: [{
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const AiBot = mongoose.model("AiBot", aiBotSchema);

export default AiBot; 
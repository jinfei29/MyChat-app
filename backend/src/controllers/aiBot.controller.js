import AiBot from "../models/aiBot.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { wenxin } from "../lib/wenxin.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketId } from "../lib/socket.js";

// 初始化/获取用户的 AI 机器人
export const initializeAiBot = async (req, res) => {
  try {
    console.log("开始初始化 AI 机器人");
    const userId = req.user._id;
    console.log("用户 ID:", userId);

    // 检查用户是否已有 AI 机器人
    let aiBot = await AiBot.findOne({ userId });
    console.log("现有机器人:", aiBot);

    if (!aiBot) {
  // 创建机器人用户
  const botUser = await User.create({
    email: `bot_${userId}@chatapp.com`, // 使用用户ID生成唯一的电子邮件
    fullName: "文心一言助手",
    password: "not_needed",
    profilePic: "https://res.cloudinary.com/dpj2cf4hv/image/upload/v1737363741/zpm7kcdugck0flwq3tkm.jpg",
    isBot: true
  });
      console.log("机器人用户创建成功:", botUser);

      // 创建 AI 机器人记录
      aiBot = await AiBot.create({
        userId,
        botId: botUser._id,
        conversationHistory: []
      });
      console.log("AI 机器人创建成功:", aiBot);
    } else {
      console.log("使用现有的机器人");
      const botUser = await User.findById(aiBot.botId);
      console.log("获取到机器人用户:", botUser);
    }

    res.status(200).json({
      botId: aiBot.botId,
      botName: "文心一言助手",
      conversationHistory: aiBot.conversationHistory
    });
  } catch (error) {
    console.error("初始化 AI 机器人失败:", error);
    res.status(500).json({ error: "初始化 AI 机器人失败" });
  }
};

// 发送消息给 AI 机器人
export const sendMessageToBot = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "消息格式无效" });
    }

    console.log("用户发送消息:", message);
    console.log("用户ID:", userId);

    // 获取用户的 AI 机器人
    const aiBot = await AiBot.findOne({ userId });
    console.log("找到的AI机器人:", aiBot);

    if (!aiBot) {
      console.log("未找到AI机器人，尝试初始化");
      return res.status(404).json({ error: "AI 机器人未初始化" });
    }

    // 保存用户消息
    const userMessage = await Message.create({
      senderId: userId,
      receiverId: aiBot.botId,
      text: message
    });
    console.log("用户消息已保存:", userMessage);

    // 获取消息历史
    const findmessages = await Message.find({
      $or: [
        { senderId: userId, receiverId: aiBot.botId },
        { senderId: aiBot.botId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    // 更新 AI 机器人的 conversationHistory
    aiBot.conversationHistory = findmessages.map(msg => ({
      role: msg.senderId.equals(userId) ? 'user' : 'assistant',
      content: msg.text
    }));

    // 获取最近的对话历史
    const recentMessages = aiBot.conversationHistory && aiBot.conversationHistory.length > 0 
      ? aiBot.conversationHistory.slice(-5) 
      : [];
    console.log("最近的对话历史:", recentMessages);

    // 准备发送给文心一言的消息
    const messages = [
      ...recentMessages.map(msg => ({
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    // 创建一个空的机器人消息记录
    const botMessage = await Message.create({
      senderId: aiBot.botId,
      receiverId: userId,
      text: ""  // 初始为空
    });

    // 发送初始响应
    res.status(200).json({
      userMessage,
      botMessage: {
        ...botMessage.toObject(),
        status: 'generating'
      }
    });

    const receiverSocketId = getReceiverSocketId(userId);
    try {
      // 调用文心一言 API
      const aiResponse = await wenxin.chat(messages, (chunk) => {
        // 通过 socket.io 实时发送数据块给前端
          console.log("发送流式数据块:", chunk);
          // 通知目标用户
        
          io.to(receiverSocketId).emit('botStreamResponse', {
            type: 'chunk',
            content: chunk.result,
            messageId: botMessage._id
          });
        
      });
      console.log("AI可能响应:", aiResponse);
      // 更新消息记录的完整内容
      botMessage.text = aiResponse;
      await botMessage.save();

      // 通知前端响应完成

        console.log("发送完整响应:", aiResponse);
        io.to(receiverSocketId).emit('botStreamResponse', {
          type: 'end',
          messageId: botMessage._id,
          fullResponse: aiResponse
        });


      // 更新对话历史
      aiBot.conversationHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: aiResponse }
      );

      // 只保留最近的10条消息
      if (aiBot.conversationHistory.length > 10) {
        aiBot.conversationHistory = aiBot.conversationHistory.slice(-10);
      }

      await aiBot.save();
      console.log("对话历史已更新");

    } catch (error) {
      console.error("文心一言API调用失败:", error);
      
      // 根据错误类型返回不同的错误消息
      let errorText = "抱歉，我遇到了一些技术问题。";
      
      if (error.message.includes("access_token")) {
        errorText = "抱歉，我需要重新认证一下。请稍后再试。";
      } else if (error.message.includes("API响应格式异常")) {
        errorText = "抱歉，我现在的回答可能不太准确。请换个方式提问。";
      } else if (error.message.includes("timeout")) {
        errorText = "抱歉，我的响应有点慢。请稍后再试。";
      }
      
      // 更新消息为错误信息
      botMessage.text = errorText;
      await botMessage.save();

      // 通知前端出错
      const receiverSocketId = getReceiverSocketId(userId);
        io.to(receiverSocketId).emit('botStreamResponse', {
          type: 'error',
          messageId: botMessage._id,
          error: errorText
        });
    }

  } catch (error) {
    console.error("处理消息失败:", error);
    res.status(500).json({ error: "处理消息失败" });
  }
};

// 获取与 AI 机器人的对话历史
export const getBotConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("获取用户对话历史, 用户ID:", userId);

    // 获取用户的 AI 机器人
    const aiBot = await AiBot.findOne({ userId });
    if (!aiBot) {
      return res.status(404).json({ error: "AI 机器人未初始化" });
    }

    // 获取消息历史
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: aiBot.botId },
        { senderId: aiBot.botId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });



    console.log("找到消息数量:", messages.length);
    res.status(200).json(messages);
  } catch (error) {
    console.error("获取对话历史失败:", error);
    res.status(500).json({ error: "获取对话历史失败" });
  }
}; 
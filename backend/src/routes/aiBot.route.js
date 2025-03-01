import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { initializeAiBot, sendMessageToBot, getBotConversation } from "../controllers/aiBot.controller.js";

const router = express.Router();

// 请求日志中间件
router.use((req, res, next) => {
  console.log(`AI Bot 路由请求: ${req.method} ${req.path}`);
  next();
});

// 初始化/获取用户的 AI 机器人
router.get("/initialize", protectRoute, initializeAiBot);

// 发送消息给 AI 机器人
router.post("/send", protectRoute, sendMessageToBot);

// 获取与 AI 机器人的对话历史
router.get("/history", protectRoute, getBotConversation);

export default router; 
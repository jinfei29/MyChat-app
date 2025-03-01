// import express from "express";
// import dotenv from "dotenv";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import path from "path";

// import authRoutes from "./routes/auth.route.js";
// import messageRoutes from "./routes/message.route.js";
// import userRoutes from "./routes/user.route.js";
// import groupChatRoutes from "./routes/groupChat.route.js";
// import aiBotRoutes from "./routes/aiBot.route.js";

// dotenv.config();

// const app = express();

// // 中间件
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true
// }));

// // 请求日志中间件
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`);
//   next();
// });

// // 路由
// app.use("/api/auth", authRoutes);
// app.use("/api/messages", messageRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/group-chats", groupChatRoutes);
// app.use("/api/ai-bot", aiBotRoutes);

// // 404 处理
// app.use((req, res) => {
//   console.log(`404: ${req.method} ${req.path}`);
//   res.status(404).json({ error: "Route not found" });
// });

// export default app; 
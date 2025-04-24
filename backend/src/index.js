import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";
import groupChatRoutes from "./routes/groupChat.route.js";
import aiBotRoutes from "./routes/aiBot.route.js";
import friendshipRoutes from "./routes/friendship.route.js";
import callRoutes from "./routes/call.route.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/group-chats", groupChatRoutes);
app.use("/api/ai-bot", aiBotRoutes);
app.use("/api/friendship", friendshipRoutes);
app.use("/api/calls", callRoutes);
// ✅ 测试接口
app.get("/api/test", (req, res) => {
  res.send("接口正常，后端已启动！");
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});

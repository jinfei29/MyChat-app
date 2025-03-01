import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      console.log("无访问令牌");
      return res.status(401).json({ error: "未授权 - 无访问令牌" });
    }

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("令牌解析结果:", decoded);

    if (!decoded?.userId) {
      console.log("令牌中无用户ID");
      return res.status(401).json({ error: "未授权 - 无效令牌" });
    }

    // 获取用户信息
    const user = await User.findById(decoded.userId).select("-password");
    console.log("找到用户:", user?._id);

    if (!user) {
      console.log("未找到用户");
      return res.status(404).json({ error: "用户不存在" });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (error) {
    console.error("保护路由中间件错误:", error);
    res.status(401).json({ error: "未授权 - 令牌验证失败" });
  }
}; 
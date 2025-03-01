import Friendship from "../models/friendship.model.js";
import User from "../models/user.model.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketId } from "../lib/socket.js";
import Message from "../models/message.model.js";

// 通过邮箱搜索用户
export const searchUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = req.user._id;

    if (!email) {
      return res.status(400).json({ error: "请提供邮箱地址" });
    }

    // 查找用户，排除当前用户和机器人
    const user = await User.findOne({ 
      email,
      _id: { $ne: currentUserId },
      isBot: false
    }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "未找到用户" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("搜索用户失败:", error);
    res.status(500).json({ error: "搜索用户失败" });
  }
};

// 发送好友请求
export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // 检查用户是否存在
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "用户不存在" });
    }

    // 检查是否已经是好友或有待处理的申请
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: userId },
        { user1: userId, user2: currentUserId }
      ],
      status: { $in: ["pending", "accepted"] }
    });

    if (existingFriendship) {
      return res.status(400).json({ 
        error: "已经发送过好友申请或已经是好友" 
      });
    }

    // 如果之前有被拒绝的记录，更新状态
    const rejectedFriendship = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: userId },
        { user1: userId, user2: currentUserId }
      ],
      status: "rejected"
    });

    let friendship;
    if (rejectedFriendship) {
      rejectedFriendship.status = "pending";
      rejectedFriendship.requestedBy = currentUserId;
      friendship = await rejectedFriendship.save();
    } else {
      // 创建新的好友请求
      friendship = new Friendship({
        user1: currentUserId,
        user2: userId,
        requestedBy: currentUserId,
        status: "pending"
      });
      await friendship.save();
    }

    // 通知目标用户
    const receiverSocketId = getReceiverSocketId(userId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequest", {
        requestId: friendship._id,
        user: req.user
      });
    }

    res.status(201).json(friendship);
  } catch (error) {
    console.error("发送好友申请失败:", error);
    res.status(500).json({ error: error.message });
  }
};

// 接受好友请求
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await Friendship.findById(requestId)
      .populate("user1", "-password")
      .populate("user2", "-password");

    if (!friendship) {
      return res.status(404).json({ error: "好友申请不存在" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ error: "该申请已被处理" });
    }

    // 确保当前用户是请求的接收者
    if (friendship.user2._id.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: "无权处理该申请" });
    }

    friendship.status = "accepted";
    await friendship.save();

    // 通知发送请求的用户
    const senderSocketId = getReceiverSocketId(friendship.user1._id);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        friendship,
        user: friendship.user2
      });
    }

    res.status(200).json(friendship);
  } catch (error) {
    console.error("接受好友申请失败:", error);
    res.status(500).json({ error: "接受好友申请失败" });
  }
};

// 拒绝好友请求
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await Friendship.findById(requestId);

    if (!friendship) {
      return res.status(404).json({ error: "好友申请不存在" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ error: "该申请已被处理" });
    }

    if (friendship.user2.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: "无权处理该申请" });
    }

    friendship.status = "rejected";
    await friendship.save();

    // 通知发送请求的用户
    const senderSocketId = getReceiverSocketId(friendship.user1);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestRejected", {
        requestId: friendship._id
      });
    }

    res.status(200).json(friendship);
  } catch (error) {
    console.error("拒绝好友申请失败:", error);
    res.status(500).json({ error: "拒绝好友申请失败" });
  }
};

// 获取好友请求列表
export const getFriendRequests = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const requests = await Friendship.find({
      user2: currentUserId,
      status: "pending"
    })
    .populate("user1", "-password")
    .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error("获取好友申请列表失败:", error);
    res.status(500).json({ error: "获取好友申请列表失败" });
  }
};

// 获取好友列表
export const getFriendList = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // 获取所有已接受的好友关系
    const friendships = await Friendship.find({
      $or: [
        { user1: currentUserId },
        { user2: currentUserId }
      ],
      status: "accepted"
    })
    .populate("user1", "-password")
    .populate("user2", "-password");

    // 处理好友列表
    const friends = friendships.map(friendship => {
      // 返回不是当前用户的那个用户
      return friendship.user1._id.toString() === currentUserId.toString()
        ? friendship.user2
        : friendship.user1;
    });

    // 获取AI机器人
    const aiBot = await User.findOne({ 
      isBot: true,
      email: `bot_${currentUserId}@chatapp.com`
    }).select("-password");

    if (aiBot) {
      friends.unshift(aiBot); // 将AI机器人添加到列表开头
    }

    res.status(200).json(friends);
  } catch (error) {
    console.error("获取好友列表失败:", error);
    res.status(500).json({ error: "获取好友列表失败" });
  }
};

// 删除好友
export const deleteFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user._id;

    // 删除好友关系
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { user1: currentUserId, user2: friendId },
        { user1: friendId, user2: currentUserId }
      ],
      status: "accepted"
    });

    if (!friendship) {
      return res.status(404).json({ error: "好友关系不存在" });
    }

    // 删除聊天记录
    await Message.deleteMany({
      $or: [
        { senderId: currentUserId, receiverId: friendId },
        { senderId: friendId, receiverId: currentUserId }
      ]
    });

    // 通知被删除的好友
    const receiverSocketId = getReceiverSocketId(friendId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendDeleted", {
        userId: currentUserId
      });
    }

    // 通知删除方（确保双方都更新状态）
    const senderSocketId = getReceiverSocketId(currentUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendDeleted", {
        userId: friendId
      });
    }

    res.status(200).json({ message: "好友删除成功" });
  } catch (error) {
    console.error("删除好友失败:", error);
    res.status(500).json({ error: "删除好友失败" });
  }
}; 

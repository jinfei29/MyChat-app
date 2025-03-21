import Call from "../models/call.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// 发起通话
export const initiateCall = async (req, res) => {
  try {
    const { receiverId, type, groupId, isGroupCall } = req.body;
    const callerId = req.user._id;

    let call;
    if (isGroupCall) {
      // 群聊通话
      call = new Call({
        callerId,
        groupId,
        isGroupCall: true,
        type,
        status: "pending"
      });

      await call.save();

      const group = await GroupChat.findById(groupId).populate("members");
      if (!group) {
        return res.status(404).json({ error: "群聊不存在" });
      }

      // 向群成员广播通话邀请
      group.members.forEach(member => {
        if (member._id.toString() !== callerId.toString()) {
          const memberSocketId = getReceiverSocketId(member._id);
          if (memberSocketId) {
            io.to(memberSocketId).emit("incomingCall", {
              callId: call._id,
              callerId: req.user,
              type,
              groupId,
              isGroupCall: true
            });
          }
        }
      });
    } else {
      // 私聊通话
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (!receiverSocketId) {
        return res.status(400).json({ error: "对方不在线" });
      }

      call = new Call({
        callerId,
        receiverId,
        isGroupCall: false,
        type,
        status: "pending"
      });

      await call.save();

      io.to(receiverSocketId).emit("incomingCall", {
        callId: call._id,
        callerId: req.user,
        type,
        isGroupCall: false
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("发起通话失败:", error);
    res.status(500).json({ error: "发起通话失败" });
  }
};

// 接受通话
export const acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "通话不存在" });
    }

    if (call.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "无权接受此通话" });
    }

    call.status = "accepted";
    call.startTime = new Date();
    await call.save();

    // 通知发起者通话已被接受
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", {
        callId: call._id,
        receiverId: userId
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("接受通话失败:", error);
    res.status(500).json({ error: "接受通话失败" });
  }
};

// 拒绝通话
export const rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "通话不存在" });
    }

    if (call.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "无权拒绝此通话" });
    }

    call.status = "rejected";
    await call.save();

    // 通知发起者通话被拒绝
    const callerSocketId = getReceiverSocketId(call.callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected", {
        callId: call._id,
        receiverId: userId
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("拒绝通话失败:", error);
    res.status(500).json({ error: "拒绝通话失败" });
  }
};

// 结束通话
export const endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id;

    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ error: "通话不存在" });
    }

    if (call.callerId.toString() !== userId.toString() && 
        call.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "无权结束此通话" });
    }

    call.status = "ended";
    call.endTime = new Date();
    await call.save();

    // 通知对方通话已结束
    const otherUserId = call.callerId.toString() === userId.toString() 
      ? call.receiverId 
      : call.callerId;
    
    const otherUserSocketId = getReceiverSocketId(otherUserId);
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("callEnded", {
        callId: call._id,
        userId
      });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("结束通话失败:", error);
    res.status(500).json({ error: "结束通话失败" });
  }
};

// WebRTC 信令
export const handleSignaling = async (req, res) => {
  try {
    const { receiverId, signal, callId } = req.body;
    const senderId = req.user._id;

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (!receiverSocketId) {
      return res.status(400).json({ error: "对方不在线" });
    }

    io.to(receiverSocketId).emit("signalingData", {
      signal,
      callId,
      senderId
    });

    res.status(200).json({ message: "信令发送成功" });
  } catch (error) {
    console.error("发送信令失败:", error);
    res.status(500).json({ error: "发送信令失败" });
  }
}; 
import GroupChat from "../models/groupChat.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import { io } from "../lib/socket.js";
import { getReceiverSocketId } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import GroupInvitation from "../models/groupInvitation.model.js";

export const createGroupChat = async (req, res) => {
  try {
    const { name, members } = req.body;
    const admin = req.user._id;

    // 确保管理员也被添加到成员列表中
    const allMembers = [...new Set([...members, admin.toString()])];

    const newGroupChat = new GroupChat({
      name,
      admin,
      members: allMembers,
    });

    await newGroupChat.save();
    
    // 填充成员信息
    const populatedGroup = await GroupChat.findById(newGroupChat._id)
      .populate("members", "-password")
      .populate("admin", "-password");

    console.log("开始广播新群组创建消息");
    console.log("群组信息:", {
      _id: populatedGroup._id,
      name: populatedGroup.name,
      admin: populatedGroup.admin,
      members: populatedGroup.members,
      createdAt: populatedGroup.createdAt,
      updatedAt: populatedGroup.updatedAt
    });
    
    // 向所有成员广播新群组创建的消息
    allMembers.forEach((memberId) => {
      // 跳过创建者
      if (memberId.toString() === admin.toString()) {
        console.log(`跳过向创建者 ${memberId} 发送通知`);
        return;
      }

      const memberSocketId = getReceiverSocketId(memberId.toString());
      console.log(`成员 ${memberId} 的 socket ID:`, memberSocketId);
      
      if (memberSocketId) {
        console.log(`向成员 ${memberId} 发送新群组通知`);
        // 确保发送格式化后的群组数据
        io.to(memberSocketId).emit("newGroupCreated", {
          _id: populatedGroup._id,
          name: populatedGroup.name,
          admin: populatedGroup.admin,
          members: populatedGroup.members,
          createdAt: populatedGroup.createdAt,
          updatedAt: populatedGroup.updatedAt
        });
      } else {
        console.log(`成员 ${memberId} 不在线，无法发送通知`);
      }
    });

    // 返回格式化后的群组数据
    res.status(201).json({
      _id: populatedGroup._id,
      name: populatedGroup.name,
      admin: populatedGroup.admin,
      members: populatedGroup.members,
      createdAt: populatedGroup.createdAt,
      updatedAt: populatedGroup.updatedAt
    });
  } catch (error) {
    console.error("Error in createGroupChat: ", error);
    res.status(500).json({ error: "创建群聊失败" });
  }
};

export const getGroupChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const groupChats = await GroupChat.find({ members: userId })
      .populate("members", "-password")
      .populate("admin", "-password");

    res.status(200).json(groupChats);
  } catch (error) {
    console.error("Error in getGroupChats: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // 验证用户是否是群组成员
    const group = await GroupChat.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ error: "你不是该群组的成员" });
    }
    
    const messages = await GroupMessage.find({ groupId })
      .populate("senderId", "-password")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;
    const sender=req.user.fullName;

    // 验证发送者是否是群组成员
    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    if (!group.members.includes(senderId)) {
      return res.status(403).json({ error: "你不是该群组的成员" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new GroupMessage({
      groupId,
      senderId,
      text,
      image: imageUrl,
    });

    const newLastMessage={
      content: text,
      sender: sender,
      timestamp: new Date()
    }
    group.lastMessage=newLastMessage;
    await group.save();
    // 先保存消息
    await newMessage.save();

    // 填充发送者信息
    const populatedMessage = await GroupMessage.findById(newMessage._id)
      .populate({
        path: "senderId",
        select: "fullName profilePic"
      });

    // 广播消息给群组所有成员
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        const memberSocketId = getReceiverSocketId(memberId.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("newGroupMessage", {
            message: populatedMessage,
            groupId,
          });
        }
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("members", "-password")
      .populate("admin", "-password");
      
    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    // 检查是否是群主
    if (group.admin._id.toString() === userId.toString()) {
      return res.status(403).json({ error: "群主不能退出群聊" });
    }

    // 检查是否是群成员
    if (!group.members.some(member => member._id.toString() === userId.toString())) {
      return res.status(403).json({ error: "你不是该群组的成员" });
    }

    // 从成员列表中移除
    group.members = group.members.filter(
      (member) => member._id.toString() !== userId.toString()
    );

    await group.save();

    // 通知其他成员有人退出群聊
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("memberLeftGroup", {
          groupId: group._id,
          userId: userId,
          updatedGroup: group
        });
      }
    });

    res.status(200).json({ message: "已退出群聊" });
  } catch (error) {
    console.error("Error in leaveGroup: ", error);
    res.status(500).json({ error: "退出群聊失败" });
  }
};

// 添加解散群聊的方法
export const dissolveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("members", "-password")
      .populate("admin", "-password");

    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    // 检查是否是群主
    if (group.admin._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "只有群主才能解散群聊" });
    }

    // 在删除群组之前通知所有成员
    group.members.forEach((member) => {
      if (member._id.toString() !== userId.toString()) {
        const memberSocketId = getReceiverSocketId(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("groupDissolved", {
            groupId: group._id,
            groupName: group.name
          });
        }
      }
    });

    // 删除群组的所有消息
    await GroupMessage.deleteMany({ groupId: group._id });
    
    // 删除群组
    await GroupChat.findByIdAndDelete(groupId);

    res.status(200).json({ message: "群聊已解散" });
  } catch (error) {
    console.error("Error in dissolveGroup: ", error);
    res.status(500).json({ error: "解散群聊失败" });
  }
};

// 更新群公告
export const updateAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("members", "-password")
      .populate("admin", "-password");

    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    // 检查是否是群主
    if (group.admin._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "只有群主才能修改群公告" });
    }

    // 更新群公告
    group.announcement = {
      content,
      updatedAt: new Date(),
      updatedBy: userId
    };

    await group.save();

    // 通知所有群成员公告已更新
    group.members.forEach((member) => {
      if (member._id.toString() !== userId.toString()) {
        const memberSocketId = getReceiverSocketId(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("announcementUpdated", {
            groupId: group._id,
            announcement: group.announcement
          });
        }
      }
    });

    res.status(200).json(group.announcement);
  } catch (error) {
    console.error("Error in updateAnnouncement: ", error);
    res.status(500).json({ error: "更新群公告失败" });
  }
};

// 获取群公告
export const getAnnouncement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("announcement.updatedBy", "fullName profilePic");

    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    // 检查是否是群成员
    if (!group.members.includes(userId)) {
      return res.status(403).json({ error: "你不是该群组的成员" });
    }

    res.status(200).json(group.announcement);
  } catch (error) {
    console.error("Error in getAnnouncement: ", error);
    res.status(500).json({ error: "获取群公告失败" });
  }
}; 

export const changeGroupProfilePic = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { image } = req.body;
    const userId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("members", "-password")
      .populate("admin", "-password");

    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    if (group.admin._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "只有群主才能修改群头像" });
    }

    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    group.profilePic = imageUrl;
    await group.save();

    // 向所有群成员广播头像更新消息
    group.members.forEach((member) => {
      if (member._id.toString() !== userId.toString()) {
        const memberSocketId = getReceiverSocketId(member._id.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("groupProfileUpdated", {
            groupId: group._id,
            profilePic: imageUrl
          });
        }
      }
    });

    res.status(200).json({ profilePic: imageUrl });
  } catch (error) {
    console.error("Error in changeGroupProfilePic:", error);
    res.status(500).json({ error: "更新群头像失败" });
  }
};

// 获取群聊邀请列表
export const getGroupInvitations = async (req, res) => {
  try {
    const inviteeId = req.user._id;
    const invitations = await GroupInvitation.find({
      inviteeId,
      status: "pending"
    })
      .populate("groupId", "name profilePic")
      .populate("inviterId", "fullName profilePic")
      .sort({ createdAt: -1 });

      console.log(invitations)
    res.status(200).json(invitations);
  } catch (error) {
    console.error("获取群聊邀请失败:", error);
    res.status(500).json({ error: "获取群聊邀请失败" });
  }
};


// 邀请好友加入群聊
export const inviteToGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const inviterId = req.user._id;

    // 检查群聊是否存在
    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "群聊不存在" });
    }

    // 检查是否有权限邀请
    if (group.admin.toString() !== inviterId.toString()) {
      return res.status(403).json({ error: "只有群主可以邀请新成员" });
    }

    // 检查被邀请者是否已经是群成员
    if (group.members.includes(memberId)) {
      return res.status(400).json({ error: "该用户已经是群成员" });
    }

    // 检查是否已经有待处理的邀请
    const existingInvitation = await GroupInvitation.findOne({
      groupId,
      inviteeId: memberId,
      status: "pending"
    });

    if (existingInvitation) {
      return res.status(400).json({ error: "已经发送过邀请" });
    }

    // 创建新的邀请
    const invitation = new GroupInvitation({
      groupId,
      inviterId,
      inviteeId: memberId
    });
    await invitation.save();

    // 通知被邀请者
    const inviter = await User.findById(inviterId);
    const receiverSocketId = getReceiverSocketId(memberId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("groupInvitation", {
        _id: invitation._id,
        groupId: {
          _id: group._id,
          name: group.name,
          profilePic: group.profilePic
        },
        inviterId: {
          _id: inviter._id,
          fullName: inviter.fullName
        }
      });
    }

    res.status(201).json(invitation);
  } catch (error) {
    console.error("邀请好友加入群聊失败:", error);
    res.status(500).json({ error: "邀请好友加入群聊失败" });
  }
};

// 接受群聊邀请
export const acceptGroupInvitation = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    // 验证用户身份
    if (userId.toString() !== memberId) {
      return res.status(403).json({ error: "无权处理该邀请" });
    }

    const invitation = await GroupInvitation.findOne({
      groupId,
      inviteeId: memberId,
      status: "pending"
    }).populate("groupId");

    if (!invitation) {
      return res.status(404).json({ error: "邀请不存在或已被处理" });
    }

    // 更新邀请状态
    invitation.status = "accepted";
    await invitation.save();

    // 将用户添加到群成员中
    const group = invitation.groupId;
    if (!group.members.includes(memberId)) {
      group.members.push(memberId);
      await group.save();
    }

    // 通知群成员有新成员加入
    const newMember = await User.findById(memberId).select("-password");
    group.members.forEach(member => {
      const memberSocketId = getReceiverSocketId(member.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("memberJoinedGroup", {
          groupId: group._id,
          newMember
        });
      }
    });

    res.status(200).json({ message: "已加入群聊" });
  } catch (error) {
    console.error("接受群聊邀请失败:", error);
    res.status(500).json({ error: "接受群聊邀请失败" });
  }
};

// 拒绝群聊邀请
export const rejectGroupInvitation = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    // 验证用户身份
    if (userId.toString() !== memberId) {
      return res.status(403).json({ error: "无权处理该邀请" });
    }

    const invitation = await GroupInvitation.findOne({
      groupId,
      inviteeId: memberId,
      status: "pending"
    });

    if (!invitation) {
      return res.status(404).json({ error: "邀请不存在或已被处理" });
    }

    // 更新邀请状态
    invitation.status = "rejected";
    await invitation.save();

    // 通知邀请者
    const inviterSocketId = getReceiverSocketId(invitation.inviterId);
    if (inviterSocketId) {
      io.to(inviterSocketId).emit("groupInvitationRejected", {
        groupId,
        inviteeId: memberId
      });
    }

    res.status(200).json({ message: "已拒绝邀请" });
  } catch (error) {
    console.error("拒绝群聊邀请失败:", error);
    res.status(500).json({ error: "拒绝群聊邀请失败" });
  }
};

// 踢出群成员
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const adminId = req.user._id;

    const group = await GroupChat.findById(groupId)
      .populate("members", "-password")
      .populate("admin", "-password");

    if (!group) {
      return res.status(404).json({ error: "群组不存在" });
    }

    // 验证是否为群主
    if (group.admin._id.toString() !== adminId.toString()) {
      return res.status(403).json({ error: "只有群主才能踢出成员" });
    }

    // 不能踢出群主
    if (memberId === group.admin._id.toString()) {
      return res.status(400).json({ error: "不能踢出群主" });
    }

    // 从成员列表中移除
    group.members = group.members.filter(
      member => member._id.toString() !== memberId
    );
    await group.save();

    // 通知被踢出的成员
    const memberSocketId = getReceiverSocketId(memberId);
    if (memberSocketId) {
      io.to(memberSocketId).emit("removedFromGroup", {
        groupId: group._id,
        groupName: group.name
      });
    }

    // 通知其他成员
    group.members.forEach((member) => {
      const memberSocketId = getReceiverSocketId(member._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("memberRemoved", {
          groupId: group._id,
          removedMemberId: memberId
        });
      }
    });

    res.status(200).json(group);
  } catch (error) {
    console.error("踢出群成员失败:", error);
    res.status(500).json({ error: "踢出成员失败" });
  }
};
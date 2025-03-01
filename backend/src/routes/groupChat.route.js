import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  createGroupChat, 
  getGroupChats, 
  getGroupMessages, 
  sendGroupMessage, 
  leaveGroup, 
  dissolveGroup,
  updateAnnouncement,
  getAnnouncement,
  changeGroupProfilePic,
  inviteToGroup,
  getGroupInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation,
  removeMember
} from "../controllers/groupChat.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createGroupChat);
router.get("/", protectRoute, getGroupChats);

// 群聊基本操作
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);
router.post("/:groupId/leave", protectRoute, leaveGroup);
router.delete("/:groupId/dissolve", protectRoute, dissolveGroup);

// 群聊资料
router.put("/:groupId/profile-pic", protectRoute, changeGroupProfilePic);
router.put("/:groupId/announcement", protectRoute, updateAnnouncement);
router.get("/:groupId/announcement", protectRoute, getAnnouncement);

// 群成员管理
router.post("/:groupId/members/:memberId/invite", protectRoute, inviteToGroup);
router.post("/:groupId/members/:memberId/accept", protectRoute, acceptGroupInvitation);
router.post("/:groupId/members/:memberId/reject", protectRoute, rejectGroupInvitation);
router.delete("/:groupId/members/:memberId", protectRoute, removeMember);

// 获取群聊邀请列表
router.get("/invitations", protectRoute, getGroupInvitations);

export default router; 
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriendList,
  searchUserByEmail,
  deleteFriend
} from "../controllers/friendship.controller.js";

const router = express.Router();

router.get("/search", protectRoute, searchUserByEmail);
router.get("/requests", protectRoute, getFriendRequests);
router.get("/list", protectRoute, getFriendList);
router.post("/request/:userId", protectRoute, sendFriendRequest);
router.post("/accept/:requestId", protectRoute, acceptFriendRequest);
router.post("/reject/:requestId", protectRoute, rejectFriendRequest);
router.delete("/delete/:friendId", protectRoute, deleteFriend);

export default router; 
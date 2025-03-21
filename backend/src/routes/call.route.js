import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  handleSignaling
} from "../controllers/call.controller.js";

const router = express.Router();

router.post("/initiate", protectRoute, initiateCall);
router.post("/:callId/accept", protectRoute, acceptCall);
router.post("/:callId/reject", protectRoute, rejectCall);
router.post("/:callId/end", protectRoute, endCall);
router.post("/signal", protectRoute, handleSignaling);

export default router; 
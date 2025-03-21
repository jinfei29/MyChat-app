import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";
import Peer from "simple-peer";

export const useCallStore = create((set, get) => ({
  // 通话状态
  currentCall: null,
  isCallModalOpen: false,
  localStream: null,
  remoteStream: null,
  peer: null,
  signalingQueue: [], // 💡 信令数据队列

  // 初始化通话事件监听
  initializeCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("incomingCall", (data) => {
      console.log("收到来电incomingCall:", data);
      set({
        currentCall: { ...data, isIncoming: true },
        isCallModalOpen: true,
      });
    });

    socket.on("callAccepted", async (data) => {
      const { currentCall, peer } = get();
      console.log("收到接受电话callAccepted", currentCall, data);
      if (currentCall?.receiverId === data.receiverId && peer) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: currentCall.type === "video",
            audio: true,
          });
          stream.getTracks().forEach((track) => peer.addTrack(track, stream));
          console.log("添加本地流到 Peer:", stream);
          set({ localStream: stream });
        } catch (error) {
          console.error("获取媒体流失败:", error);
          toast.error("无法访问摄像头或麦克风");
        }
      }
    });

    socket.on("callRejected", (data) => {
      const { currentCall } = get();
      console.log("收到电话拒绝callRejected", data, currentCall);
      if (currentCall?.receiverId === data.receiverId) {
        toast.error("对方挂断了通话");
        get().endCall();
      }
    });

    socket.on("callEnded", (data) => {
      const { currentCall } = get();
      if (currentCall?.receiverId === data.receiverId) {
        toast.info("通话已结束");
        get().endCall();
      }
    });

    // 处理信令数据
    socket.on("signalingData", ({ signal, callId, senderId }) => {
      const { currentCall, peer, signalingQueue } = get();
      console.log("收到信令数据:", signal, callId, senderId, currentCall, peer);

      // 如果Peer存在，直接处理信令；否则加入队列
      if (peer) {
        console.log("信令注入到 Peer 连接:", signal); // 记录注入信令
        peer.signal(signal);
      } else {
        console.warn("Peer 未初始化，将信令存入队列");
        set({ signalingQueue: [...signalingQueue, { signal, callId, senderId }] });
      }
    });
  },

  // 初始化 Peer 对象
  initializePeer: (isInitiator, stream) => {
    const peer = new Peer({
      initiator: isInitiator,
      trickle: false,
      stream, // 本地流
    });

    peer.on("signal", async (signal) => {
      try {
        const { currentCall } = get();
        console.log(`${isInitiator ? "发起方" : "接收方"}发送信令:`, signal);
        await axiosInstance.post("/calls/signal", {
          receiverId: isInitiator ? currentCall.receiverId : currentCall.callerId._id,
          signal,
          callId: currentCall.callId,
        });
      } catch (error) {
        console.error("发送信令失败:", error);
      }
    });

    peer.on("stream", (remoteStream) => {
      console.log("接收到远程流:", remoteStream);
       // 自动播放远程音频流
      const audioElement = new Audio();
      audioElement.srcObject = remoteStream;
      audioElement.autoplay = true; // 确保自动播放
      audioElement.volume = 1.0;    // 确保音量正常
      audioElement.play().catch((err) => console.error("音频播放失败:", err));
          set({ remoteStream });
    });

    peer.on("error", (err) => {
      console.error("Peer连接错误:", err);
    });

    // 处理暂存信令队列
    const { signalingQueue } = get();
    if (signalingQueue.length > 0) {
      signalingQueue.forEach(({ signal }) => {
        console.log("处理暂存信令:", signal);
        peer.signal(signal);
      });
      set({ signalingQueue: [] }); // 清空队列
    }

    return peer;
  },

  // 发起通话
  initiateCall: async (receiverId, type, groupId = null, isGroupCall = false) => {
    try {
      const response = await axiosInstance.post("/calls/initiate", {
        receiverId,
        type,
        groupId,
        isGroupCall,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });

      const peer = get().initializePeer(true, stream);

      set({
        currentCall: response.data,
        peer,
        localStream: stream,
        isCallModalOpen: true,
      });

      return response.data;
    } catch (error) {
      console.error("发起通话失败:", error);
      toast.error(error.response?.data?.error || "发起通话失败");
    }
  },

  // 接受通话
  acceptCall: async () => {
    const { currentCall } = get();
    if (!currentCall) return;

    try {
      await axiosInstance.post(`/calls/${currentCall.callId}/accept`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: currentCall.type === "video",
        audio: true,
      });

      const peer = get().initializePeer(false, stream);

      set({
        localStream: stream,
        peer,
        currentCall: { ...get().currentCall, status: "accepted" },
      });

      console.log("接受通话成功:", currentCall);
    } catch (error) {
      console.error("接受通话失败:", error);
      toast.error(error.response?.data?.error || "接受通话失败");
    }
  },

  // 拒绝通话
  rejectCall: async () => {
    const { currentCall } = get();
    if (!currentCall) return;

    try {
      await axiosInstance.post(`/calls/${currentCall.callId}/reject`);
      get().resetCallState();
    } catch (error) {
      console.error("拒绝通话失败:", error);
      toast.error(error.response?.data?.error || "拒绝通话失败");
    }
  },

  // 结束通话
  endCall: async () => {
    const { currentCall, localStream, remoteStream, peer } = get();
    if (!currentCall) return;

    try {
      await axiosInstance.post(`/calls/${currentCall._id}/end`);

      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
      if (peer) peer.destroy();

      get().resetCallState();
    } catch (error) {
      console.error("结束通话失败:", error);
      toast.error(error.response?.data?.error || "结束通话失败");
    }
  },

  // 重置通话状态
  resetCallState: () => {
    set({
      currentCall: null,
      isCallModalOpen: false,
      localStream: null,
      remoteStream: null,
      peer: null,
      signalingQueue: [],
    });
  },
}));

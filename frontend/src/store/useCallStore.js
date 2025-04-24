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
  isMinimized: false, // 是否最小化
  callDuration: 0, // 通话时长（秒）
  callTimer: null, // 通话计时器

  // --- Socket Event Handlers (供 AuthStore 调用) ---
  handleIncomingCall: (data) => {
    console.log("CallStore: Handling incomingCall", data);
    // 避免处理已存在的通话或自己发起的通话
    const { currentCall } = get();
    if (currentCall) {
        console.warn("Ignoring incoming call while already in a call.");
        return;
    }
    // 简单检查，防止收到自己呼叫自己的信令（理论上后端不该发）
    const currentUser = useAuthStore.getState().authUser;
    if (data.callerId?._id === currentUser?._id) {
        console.warn("Ignoring incoming call from self.");
        return;
    }
    set({
      currentCall: { ...data, isIncoming: true },
      isCallModalOpen: true,
    });
  },

  handleCallAccepted: async (data) => {
    console.log("CallStore: Handling callAccepted", data);
    const { currentCall, peer } = get();
    // 确保是当前呼出的通话被接受，并且 Peer 实例已由 initiateCall 创建
    console.log("CallStore: Handling callAccepted", data, currentCall, peer);
    if (currentCall && !currentCall.isIncoming && currentCall.callId === data.callId && peer) {
      try {
        // 如果本地流已存在（理论上应该在 initiateCall 时获取了），直接添加
        // 如果没有，再尝试获取
        let stream = get().localStream;
        if (!stream) {
            console.warn("Local stream not found when call accepted, attempting to get again.");
             stream = await navigator.mediaDevices.getUserMedia({
              video: currentCall.type === "video",
              audio: true,
            });
            set({ localStream: stream });
        }
        
        // 添加轨道到 Peer 连接
        stream.getTracks().forEach((track) => {
            // 检查轨道是否已添加，避免重复添加
            if (!peer.streams[0] || !peer.streams[0].getTracks().find(t => t.id === track.id)) {
                peer.addTrack(track, stream);
            }
        });
        console.log("Local stream tracks added to Peer.");
        get().startCallTimer(); // 开始计时
      } catch (error) {
        console.error("Error handling call accepted:", error);
        toast.error("无法访问摄像头或麦克风");
        get().endCall(); // 出错则结束通话
      }
    }
  },

  handleCallRejected: (data) => {
    console.log("CallStore: Handling callRejected", data);
    const { currentCall } = get();
    // 确保是当前相关的通话被拒绝
    if (currentCall && currentCall.callId === data.callId) {
      toast.error(`${currentCall.isIncoming ? data.callerName || '对方' : data.receiverName || '对方'} 拒绝了通话`);
      get().resetCallState();
    }
  },

  handleCallEnded: (data) => {
    console.log("CallStore: Handling callEnded", data);
    const { currentCall, localStream, remoteStream, peer } = get();
    // 确保是当前通话被结束
    if (currentCall && currentCall.callId === data.callId) {
      toast.success("通话已结束");
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
      if (peer) peer.destroy();
      get().resetCallState();
    }
  },

  handleSignalingData: ({ signal, callId, senderId }) => {
    console.log("CallStore: Handling signalingData", { signal, callId, senderId });
    const { currentCall, peer, signalingQueue } = get();

    // 1. 如果 Peer 实例还不存在，直接加入队列，后续 Peer 初始化时会处理
    if (!peer) {
      console.warn("Peer not initialized, queueing signaling data.");
      // 检查队列中是否已有此信号（避免重复添加，虽然理论上少见）
      if (!signalingQueue.some(item => JSON.stringify(item.signal) === JSON.stringify(signal))) {
           set({ signalingQueue: [...signalingQueue, { signal, callId, senderId }] });
      }
      return; // 加入队列后，本次处理结束
    }

    // 2. Peer 实例已存在，检查 callId 是否匹配当前通话
    if (currentCall && currentCall.callId === callId) {
      // Call ID 匹配，处理信令
      try {
        console.log("Signaling peer with received data...");
        peer.signal(signal);
      } catch (err) {
        console.error("Error signaling peer:", err);
        // 考虑是否需要重置通话状态
        // get().resetCallState(); 
        toast.error("通话信令处理出错");
      }
    } else {
      // Call ID 不匹配，忽略此信令
      console.warn("Received signaling data for non-current call or no active call, ignoring.", {
        currentCallId: currentCall?.callId,
        receivedCallId: callId,
      });
    }
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
          receiverId: isInitiator ? currentCall.receiverId._id : currentCall.callerId._id,
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
      console.log("initiateCall response:", response.data);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });

      const peer = get().initializePeer(true, stream);

      set({
        currentCall: { ...response.data, callId: response.data._id },
        peer,
        localStream: stream,
        isCallModalOpen: true,
      });
      return { ...response.data, callId: response.data._id };
    } catch (error) {
      console.error("发起通话失败:", error);
      toast.error(error.response?.data?.error || "发起通话失败");
      return null;
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
      get().startCallTimer();

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
      await axiosInstance.post(`/calls/${currentCall?.callId ?? currentCall?._id}/reject`);
      toast.success("通话已结束");
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
      console.log("结束通话",currentCall);
      await axiosInstance.post(`/calls/${currentCall?.callId ?? currentCall?._id}/end`);

      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
      if (peer) peer.destroy();
      toast.success("通话已结束");
      get().resetCallState();
    } catch (error) {
      console.error("结束通话失败:", error);
      toast.error(error.response?.data?.error || "结束通话失败");
    }
  },

  // 切换最小化状态
  toggleMinimized: () => {
    set(state => ({
      isMinimized: !state.isMinimized
    }));
  },

  // 开始计时
  startCallTimer: () => {
    const timer = setInterval(() => {
      set(state => ({
        callDuration: state.callDuration + 1
      }));
    }, 1000);
    set({ callTimer: timer });
  },

  // 停止计时
  stopCallTimer: () => {
    const { callTimer } = get();
    if (callTimer) {
      clearInterval(callTimer);
      set({ callTimer: null });
    }
  },

  // 重置通话状态
  resetCallState: () => {
    const { stopCallTimer } = get();
    stopCallTimer();
    set({
      currentCall: null,
      isCallModalOpen: false,
      localStream: null,
      remoteStream: null,
      peer: null,
      signalingQueue: [],
      isMinimized: false,
      callDuration: 0
    });
  },
  
    // 格式化通话时长
  formatDuration : (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
  
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
          .toString()
          .padStart(2, "0")}`;
      }
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    },
}));

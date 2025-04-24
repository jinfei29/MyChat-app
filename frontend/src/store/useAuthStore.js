import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore.js";
import { useFriendStore } from "./useFriendStore.js";
import { useCallStore } from "./useCallStore.js";
import { devtools } from "zustand/middleware";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "http://8.148.28.160:5001";

// 定义所有需要监听的 socket 事件
const SOCKET_EVENTS = [
  "newMessage", "newGroupMessage", "botStreamResponse", // Chat events
  "getOnlineUsers", // User status events
  "userUpdated", "userProfileUpdated", // User profile events
  "friendRequest", "friendRequestRejected", "friendRequestAccepted", "friendDeleted", // Friend events (Added friendRequest)
  "groupInvitation", "removedFromGroup", "memberRemoved", "memberJoinedGroup", // Group membership events
  "memberLeftGroup", "groupDissolved", "groupProfileUpdated", "newGroupCreated", // Group status events (Added newGroupCreated)
  "announcementUpdated", "announcementDeleted", "announcementEdited", // Group announcement events
  "incomingCall", "callAccepted", "callRejected", "callEnded", "signalingData" // Call events
];

// 内部辅助函数：注册所有事件监听器
const registerSocketEventHandlers = (socket) => {
  console.log("🔌 Registering all socket event handlers...");
  const chatStore = useChatStore.getState();
  const friendStore = useFriendStore.getState();
  const callStore = useCallStore.getState(); // 现在需要它了
  const authStore = useAuthStore.getState();

  // --- Chat Handlers ---
  socket.on("newMessage", chatStore.handleNewMessage);
  socket.on("newGroupMessage", chatStore.handleNewGroupMessage);
  socket.on("botStreamResponse", chatStore.handleBotStreamResponse); // 假设这个handler存在于chatStore

  // --- User Status Handlers ---
  socket.on("getOnlineUsers", (userIds) => {
    console.log("📶 Online users updated:", userIds);
    authStore.setOnlineUsers(userIds); // 需要添加一个简单的setter
  });

  // --- User Profile Handlers ---
  socket.on("userUpdated", authStore.handleUserUpdated); // 需要将逻辑移入handler
  socket.on("userProfileUpdated", authStore.handleUserProfileUpdated); // 需要将逻辑移入handler

  // --- Friend Handlers ---
  socket.on("friendRequest", friendStore.handleFriendRequest); // 使用正确的名字
  socket.on("friendRequestRejected", friendStore.handleFriendRequestRejected);
  socket.on("friendRequestAccepted", friendStore.handleFriendRequestAccepted);
  socket.on("friendDeleted", friendStore.handleFriendRemoved);

  // --- Group Handlers ---
  socket.on("groupInvitation", chatStore.handleGroupInvitation);
  socket.on("removedFromGroup", chatStore.handleRemovedFromGroup);
  socket.on("memberRemoved", chatStore.handleMemberRemoved);
  socket.on("memberJoinedGroup", chatStore.handleMemberJoinedGroup);
  socket.on("memberLeftGroup", chatStore.handleMemberLeftGroup);
  socket.on("groupDissolved", chatStore.handleGroupDissolved);
  socket.on("groupProfileUpdated", chatStore.handleGroupProfileUpdated);
  socket.on("newGroupCreated", chatStore.handleNewGroupCreated);
  socket.on("announcementUpdated", chatStore.handleAnnouncementUpdated);
  socket.on("announcementDeleted", chatStore.handleAnnouncementDeleted);
  socket.on("announcementEdited", chatStore.handleAnnouncementEdited);

  // --- Call Event Handlers ---
  socket.on("incomingCall", callStore.handleIncomingCall);
  socket.on("callAccepted", callStore.handleCallAccepted);
  socket.on("callRejected", callStore.handleCallRejected);
  socket.on("callEnded", callStore.handleCallEnded);
  socket.on("signalingData", callStore.handleSignalingData);
};

// 内部辅助函数：移除所有事件监听器
const unregisterSocketEventHandlers = (socket) => {
  console.log("🔌 Unregistering all socket event handlers...");
  SOCKET_EVENTS.forEach(event => socket.off(event));
};

export const useAuthStore = create(devtools((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // --- Actions ---
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket(); // 认证成功后连接Socket
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket(); // 注册成功后连接Socket
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket(); // 登录成功后连接Socket
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().disconnectSocket(); // 登出时断开Socket
      set({ authUser: null }); // 清除用户信息
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("头像更新成功");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "更新头像失败");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateFullName: async (fullName) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-fullname", { fullName });
      set({ authUser: res.data });
      toast.success("用户名更新成功");
    } catch (error) {
      console.log("error in update fullname:", error);
      toast.error(error.response?.data?.message || "更新用户名失败");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket: existingSocket } = get();

    if (!authUser) {
      console.log("❌ Cannot connect socket: No authenticated user");
      return;
    }

    if (existingSocket?.connected) {
      console.log("✅ Socket already connected");
      return;
    }

    if (existingSocket) {
      console.log("🔌 Disconnecting old socket before reconnecting...");
      unregisterSocketEventHandlers(existingSocket);
      existingSocket.disconnect();
    }

    console.log("📡 Creating new socket connection for:", authUser._id);
    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // --- Socket Event Listeners ---
    newSocket.on("connect", () => {
      console.log(`✅ Socket connected: ${newSocket.id}`);
      set({ socket: newSocket }); // 更新Store中的Socket实例
      registerSocketEventHandlers(newSocket); // 连接成功后注册所有事件
    });

    newSocket.on("disconnect", (reason) => {
      console.warn(`🔌 Socket disconnected: ${reason}`);
      unregisterSocketEventHandlers(newSocket); // 断开连接时注销事件
      // 不立即设置 socket: null，允许自动重连
      // 如果需要手动管理重连或彻底断开，可以在这里添加逻辑
      // set({ socket: null, onlineUsers: [] });
    });

    newSocket.on("connect_error", (err) => {
      console.error(`❌ Socket connection error: ${err.message}`);
      // 这里可以根据错误类型决定是否彻底断开或重试
      // unregisterSocketEventHandlers(newSocket);
      // set({ socket: null });
    });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      console.log("🔌 Manually disconnecting socket...");
      unregisterSocketEventHandlers(socket);
      socket.disconnect();
      set({ socket: null, onlineUsers: [] }); // 手动断开时清理
    }
  },

  // --- Event Handlers (moved logic here) ---
  handleUserUpdated: ({ userId, fullName }) => {
      const { users, selectedUser, groupChats, messages } = useChatStore.getState();
      const { friends } = useFriendStore.getState();
      console.log('AuthStore: Handling userUpdated', { userId, fullName });

      // 更新用户列表中的用户名
      const updatedUsers = users.map(user =>
        user._id === userId ? { ...user, fullName } : user
      );
      const updatedFriends = friends.map(friend =>
        friend._id === userId ? { ...friend, fullName } : friend
      );
      let updatedSelectedUser = selectedUser;
      if (selectedUser?._id === userId) {
        updatedSelectedUser = { ...selectedUser, fullName };
      }
      const updatedGroupChats = groupChats.map(group => ({
        ...group,
        members: group.members.map(member =>
          member._id === userId ? { ...member, fullName } : member
        ),
        admin: group.admin._id === userId ? { ...group.admin, fullName } : group.admin
      }));
      const updatedMessages = messages.map(message => {
        if (message.senderId._id === userId) {
          return {
            ...message,
            senderId: { ...message.senderId, fullName }
          };
        }
        return message;
      });

      useChatStore.setState({
        users: updatedUsers,
        selectedUser: updatedSelectedUser,
        groupChats: updatedGroupChats,
        messages: updatedMessages
      });
      useFriendStore.setState({ friends: updatedFriends });
  },

  handleUserProfileUpdated: ({ userId, profilePic }) => {
      console.log('AuthStore: Handling userProfileUpdated:', { userId, profilePic });
      const { users, selectedUser, groupChats, messages } = useChatStore.getState();
      const { friends } = useFriendStore.getState();

      const updatedUsers = users.map(user =>
        user._id === userId ? { ...user, profilePic } : user
      );
      const updatedFriends = friends.map(friend =>
        friend._id === userId ? { ...friend, profilePic } : friend
      );
      let updatedSelectedUser = selectedUser;
      if (selectedUser?._id === userId) {
        updatedSelectedUser = { ...selectedUser, profilePic };
      }
      const updatedGroupChats = groupChats.map(group => ({
        ...group,
        members: group.members.map(member =>
          member._id === userId ? { ...member, profilePic } : member
        ),
        admin: group.admin._id === userId ? { ...group.admin, profilePic } : group.admin
      }));
      const updatedMessages = messages.map(message => {
        if (message.senderId._id === userId) {
          return {
            ...message,
            senderId: { ...message.senderId, profilePic }
          };
        }
        return message;
      });

      useChatStore.setState({
        users: updatedUsers,
        selectedUser: updatedSelectedUser,
        groupChats: updatedGroupChats,
        messages: updatedMessages
      });
      useFriendStore.setState({ friends: updatedFriends });
  }
})));

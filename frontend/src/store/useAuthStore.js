import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore.js";
import { useFriendStore } from "./useFriendStore.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
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
      get().connectSocket();
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

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
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
    const { authUser } = get();
    if (!authUser) {
      console.log("Cannot connect socket: No authenticated user");
      return;
    }
    
    if (get().socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    console.log("Connecting socket for user:", authUser._id);
    
    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
      transports: ['websocket'], // 强制使用WebSocket
      reconnection: true,        // 启用重连
      reconnectionAttempts: 5,   // 尝试重连次数
      reconnectionDelay: 1000,   // 重连延迟
    });
    

    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("Received online users:", userIds);
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
  


  // 订阅用户事件
  subscribeToUserEvents: () => {
    const socket = get().socket;
    if (!socket) return;

  // 监听用户名更新
  socket.on("userUpdated", ({ userId, fullName }) => {
    const { users, selectedUser, groupChats, messages } = useChatStore.getState();
    const { friends }=useFriendStore.getState();
    console.log('userUpdated，fullName',fullName,userId,selectedUser,users,friends)
    // 更新用户列表中的用户名
    const updatedUsers = users.map(user =>
      user._id === userId ? { ...user, fullName } : user
    );
    
    const updatedFriends = friends.map(friend =>
      friend._id === userId ? { ...friend, fullName } : friend
    );
    
    // 更新选中的用户名
    let updatedSelectedUser = selectedUser;
    if (selectedUser?._id === userId) {
      updatedSelectedUser = { ...selectedUser, fullName };
    }

    // 更新群组中的成员名称
    const updatedGroupChats = groupChats.map(group => ({
      ...group,
      members: group.members.map(member =>
        member._id === userId ? { ...member, fullName } : member
      ),
      admin: group.admin._id === userId ? { ...group.admin, fullName } : group.admin
    }));

    // 更新消息中的发送者名称
    const updatedMessages = messages.map(message => {
      if (message.senderId._id === userId) {
        return {
          ...message,
          senderId: { ...message.senderId, fullName }
        };
      }
      return message;
    });

   // 更新状态
    useChatStore.setState({
      users: updatedUsers,
      selectedUser: updatedSelectedUser,
      groupChats: updatedGroupChats,
      messages: updatedMessages
    });
    useFriendStore.setState({
      friends: updatedFriends
    });
    //更新后的好友列表
    console.log('updatedFriends', updatedFriends);
    //更新名字后的用户
    console.log('updatedUsers', updatedUsers);
  });
  
  socket.on("userProfileUpdated", ({ userId, profilePic }) => {
    console.log('用户头像已更新:', userId, profilePic);
    
    // 获取所有需要更新的状态
    const { users, selectedUser, groupChats, messages } = useChatStore.getState();
    const { friends } = useFriendStore.getState();
    
    // 更新聊天用户列表中的头像
    const updatedUsers = users.map(user =>
      user._id === userId ? { ...user, profilePic } : user
    );
    
    // 更新好友列表中的头像
    const updatedFriends = friends.map(friend =>
      friend._id === userId ? { ...friend, profilePic } : friend
    );
    
    // 更新当前选中用户的头像（如果是同一用户）
    let updatedSelectedUser = selectedUser;
    if (selectedUser?._id === userId) {
      updatedSelectedUser = { ...selectedUser, profilePic };
    }
    
    // 更新群组中成员的头像
    const updatedGroupChats = groupChats.map(group => ({
      ...group,
      members: group.members.map(member =>
        member._id === userId ? { ...member, profilePic } : member
      ),
      admin: group.admin._id === userId ? { ...group.admin, profilePic } : group.admin
    }));
    
    // 更新消息中发送者的头像
    const updatedMessages = messages.map(message => {
      if (message.senderId._id === userId) {
        return {
          ...message,
          senderId: { ...message.senderId, profilePic }
        };
      }
      return message;
    });
    
    // 更新各个store中的状态
    useChatStore.setState({
      users: updatedUsers,
      selectedUser: updatedSelectedUser,
      groupChats: updatedGroupChats,
      messages: updatedMessages
    });
    
    useFriendStore.setState({
      friends: updatedFriends
    });
    
    console.log('头像已更新 - 用户列表:', updatedUsers);
    console.log('头像已更新 - 好友列表:', updatedFriends);
  })
  },

  unsubscribeFromUserEvents: () => {
    const socket = get().socket;
    if (!socket) return;
    socket.off("userUpdated");
    socket.off("userProfileUpdated");
  }


}));

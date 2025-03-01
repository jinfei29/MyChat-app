import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useFriendStore = create((set) => ({
  friends: [],
  friendRequests: [],
  searchResult: null,
  isSearching: false,
  isLoading: true,
  unreadRequestsCount: 0,

  // 重置未读计数
  resetUnreadRequestsCount: () => {
    set({ unreadRequestsCount: 0 });
  },

  // 搜索用户
  searchUserByEmail: async (email) => {
    set({ isSearching: true, searchResult: null });
    try {
      const res = await axiosInstance.get(`/friendship/search?email=${email}`);
      set({ searchResult: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "搜索用户失败");
    } finally {
      set({ isSearching: false });
    }
  },

  // 发送好友请求
  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/friendship/request/${userId}`);
      set({ searchResult: null });
      toast.success("好友申请已发送");
    } catch (error) {
      toast.error(error.response?.data?.error || "发送好友申请失败");
    }
  },

  // 接受好友请求
  acceptFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.post(`/friendship/accept/${requestId}`);
      
      // 更新好友列表和请求列表
      set(state => ({
        friends: [...state.friends, res.data.user1],
        friendRequests: state.friendRequests.filter(req => req._id !== requestId)
      }));
      
      toast.success("已接受好友申请");
    } catch (error) {
      toast.error(error.response?.data?.error || "接受好友申请失败");
    }
  },

  // 拒绝好友请求
  rejectFriendRequest: async (requestId) => {
    try {
      await axiosInstance.post(`/friendship/reject/${requestId}`);
      
      // 更新请求列表
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req._id !== requestId)
      }));
      
      toast.success("已拒绝好友申请");
    } catch (error) {
      toast.error(error.response?.data?.error || "拒绝好友申请失败");
    }
  },

  // 获取好友请求列表
  getFriendRequests: async () => {
    try {
      const res = await axiosInstance.get("/friendship/requests");
      set({ 
        friendRequests: res.data,
        unreadRequestsCount: res.data.length
      });
    } catch (error) {
      console.error("获取好友请求失败:", error);
    }
  },

  // 获取好友列表
  getFriendList: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/friendship/list");
      set({friends:  res.data });
    } catch (error) {
      console.error("获取好友列表失败:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // 删除好友
  deleteFriend: async (friendId) => {
    try {
      await axiosInstance.delete(`/friendship/delete/${friendId}`);
      set(state => ({
        friends: state.friends.filter(friend => friend._id !== friendId)
      }));
      toast.success("好友已删除");
    } catch (error) {
      toast.error(error.response?.data?.error || "删除好友失败");
    }
  },

  // 订阅好友相关的socket事件
  subscribeToFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // 监听新的好友请求
    socket.on("friendRequest", ({ requestId, user }) => {
      set(state => ({
        friendRequests: [...state.friendRequests, { _id: requestId, user1: user }],
        unreadRequestsCount: state.unreadRequestsCount + 1
      }));
      toast.success(`收到来自 ${user.fullName} 的好友申请`);
    });


    // 监听好友请求被接受
    socket.on("friendRequestAccepted", ({ friendship, user }) => {
      console.log("收到好友请求接受事件:", { friendship, user });
      
      // 立即更新好友列表
      set(state => ({
        friends: [...state.friends, user]
      }));
      
      toast.success(`${user.fullName} 接受了你的好友申请`);
    });

    // 监听好友请求被拒绝
    socket.on("friendRequestRejected", () => {
      toast.error("好友申请被拒绝");
    });

    // 监听被删除好友
    socket.on("friendDeleted", ({ userId }) => {
      const { setSelectedUser } = useChatStore.getState();
      set(state => ({
        friends: state.friends.filter(friend => friend._id !== userId)
      }));
      // 清除当前聊天
      setSelectedUser(null);

    });
  },

  // 取消订阅socket事件
  unsubscribeFromFriendEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("friendRequest");
    socket.off("friendRequestAccepted");
    socket.off("friendRequestRejected");
    socket.off("friendDeleted");
    socket.off("groupInvitation");
  },
})); 

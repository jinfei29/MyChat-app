import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useFriendStore = create((set, get) => ({
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

  // --- Socket Event Handlers (供 AuthStore 调用) ---
  handleFriendRequest: ({ requestId, user }) => {
    console.log("FriendStore: Handling friendRequest (previously received)", { requestId, user });
    set(state => ({
      friendRequests: state.friendRequests.some(req => req._id === requestId)
        ? state.friendRequests
        : [...state.friendRequests, { _id: requestId, user1: user }],
      unreadRequestsCount: state.friendRequests.some(req => req._id === requestId)
        ? state.unreadRequestsCount
        : state.unreadRequestsCount + 1
    }));
    // 只有在请求不存在时提示
    if (!get().friendRequests.some(req => req._id === requestId)) {
        toast.success(`收到来自 ${user.fullName} 的好友申请`);
    }
  },

  handleFriendRequestAccepted: ({ friendship, user }) => {
    console.log("FriendStore: Handling friendRequestAccepted", { friendship, user });
    set(state => ({
      friends: state.friends.some(f => f._id === user._id) ? state.friends : [...state.friends, user],
      // 移除被接受的请求（无论是你发出的还是收到的）
      friendRequests: state.friendRequests.filter(req => req._id !== friendship._id)
    }));
    // 判断是自己发出的请求被接受，还是自己接受了别人的请求
    const currentUser = useAuthStore.getState().authUser;
    if(friendship.user1 === currentUser?._id) { // 你发出的请求被 user (user2) 接受
         toast.success(`${user.fullName} 接受了你的好友申请`);
    } 
    // else { // 你接受了 user (user1) 的请求 - 这个逻辑在 acceptFriendRequest Action 中处理更好
    //     toast.success(`已添加 ${user.fullName} 为好友`);
    // }
   
  },

  handleFriendRequestRejected: ({ requestId }) => { // 后端只发送了requestId
    console.log("FriendStore: Handling friendRequestRejected", { requestId });
    // 无需更新状态，仅提示用户
    toast.error("你的好友申请被拒绝了");
    // 如果需要，可以从界面移除对应的已发送请求状态，但这需要前端额外管理已发送请求
  },

  handleFriendRemoved: ({ userId }) => {
    const { setSelectedUser, selectedUser } = useChatStore.getState(); // 获取 selectedUser
    console.log("FriendStore: Handling friendRemoved", userId);
    set(state => ({
      friends: state.friends.filter(friend => friend._id !== userId)
    }));
    // 如果当前正在与被删除的好友聊天，则清空聊天界面
    if (selectedUser?._id === userId) {
      setSelectedUser(null);
    }
    toast.error("你已被对方删除好友");
  },
})); 

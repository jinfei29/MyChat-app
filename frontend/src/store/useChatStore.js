import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
// eslint-disable-next-line no-unused-vars
import { useFriendStore } from "./useFriendStore";
// eslint-disable-next-line no-unused-vars
import { useCallStore } from "./useCallStore";
import { devtools } from "zustand/middleware";


export const useChatStore = create(devtools((set, get) => ({
  messages: [],
  users: [],
  flitterUsers: [],
  selectedUser: null,
  groupChats: [],
  groupInvitations: [],
  unreadInvitationsCount: 0,
  selectedGroup: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false,
  isUpdatingGroupProfilePic: false,
  // 添加未读消息状态
  unreadMessages: {
    users: {}, // 格式: { userId: count }
    groups: {}, // 格式: { groupId: count }
  },

  initializeSocketConnection: () => {
    const { authUser, socket, connectSocket } = useAuthStore.getState();
  
    if (!authUser) return;
  
    if (!socket || !socket.connected) {
      connectSocket();
    }
  },
  

  // 重置未读邀请计数
  resetUnreadInvitationsCount: () => {
    set({ unreadInvitationsCount: 0 });
  },

  // 重置所有选中状态
  resetSelection: () => {
    set({
      selectedUser: null,
      selectedGroup: null,
      messages: [],
    });
  },

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // 先获取普通用户列表
      const res = await axiosInstance.get("/messages/users");
      set({ flitterUsers: res.data });
      // 初始化AI机器人
      const botRes = await axiosInstance.get("/ai-bot/initialize");
      console.log("AI机器人初始化结果:", botRes.data);

      // 创建机器人用户对象
      const botUser = {
        _id: botRes.data.botId,
        fullName: botRes.data.botName,
        profilePic: "https://res.cloudinary.com/dpj2cf4hv/image/upload/v1737363741/zpm7kcdugck0flwq3tkm.jpg",
        isBot: true
      };

      // 将机器人添加到用户列表
      const allUsers = [...res.data];
      if (!allUsers.some(user => user._id === botUser._id)) {
        allUsers.push(botUser);
      }

      set({ users: allUsers });
    } catch (error) {
      console.error("获取用户列表失败:", error);
      toast.error(error.response?.data?.message || "获取用户列表失败");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const { selectedUser } = get();
      let response;

      // 检查是否是获取AI机器人的消息历史
      if (selectedUser?.isBot) {
        response = await axiosInstance.get("/ai-bot/history");
      } else {
        response = await axiosInstance.get(`/messages/${userId}`);
      }

      set({ messages: response.data });
    } catch (error) {
      console.error("获取消息历史失败:", error);
      toast.error(error.response?.data?.message || "获取消息历史失败");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const currentUser = useAuthStore.getState().authUser;
    try {
      let response;
      const newMessage = {
        _id: Date.now(), // 临时ID
        senderId: currentUser,
        receiverId: selectedUser._id,
        text: messageData.text,
        createdAt: new Date().toISOString()
      };

      // 检查是否是发送给AI机器人的消息
      if (selectedUser.isBot) {
        // 先添加用户消息
        set({ messages: [...messages, newMessage] });

        // 发送消息给AI机器人
        response = await axiosInstance.post("/ai-bot/send", {
          message: messageData.text
        });

        // 添加机器人的初始空消息
        set({
          messages: [...get().messages, {
            ...response.data.botMessage,
            text: '', // 初始为空，等待流式更新
            isBot: true
          }]
        });
      } else {
        // 普通用户消息
        response = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`,
          messageData
        );
        set({ messages: [...messages, response.data] });
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      toast.error(error.response?.data?.message || "发送消息失败");
    }
  },

  setSelectedUser: (user) => {
    const { resetSelection, clearUnreadCount } = get();
    resetSelection();
    if (user) {
      clearUnreadCount('user', user._id);
      set({ selectedUser: user });
    }
  },

  getGroupChats: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/group-chats");
      set({ groupChats: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  setSelectedGroup: (group) => {
    const { resetSelection, clearUnreadCount } = get();
    console.log("Setting selected group:", group);

    resetSelection();

    if (group) {
      clearUnreadCount('group', group._id);
      set({
        selectedGroup: {
          ...group,
          admin: group.admin || {},
          members: group.members || []
        },
        selectedUser: null,
      });
    }
  },

  getGroupMessages: async (groupId) => {
    console.log("Getting group messages for:", groupId);
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/group-chats/${groupId}/messages`);
      console.log("Group messages received:", res.data);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error fetching group messages:", error);
      toast.error(error.response?.data?.message || "Failed to fetch group messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    try {
      const res = await axiosInstance.post(`/group-chats/${groupId}/send`, messageData);
      const { messages, groupChats } = get();
      set({ messages: [...messages, res.data] });

      // 更新群聊列表中的最新消息
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            lastMessage: {
              content: messageData.text,
              sender: res.data.senderId.fullName,
              timestamp: new Date()
            }
          };
        }
        return group;
      });
      set({ groupChats: updatedGroupChats });
    } catch (error) {
      toast.error(error.response?.data?.message || "发送消息失败");
    }
  },

  createGroupChat: async (groupData) => {
    try {
      const res = await axiosInstance.post("/group-chats/create", groupData);
      // 创建者立即添加群组到列表
      const { groupChats } = get();
      set({
        groupChats: [...groupChats, res.data],
        selectedGroup: res.data,
        messages: []
      });
      return res.data;
    } catch (error) {
      console.error("Error creating group chat:", error);
      toast.error(error.response?.data?.message || "创建群聊失败");
      throw error;
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/group-chats/${groupId}/leave`);
      const { groupChats } = get();
      // 从群聊列表中移除
      set({
        groupChats: groupChats.filter(group => group._id !== groupId),
        selectedGroup: null,
        messages: []
      });
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error(error.response?.data?.message || "Failed to leave group");
      throw error;
    }
  },

  // 添加更新未读消息数的方法
  updateUnreadCount: (type, id) => {
    const { unreadMessages } = get();
    if (type === 'user') {
      set({
        unreadMessages: {
          ...unreadMessages,
          users: {
            ...unreadMessages.users,
            [id]: (unreadMessages.users[id] || 0) + 1
          }
        }
      });
    } else if (type === 'group') {
      set({
        unreadMessages: {
          ...unreadMessages,
          groups: {
            ...unreadMessages.groups,
            [id]: (unreadMessages.groups[id] || 0) + 1
          }
        }
      });
    }
  },

  // 清除未读消息数
  clearUnreadCount: (type, id) => {
    const { unreadMessages } = get();
    if (type === 'user') {
      const newUsers = { ...unreadMessages.users };
      delete newUsers[id];
      set({
        unreadMessages: {
          ...unreadMessages,
          users: newUsers
        }
      });
    } else if (type === 'group') {
      const newGroups = { ...unreadMessages.groups };
      delete newGroups[id];
      set({
        unreadMessages: {
          ...unreadMessages,
          groups: newGroups
        }
      });
    }
  },

  // 添加解散群聊的方法
  dissolveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/group-chats/${groupId}/dissolve`);
      const { groupChats } = get();

      // 从群聊列表中移除
      set({
        groupChats: groupChats.filter(group => group._id !== groupId),
        selectedGroup: null,
        messages: []
      });
      toast.success("群聊已解散")
    } catch (error) {
      console.error("Error dissolving group:", error);
      toast.error(error.response?.data?.message || "解散群聊失败");
      throw error;
    }
  },

  // // AI 机器人相关方法
  // initializeAiBot: async () => {
  //   try {
  //     console.log("正在初始化 AI 机器人...");
  //     const response = await axiosInstance.get("/ai-bot/initialize");
  //     console.log("AI 机器人初始化响应:", response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error("初始化 AI 机器人失败:", error);
  //     throw error;
  //   }
  // },

  sendMessageToBot: async (message) => {
    try {
      console.log("正在发送消息给 AI 机器人:", message);
      const response = await axiosInstance.post("/ai-bot/send", { message });
      console.log("AI 机器人响应:", response.data);
      return response.data;
    } catch (error) {
      console.error("发送消息给 AI 机器人失败:", error);
      throw error;
    }
  },

  getBotConversation: async () => {
    try {
      console.log("正在获取 AI 机器人对话历史...");
      const response = await axiosInstance.get("/ai-bot/history");
      console.log("获取到的对话历史:", response.data);
      return response.data;
    } catch (error) {
      console.error("获取 AI 机器人对话历史失败:", error);
      throw error;
    }
  },

  // 添加群公告相关方法
  updateAnnouncement: async (groupId, content) => {
    try {
      const response = await axiosInstance.post(
        `/group-chats/${groupId}/announcements`,
        { content }
      );
      console.log("群公告更新响应:", response.data);
      // 更新本地群组数据
      const { groupChats, selectedGroup } = get();
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            announcements: [response.data, ...(group.announcements || [])]
          };
        }
        return group;
      });
      console.log("更新后的群组数据:", updatedGroupChats);
      // 如果当前正在查看这个群组，也更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            announcements: [response.data, ...(selectedGroup.announcements || [])]
          }
        });
      }

      set({ groupChats: updatedGroupChats });
      toast.success("群公告已发布");
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error(error.response?.data?.message || "发布群公告失败");
      throw error;
    }
  },

  // 获取群公告列表
  getAnnouncements: async (groupId) => {
    try {
      const response = await axiosInstance.get(
        `/group-chats/${groupId}/announcements`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting announcements:", error);
      toast.error(error.response?.data?.message || "获取群公告失败");
      throw error;
    }
  },

  // 删除群公告
  deleteAnnouncement: async (groupId, announcementId) => {
    try {
      await axiosInstance.delete(
        `/group-chats/${groupId}/announcements/${announcementId}`
      );

      // 更新本地群组数据
      const { groupChats, selectedGroup } = get();
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            announcements: group.announcements.filter(
              announcement => announcement._id !== announcementId
            )
          };
        }
        return group;
      });

      // 如果当前正在查看这个群组，也更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            announcements: selectedGroup.announcements.filter(
              announcement => announcement._id !== announcementId
            )
          }
        });
      }

      set({ groupChats: updatedGroupChats });
      toast.success("群公告已删除");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error(error.response?.data?.message || "删除群公告失败");
      throw error;
    }
  },

  // 修改群公告
  editAnnouncement: async (groupId, announcementId, content) => {
    try {
      const response = await axiosInstance.put(
        `/group-chats/${groupId}/announcements/${announcementId}`,
        { content }
      );

      // 更新本地群组数据
      const { groupChats, selectedGroup } = get();
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            announcements: group.announcements.map(announcement =>
              announcement._id === announcementId ? response.data : announcement
            )
          };
        }
        return group;
      });

      // 如果当前正在查看这个群组，也更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            announcements: selectedGroup.announcements.map(announcement =>
              announcement._id === announcementId ? response.data : announcement
            )
          }
        });
      }

      set({ groupChats: updatedGroupChats });
      toast.success("群公告已更新");
    } catch (error) {
      console.error("Error editing announcement:", error);
      toast.error(error.response?.data?.message || "修改群公告失败");
      throw error;
    }
  },

  // 获取群聊邀请列表
  getGroupInvitations: async () => {
    try {
      const res = await axiosInstance.get("/group-chats/invitations");
      set({
        groupInvitations: res.data,
        unreadInvitationsCount: res.data.length
      });
    } catch (error) {
      console.error("获取群聊邀请失败:", error);
    }
  },

  // 邀请好友加入群聊
  inviteToGroup: async (groupId, memberId) => {
    try {
      await axiosInstance.post(`/group-chats/${groupId}/members/${memberId}/invite`);
      toast.success("邀请已发送");
    } catch (error) {
      console.error("邀请好友失败:", error);
    }
  },

  // 接受群聊邀请
  acceptGroupInvitation: async (groupId) => {
    try {
      const currentUser = useAuthStore.getState().authUser._id;
      console.log(currentUser);
      const response = await axiosInstance.post(`/group-chats/${groupId}/members/${currentUser}/accept`);
      set(state => ({
        groupInvitations: state.groupInvitations.filter(inv => inv.groupId._id !== groupId)
      }));
      const { getGroupChats } = get();

      // 获取并更新群聊列表
      await getGroupChats();

      console.log("群聊邀请已接受:", response.data);
      return response.data; // 返回接受邀请后的数据，可以是群聊信息或者其他
    } catch (error) {
      console.error("接受群聊邀请失败:", error);
      throw error;
    }
  },

  // 拒绝群聊邀请
  rejectGroupInvitation: async (groupId) => {
    try {
      const currentUser = useAuthStore.getState().authUser._id;
      const response = await axiosInstance.post(`/group-chats/${groupId}/members/${currentUser}/reject`);
      set(state => ({
        groupInvitations: state.groupInvitations.filter(inv => inv.groupId._id !== groupId)
      }));
      console.log("群聊邀请已拒绝:", response.data);
      return response.data; // 返回拒绝邀请后的数据
    } catch (error) {
      console.error("拒绝群聊邀请失败:", error);
      throw error;
    }
  },

  // 踢出群成员
  removeMember: async (groupId, memberId) => {
    try {
      const response = await axiosInstance.delete(`/group-chats/${groupId}/members/${memberId}`);

      // 更新当前选中的群组信息
      set(state => {
        // 防止 selectedGroup 或 members 为 undefined
        const updatedMembers = state.selectedGroup?.members?.filter(member => member._id !== memberId) || [];

        return {
          selectedGroup: {
            ...state.selectedGroup,
            members: updatedMembers
          }
        };
      });

      console.log("群成员已被踢出:", response.data);
      return response.data; // 返回踢出成员后的数据
    } catch (error) {
      console.error("踢出群成员失败:", error);
      throw error;
    }
  },

  // --- Socket Event Handlers (供 AuthStore 调用) ---
  handleNewMessage: (newMessage) => {
    const { selectedUser, messages, updateUnreadCount } = get();
    const currentUser = useAuthStore.getState().authUser;
    console.log("ChatStore: Handling newMessage", newMessage);
    if (!currentUser) return; // 安全检查

    // 如果消息是发给当前用户的
    if (newMessage.receiverId === currentUser._id) {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        // 当前聊天窗口，直接添加消息
        set({ messages: [...messages, newMessage] });
      } else {
        // 非当前聊天窗口，更新未读计数
        updateUnreadCount('user', newMessage.senderId);
        toast(`${newMessage.senderFullName || '新消息'}`, { icon: '💬' }); // 可选：通知
      }
    } else if (newMessage.senderId === currentUser._id && selectedUser && newMessage.receiverId === selectedUser._id) {
       // 自己发送的消息，更新到当前聊天窗口
       set({ messages: [...messages, newMessage] });
    }
  },

  handleNewGroupMessage: ({ message, groupId }) => {
    const { selectedGroup, messages, groupChats, updateUnreadCount } = get();
    console.log("ChatStore: Handling newGroupMessage", { message, groupId });

    // 更新消息列表 (如果当前正打开该群组)
    if (selectedGroup && groupId === selectedGroup._id) {
      set({ messages: [...messages, message] });
    } else {
      updateUnreadCount('group', groupId);
      toast(`群聊 ${message.groupName || '新消息'}`, { icon: '👥' }); // 可选：通知
    }

    // 更新群聊列表中的最新消息预览
    const updatedGroupChats = groupChats.map(group => {
      if (group._id === groupId) {
        return {
          ...group,
          lastMessage: {
            content: message.text || (message.image ? '[图片]' : '...'),
            sender: message.senderId.fullName,
            timestamp: message.createdAt
          }
        };
      }
      return group;
    });
    set({ groupChats: updatedGroupChats });
  },

  handleBotStreamResponse: (data) => {
    const { messages } = get();
    console.log("ChatStore: Handling botStreamResponse", data);
    if (data.type === 'chunk') {
      const updatedMessages = messages.map(msg =>
        msg._id === data.messageId ? { ...msg, text: (msg.text || '') + (data.content || '') } : msg
      );
      set({ messages: updatedMessages });
    } else if (data.type === 'end') {
      const updatedMessages = messages.map(msg =>
        msg._id === data.messageId ? { ...msg, text: data.fullResponse || msg.text } : msg
      );
      set({ messages: updatedMessages });
    } else if (data.type === 'error') {
      const updatedMessages = messages.map(msg =>
        msg._id === data.messageId ? { ...msg, text: data.error, error: true } : msg
      );
      set({ messages: updatedMessages });
      toast.error(data.error);
    }
  },

  handleNewGroupCreated: (newGroup) => {
    const { groupChats } = get();
    const currentUser = useAuthStore.getState().authUser;
    console.log("ChatStore: Handling newGroupCreated", newGroup);

    if (!currentUser || !newGroup || !newGroup.admin) {
        console.error("Invalid data for newGroupCreated handler");
        return;
    }

    // 检查是否已存在该群组 (避免重复添加)
    const existingGroup = groupChats.find(group => group._id === newGroup._id);
    if (existingGroup) {
        console.log("Group already exists, skipping addition.");
        return;
    }

    // 只有当当前用户是群成员之一（且不是创建者自己，因为创建者本地已添加）时，才添加
    // 后端逻辑应该保证只向非创建者的成员发送此事件
    if (newGroup.members.some(member => member._id === currentUser._id) && newGroup.admin._id !== currentUser._id) {
        console.log("Adding new group to list for member.");
        set({ groupChats: [...groupChats, newGroup] });
        toast.success(`你被邀请加入群组: ${newGroup.name}`);
    } else {
        console.log("Skipping group add (either creator or not a member)");
    }
  },

  handleGroupInvitation: (data) => {
    console.log("ChatStore: Handling groupInvitation", data);
    set(state => ({
      groupInvitations: [...state.groupInvitations, data],
      unreadInvitationsCount: state.unreadInvitationsCount + 1
    }));
    toast.success(`${data.inviterName} 邀请你加入群聊 "${data.groupName}"`);
  },

  handleRemovedFromGroup: (data) => {
    const { selectedGroup, getGroupChats } = get();
    console.log("ChatStore: Handling removedFromGroup", data);
    if (selectedGroup?._id === data.groupId) {
      get().resetSelection(); // 如果当前正在看这个群，则清空选择
    }
    getGroupChats(); // 重新获取群聊列表
    toast.error(`你已被移出群聊 "${data.groupName}"`);
  },

  handleMemberRemoved: (data) => {
    console.log("ChatStore: Handling memberRemoved", data);
    const updateGroup = (group) => {
      if (group._id === data.groupId) {
        return {
          ...group,
          members: group.members.filter(member => member._id !== data.removedMemberId)
        };
      }
      return group;
    };
    set(state => ({
      groupChats: state.groupChats.map(updateGroup),
      selectedGroup: state.selectedGroup?._id === data.groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
  },

  handleMemberJoinedGroup: (data) => {
    console.log("ChatStore: Handling memberJoinedGroup", data);
    const updateGroup = (group) => {
        if (group._id === data.groupId) {
            if (!group.members.some(m => m._id === data.newMember._id)) {
                return {
                    ...group,
                    members: [...group.members, data.newMember]
                };
            }
        }
        return group;
    };
    set(state => ({
        groupChats: state.groupChats.map(updateGroup),
        selectedGroup: state.selectedGroup?._id === data.groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
  },

  handleMemberLeftGroup: ({ groupId, userId, updatedGroup }) => {
    const { selectedGroup } = get();
    console.log("ChatStore: Handling memberLeftGroup", { groupId, userId });
    const updatedGroupChats = get().groupChats.map(group =>
      group._id === groupId ? updatedGroup : group
    );
    set({ groupChats: updatedGroupChats });
    if (selectedGroup?._id === groupId) {
      set({ selectedGroup: updatedGroup });
    }
  },

  handleGroupDissolved: ({ groupId, groupName }) => {
    const { selectedGroup } = get();
    console.log("ChatStore: Handling groupDissolved", groupId);
    const updatedGroupChats = get().groupChats.filter(group => group._id !== groupId);
    set({ groupChats: updatedGroupChats });
    if (selectedGroup?._id === groupId) {
      get().resetSelection();
    }
    toast.success(`群聊 "${groupName}" 已被解散`);
  },

  handleGroupProfileUpdated: ({ groupId, profilePic }) => {
    console.log("ChatStore: Handling groupProfileUpdated", { groupId, profilePic });
    const updateGroup = (group) => group._id === groupId ? { ...group, profilePic } : group;
    set(state => ({
      groupChats: state.groupChats.map(updateGroup),
      selectedGroup: state.selectedGroup?._id === groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
  },

  handleAnnouncementUpdated: ({ groupId, announcement }) => {
    const { selectedGroup } = get();
    console.log("ChatStore: Handling announcementUpdated", { groupId, announcement });
    const updateGroup = (group) => {
      if (group._id === groupId) {
        const existingAnnouncements = group.announcements || [];
        return {
          ...group,
          announcements: [announcement, ...existingAnnouncements.filter(a => a._id !== announcement._id)]
        };
      }
      return group;
    };
    set(state => ({
      groupChats: state.groupChats.map(updateGroup),
      selectedGroup: state.selectedGroup?._id === groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
    if (selectedGroup?._id === groupId) {
      toast.success("新的群公告已发布");
    }
  },

  handleAnnouncementDeleted: ({ groupId, announcementId }) => {
    const { selectedGroup } = get();
    console.log("ChatStore: Handling announcementDeleted", { groupId, announcementId });
    const updateGroup = (group) => {
      if (group._id === groupId) {
        return {
          ...group,
          announcements: (group.announcements || []).filter(a => a._id !== announcementId)
        };
      }
      return group;
    };
    set(state => ({
      groupChats: state.groupChats.map(updateGroup),
      selectedGroup: state.selectedGroup?._id === groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
    if (selectedGroup?._id === groupId) {
      toast.success("群公告已被删除");
    }
  },

  handleAnnouncementEdited: ({ groupId, announcement }) => {
    const { selectedGroup } = get();
    console.log("ChatStore: Handling announcementEdited", { groupId, announcement });
    const updateGroup = (group) => {
      if (group._id === groupId) {
        return {
          ...group,
          announcements: (group.announcements || []).map(a => a._id === announcement._id ? announcement : a)
        };
      }
      return group;
    };
    set(state => ({
      groupChats: state.groupChats.map(updateGroup),
      selectedGroup: state.selectedGroup?._id === groupId ? updateGroup(state.selectedGroup) : state.selectedGroup
    }));
    if (selectedGroup?._id === groupId) {
      toast.success("群公告已更新");
    }
  },

})));

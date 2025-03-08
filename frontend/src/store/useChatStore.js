import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useFriendStore } from "./useFriendStore";

export const useChatStore = create((set, get) => ({
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

  // 初始化Socket连接和订阅事件
  initializeSocketConnection: () => {
    console.log("Initializing socket connection from useChatStore");
    const authState = useAuthStore.getState();
    const { authUser, socket, connectSocket } = authState;
    const friendState=useFriendStore.getState();
    const {subscribeToFriendEvents} = friendState;

    
    if (authUser && !socket) {
      console.log("Connecting socket from useChatStore，从usechat开始连接");
      connectSocket();
    }
    
    if (authUser && socket) {
      console.log("Subscribing to socket events，监听消息事件");
      get().subscribeToMessages();
      get().subscribeToGroupEvents();
      subscribeToFriendEvents();

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
        set({
          messages: [...messages, newMessage]
        });

        response = await axiosInstance.post("/ai-bot/send", {
          message: messageData.text
        });

        // AI机器人的响应包含用户消息和机器人消息
        set({
          messages: [...messages, response.data.userMessage, response.data.botMessage]
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

  subscribeToMessages: () => {
    const { selectedUser, updateUnreadCount } = get();
    const socket = useAuthStore.getState().socket;
    const currentUser = useAuthStore.getState().authUser;
    console.log("Subscribing to messages...");

    // 清除所有之前的监听器
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newGroupCreated");
    socket.off("memberLeftGroup");
    socket.off("groupDissolved");
    socket.off("announcementUpdated");
    socket.off("groupProfileUpdated");

    // 监听群成员退出
    socket.on("memberLeftGroup", ({ groupId, userId, updatedGroup }) => {
      console.log("群成员退出:", { groupId, userId });
      const { groupChats, selectedGroup } = get();

      // 更新群组列表中的群组信息
      const updatedGroupChats = groupChats.map(group =>
        group._id === groupId ? updatedGroup : group
      );

      set({ groupChats: updatedGroupChats });

      // 如果当前正在查看这个群组，更新选中的群组信息
      if (selectedGroup?._id === groupId) {
        set({ selectedGroup: updatedGroup });
        toast.success(`群成员已退出群聊`);
      }
    });

    // 监听群组解散
    socket.on("groupDissolved", ({ groupId, groupName }) => {
      console.log("群组被解散:", groupId);
      const { groupChats, selectedGroup } = get();

      // 从群组列表中移除该群组
      const updatedGroupChats = groupChats.filter(group => group._id !== groupId);

      set({ groupChats: updatedGroupChats });

      // 如果当前正在查看这个群组，清除选中状态
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: null,
          messages: []
        });
      }
      toast.success(`群聊 "${groupName}" 已被解散`);

    });

    // 监听新群组创建
    socket.on("newGroupCreated", (newGroup) => {
      try {
        console.log("收到新群组创建通知:", newGroup);
        console.log("当前用户:", currentUser);
        const { groupChats } = get();

        // 安全检查：确保 newGroup 和必要的属性存在
        if (!newGroup || !newGroup.admin || !newGroup._id) {
          console.error("收到的群组数据无效:", newGroup);
          return;
        }

        // 检查是否是创建者
        const isAdmin = newGroup.admin._id === currentUser._id;
        console.log("是否是群组创建者:", isAdmin);

        // 如果不是创建者，且群组不存在，则添加
        if (!isAdmin) {
          const existingGroup = groupChats.find(group => group._id === newGroup._id);
          if (!existingGroup) {
            console.log("添加新群组到列表");
            set({ groupChats: [...groupChats, newGroup] });
            toast.success(`你被邀请加入群组: ${newGroup.name}`);
          } else {
            console.log("群组已存在，跳过添加");
          }
        } else {
          console.log("是群组创建者，跳过添加");
        }
      } catch (error) {
        console.error("处理新群组通知时出错:", error);
      }
    });

    // 监听新私聊消息
    socket.on("newMessage", (newMessage) => {
      const { messages } = get();
      console.log("收到新消息:", newMessage);

      // 如果消息是发给当前用户的
      if (newMessage.receiverId === currentUser._id) {
        // 如果是当前选中的用户发来的消息
        if (selectedUser && newMessage.senderId === selectedUser._id) {
          set({ messages: [...messages, newMessage] });
        } else {
          // 如果不是当前选中的用户发来的消息，更新未读计数
          console.log("更新未读消息计数，发送者:", newMessage.senderId);
          updateUnreadCount('user', newMessage.senderId);
        }
      }
    });

    // 监听新群聊消息
    socket.on("newGroupMessage", ({ message, groupId }) => {
      const { messages, selectedGroup, groupChats } = get();
      console.log("收到新群聊消息:", message);

      // 更新消息列表
      if (selectedGroup && groupId === selectedGroup._id) {
        set({ messages: [...messages, message] });
      } else {
        updateUnreadCount('group', groupId);
      }

      // 更新群聊列表中的最新消息
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            lastMessage: {
              content: message.text,
              sender: message.senderId.fullName,
              timestamp: message.createdAt
            }
          };
        }
        return group;
      });
      set({ groupChats: updatedGroupChats });
    });

    // 监听群公告更新
    socket.on("announcementUpdated", ({ groupId, announcement }) => {
      const { groupChats, selectedGroup } = get();
      console.log("群公告已更新:", { groupId, announcement });

      // 更新群组列表中的公告
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            announcement
          };
        }
        return group;
      });

      set({ groupChats: updatedGroupChats });

      // 如果当前正在查看这个群组，更新选中的群组
      if (selectedGroup?._id === groupId) {
      set({
          selectedGroup: {
            ...selectedGroup,
            announcement
          }
        });
        toast.success("群公告已更新");
      }
    });

    // 监听群头像更新
    socket.on("groupProfileUpdated", ({ groupId, profilePic }) => {
      const { groupChats, selectedGroup } = get();
      console.log("群头像已更新:", { groupId, profilePic });

      // 更新群组列表中的头像
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            profilePic
          };
        }
        return group;
      });

      set({ groupChats: updatedGroupChats });

      // 如果当前正在查看这个群组，更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            profilePic
          }
        });
      }

    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("newGroupCreated");
    socket.off("groupProfileUpdated");
    socket.off("announcementUpdated");
    socket.off("memberLeftGroup");
    socket.off("groupDissolved");
    // socket.on("newMessage");//首次进来发消息（群聊私聊）看到了，
    // socket.on("newGroupMessage");//首次进来发消息（群聊私聊）看到了，
    // socket.on("newGroupCreated");//新群创建看到了
    // socket.on("memberLeftGroup");//成员离开看见了
    // socket.on("groupDissolved");//解散看见了
    // socket.on("announcementUpdated");//群公告更新看见了
    // socket.on("groupProfileUpdated");//群头像更新看到了

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
      const response = await axiosInstance.put(
        `/group-chats/${groupId}/announcement`,
        { content }
      );

      // 更新本地群组数据
      const { groupChats, selectedGroup } = get();
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            announcement: response.data
          };
        }
        return group;
      });

      // 如果当前正在查看这个群组，也更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            announcement: response.data
          }
        });
      }

      set({ groupChats: updatedGroupChats });
      toast.success("群公告已更新");
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error(error.response?.data?.message || "更新群公告失败");
      throw error;
    }
  },
  //获取群公告
  getAnnouncement: async (groupId) => {
    try {
      const response = await axiosInstance.get(
        `/group-chats/${groupId}/announcement`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting announcement:", error);
      toast.error(error.response?.data?.message || "获取群公告失败");
      throw error;
    }
  },
  //更新群公告
  updateGroupProfilePic: async (groupId, image) => {
    try {
      set({ isUpdatingGroupProfilePic: true });
      const response = await axiosInstance.put(
        `/group-chats/${groupId}/profile-pic`,
        { image }
      );

      // 更新本地群组数据
      const { groupChats, selectedGroup } = get();
      const updatedGroupChats = groupChats.map(group => {
        if (group._id === groupId) {
          return {
            ...group,
            profilePic: response.data.profilePic
          };
        }
        return group;
      });

      // 如果当前正在查看这个群组，也更新选中的群组
      if (selectedGroup?._id === groupId) {
        set({
          selectedGroup: {
            ...selectedGroup,
            profilePic: response.data.profilePic
          }
        });
      }

      set({ groupChats: updatedGroupChats });
      set({ isUpdatingGroupProfilePic: false });
      toast.success("群头像已更新");
    } catch (error) {
      console.error("Error updating group profile pic:", error);
      toast.error(error.response?.data?.message || "更新群头像失败");
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
  inviteToGroup: async (groupId,memberId) => {
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
    console.log(currentUser)
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


  // 订阅群组相关的socket事件
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    console.log("Subscribing to group events...");
    // 监听群聊邀请
    socket.on("groupInvitation", (data) => {
      console.log("收到新的群聊邀请:", data);
      set(state => ({
        groupInvitations: [...state.groupInvitations, data],
        unreadInvitationsCount: state.unreadInvitationsCount + 1
      }));
      toast.success(`${data.inviterName} 邀请你加入群聊 "${data.groupName}"`);
    });
    
    // 监听被踢出群聊
    socket.on("removedFromGroup", (data) => {
      const { selectedGroup, setSelectedGroup, getGroupChats } = get();
      console.log("收到被踢出群聊事件:", data);
      // 如果当前正在查看被踢出的群聊，则关闭聊天
      if (selectedGroup?._id === data.groupId) {
        setSelectedGroup(null);
      }
      
      // 更新群聊列表
      getGroupChats();
      
      toast.error(`你已被移出群聊 "${data.groupName}"`);
    });

    // 监听群成员被踢出
    socket.on("memberRemoved", (data) => {
      const { selectedGroup } = get();
      console.log("收到群成员被踢出事件:", data);
      if (selectedGroup?._id === data.groupId) {
        // 更新当前群组的成员列表
        set(state => ({
          selectedGroup: {
            ...state.selectedGroup,
            members: state.selectedGroup.members.filter(
              member => member._id !== data.removedMemberId
            )
          }
        }));
      }
      else{
        set(state=>({
          groupChats:state.groupChats.map(group=>{
            if(group._id===data.groupId)
            {
              return {
                ...group,
                members:group.members.filter(member=>member._id!==data.removedMemberId)
              }
            }
          })
        }))
      }

    });

    // 监听新成员加入
    socket.on("memberJoinedGroup", (data) => {
      const { selectedGroup } = get();
      console.log("收到新成员加入群聊事件:", data);
      if (selectedGroup?._id === data.groupId) {
        // 更新当前群组的成员列表
        set(state => ({
          selectedGroup: {
            ...state.selectedGroup,
            members: [...state.selectedGroup.members, data.newMember]
          }
        }));
      }
      else{
        set(state=>({
          groupChats:state.groupChats.map(group=>{
            if(group._id===data.groupId)
            {
              return {
                ...group,
                members:[...group.members,data.newMember]
              }
            }
          })
        }))
      }
    });
  },

  // 取消订阅群组事件
  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("groupInvitation");
    socket.off("removedFromGroup");
    socket.off("memberRemoved");
    socket.off("memberJoinedGroup");
  },
}));

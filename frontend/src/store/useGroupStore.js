// import { create } from "zustand";
// import { useAuthStore } from "./useAuthStore";
// import { axiosInstance } from "../lib/axios";
// import toast from "react-hot-toast";

// export const useGroupStore = create((set, get) => ({
//   groupInvitations: [],
//   unreadInvitationsCount: 0,
//   selectedGroup: null,
//   isLoading: false,

//   // 重置未读邀请计数
//   resetUnreadInvitationsCount: () => {
//     set({ unreadInvitationsCount: 0 });
//   },

//   // 获取群聊邀请列表
//   getGroupInvitations: async () => {
//     try {
//       const res = await axiosInstance.get("/:groupid/invitations");
//       set({ 
//         groupInvitations: res.data,
//         unreadInvitationsCount: res.data.length 
//       });
//     } catch (error) {
//       console.error("获取群聊邀请失败:", error);
//     }
//   },

//   // 邀请好友加入群聊
//   inviteToGroup: async () => {
//     try {
//       await axiosInstance.post("/:groupId/members/:memberId/invite");
//       toast.success("邀请已发送");
//     } catch (error) {
//         console.error("邀请好友失败:", error);
//     }
//   },

//   // 接受群聊邀请
//   acceptGroupInvitation: async (invitationId) => {
//     try {
//       const res = await axiosInstance.post(`/group-chats/invitations/${invitationId}/accept`);
//       set(state => ({
//         groupInvitations: state.groupInvitations.filter(inv => inv._id !== invitationId)
//       }));
//       return res.data;
//     } catch (error) {
//         console.error("接受邀请失败:", error);
//     }
//   },

//   // 拒绝群聊邀请
//   rejectGroupInvitation: async (invitationId) => {
//     try {
//       await axiosInstance.post(`/group-chats/invitations/${invitationId}/reject`);
//       set(state => ({
//         groupInvitations: state.groupInvitations.filter(inv => inv._id !== invitationId)
//       }));
//     } catch (error) {
//         console.error("接受邀请失败:", error);
//     }
//   },

//   // 订阅群组相关的socket事件
//   subscribeToGroupEvents: () => {
//     const socket = useAuthStore.getState().socket;
//     if (!socket) return;

//     // 监听新的群聊邀请
//     socket.on("groupInvitation", (data) => {
//       set(state => ({
//         groupInvitations: [...state.groupInvitations, data],
//         unreadInvitationsCount: state.unreadInvitationsCount + 1
//       }));
//       toast.success(`${data.inviterName} 邀请你加入群聊 "${data.groupName}"`);
//     });

//     // 监听被踢出群聊
//     socket.on("removedFromGroup", (data) => {
//       const { selectedGroup } = get();
//       if (selectedGroup?._id === data.groupId) {
//         set({ selectedGroup: null });
//       }
//       toast.error(`你已被移出群聊 "${data.groupName}"`);
//     });

//     // 监听群成员被踢出
//     socket.on("memberRemoved", (data) => {
//       const { selectedGroup } = get();
//       if (selectedGroup?._id === data.groupId) {
//         set(state => ({
//           selectedGroup: {
//             ...state.selectedGroup,
//             members: state.selectedGroup.members.filter(
//               member => member._id !== data.removedMemberId
//             )
//           }
//         }));
//       }
//     });

//     // 监听新成员加入
//     socket.on("memberJoinedGroup", (data) => {
//       const { selectedGroup } = get();
//       if (selectedGroup?._id === data.groupId) {
//         set(state => ({
//           selectedGroup: {
//             ...state.selectedGroup,
//             members: [...state.selectedGroup.members, data.newMember]
//           }
//         }));
//       }
//     });
//   },

//   // 取消订阅群组事件
//   unsubscribeFromGroupEvents: () => {
//     const socket = useAuthStore.getState().socket;
//     if (!socket) return;

//     socket.off("groupInvitation");
//     socket.off("removedFromGroup");
//     socket.off("memberRemoved");
//     socket.off("memberJoinedGroup");
//   },
// }));


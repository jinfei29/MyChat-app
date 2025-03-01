// import { useState } from "react";
// import { X, Check, X as XIcon } from "lucide-react";
// import { useGroupStore } from "../store/useGroupStore";
// import { toast } from "react-hot-toast";

// const GroupInvitationsModal = ({ isOpen, onClose }) => {
//   const { 
//     groupInvitations, 
//     acceptGroupInvitation, 
//     rejectGroupInvitation, 
//     resetUnreadInvitationsCount 
//   } = useGroupStore();
//   const [isLoading, setIsLoading] = useState(false);

//   if (!isOpen) return null;

//   const handleAcceptInvitation = async (invitationId) => {
//     try {
//       setIsLoading(true);
//       await acceptGroupInvitation(invitationId);
//       toast.success("已加入群聊");
//     } catch (error) {
//       toast.error(error.response?.data?.error || "操作失败");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleRejectInvitation = async (invitationId) => {
//     try {
//       setIsLoading(true);
//       await rejectGroupInvitation(invitationId);
//       toast.success("已拒绝群聊邀请");
//     } catch (error) {
//       toast.error(error.response?.data?.error || "操作失败");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//       <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-medium">群聊邀请</h2>
//           <button onClick={onClose} className="btn btn-ghost btn-sm">
//             <X className="size-5" />
//           </button>
//         </div>

//         <div className="space-y-4">
//           {groupInvitations.length === 0 ? (
//             <div className="text-center py-8 text-base-content/70">
//               暂无群聊邀请
//             </div>
//           ) : (
//             groupInvitations.map((invitation) => (
//               <div
//                 key={invitation._id}
//                 className="flex items-center justify-between p-3 bg-base-300 rounded-lg"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white">
//                     {invitation.group.name[0]}
//                   </div>
//                   <div>
//                     <h3 className="font-medium">{invitation.group.name}</h3>
//                     <p className="text-sm text-base-content/70">
//                       来自: {invitation.inviter.fullName}
//                     </p>
//                   </div>
//                 </div>
//                 <div className="flex gap-2">
//                   <button
//                     onClick={() => handleAcceptInvitation(invitation.groupId._id, invitation.inviteeId)}
//                     className="btn btn-success btn-sm"
//                     disabled={isLoading}
//                   >
//                     <Check className="size-4" />
//                   </button>
//                   <button
//                     onClick={() => handleRejectInvitation(invitation.groupId._id, invitation.inviteeId)}
//                     className="btn btn-error btn-sm"
//                     disabled={isLoading}
//                   >
//                     <XIcon className="size-4" />
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GroupInvitationsModal; 
 
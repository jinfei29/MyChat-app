import { useState } from "react";
import { X, Check, X as XIcon } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
const FriendRequestsModal = ({ isOpen, onClose }) => {
  const { 
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    resetUnreadRequestsCount,   
    getFriendRequests 
  } = useFriendStore();

  const { 
    acceptGroupInvitation, 
    rejectGroupInvitation,
    getGroupInvitations, 
    groupInvitations 
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(false);


  
  useEffect(() => {
    if (isOpen) {
      getFriendRequests();
      getGroupInvitations();
      console.log(groupInvitations,friendRequests)
    }
  }, [getFriendRequests, getGroupInvitations, isOpen, resetUnreadRequestsCount]);

  const handleRejectFriendRequest = async (requestId) => {
    try {
      setIsLoading(true);
      await rejectFriendRequest(requestId);
      toast.success("已拒绝好友申请");
    } catch (error) {
      toast.error(error.response?.data?.error || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptGroupInvitation = async (groupId) => {
    try {
      setIsLoading(true);
      await acceptGroupInvitation(groupId);
      toast.success("已加入群聊");
    } catch (error) {
      toast.error(error.response?.data?.error || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectGroupInvitation = async (groupId) => {
    try {
      setIsLoading(true);
      await rejectGroupInvitation(groupId);
      toast.success("已拒绝群聊邀请");
    } catch (error) {
      toast.error(error.response?.data?.error || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">好友申请与群聊邀请</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {friendRequests.length === 0 && groupInvitations.length === 0 ? (
            <div className="text-center py-8 text-base-content/70">
              暂无新的申请或邀请
            </div>
          ) : (
            <>
              {/* 好友申请列表 */}
              {friendRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-3 bg-base-300 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={request.user1.profilePic || "/avatar.png"}
                      alt={request.user1.fullName}
                      className="size-10 rounded-full"
                    />
                    <div>
                      <h3 className="font-medium">{request.user1.fullName}</h3>
                      <p className="text-sm text-base-content/70">
                        {request.user1.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(request._id)}
                      className="btn btn-success btn-sm"
                      disabled={isLoading}
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => handleRejectFriendRequest(request._id)}
                      className="btn btn-error btn-sm"
                      disabled={isLoading}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* 群聊邀请列表 */}
              {groupInvitations.map((invitation) => (
                <div
                  key={invitation._id}
                  className="flex items-center justify-between p-3 bg-base-300 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full overflow-hidden">
                      {invitation.groupId.profilePic ? (
                        <img
                          src={invitation.groupId.profilePic}
                          alt={invitation.groupId.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center text-white">
                          {invitation.groupId.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{invitation.groupId.name}</h3>
                      <p className="text-sm text-base-content/70">
                        来自: {invitation.inviterId.fullName}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptGroupInvitation(invitation.groupId._id)}
                      className="btn btn-success btn-sm"
                      disabled={isLoading}
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => handleRejectGroupInvitation(invitation.groupId._id)}
                      className="btn btn-error btn-sm"
                      disabled={isLoading}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsModal;
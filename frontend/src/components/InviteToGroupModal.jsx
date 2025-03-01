import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";
import { toast } from "react-hot-toast";

const InviteToGroupModal = ({ isOpen, onClose }) => {
  const { friends } = useFriendStore();
  const { selectedGroup , inviteToGroup } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !selectedGroup) return null;

  // 过滤掉已经在群组中的好友
  const availableFriends = friends.filter(
    friend => !selectedGroup.members.some(member => member._id === friend._id)
  );

  const handleInvite = async (friendId) => {
    try {
      setIsLoading(true);
      await inviteToGroup(selectedGroup._id, friendId);
      toast.success("邀请已发送");
    } catch (error) {
      toast.error(error.response?.data?.error || "邀请失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">邀请好友</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {availableFriends.length === 0 ? (
            <div className="text-center py-8 text-base-content/70">
              没有可邀请的好友
            </div>
          ) : (
            availableFriends.map((friend) => (
              <div
                key={friend._id}
                className="flex items-center justify-between p-3 bg-base-300 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.profilePic || "/avatar.png"}
                    alt={friend.fullName}
                    className="size-10 rounded-full"
                  />
                  <div>
                    <h3 className="font-medium">{friend.fullName}</h3>
                    <p className="text-sm text-base-content/70">{friend.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleInvite(friend._id)}
                  className="btn btn-primary btn-sm gap-2"
                  disabled={isLoading}
                >
                  <UserPlus className="size-4" />
                  邀请
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteToGroupModal; 
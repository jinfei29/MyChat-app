import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useFriendStore } from "../store/useFriendStore";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { friends } = useFriendStore();
  const { createGroupChat } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setIsLoading(true);
    try {
      await createGroupChat({
        name: groupName,
        members: selectedMembers,
      });
      toast.success("群聊创建成功！");
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("创建群聊失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">创建群聊</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="群聊名称"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="input input-bordered w-full mb-4"
            required
          />

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">
              选择好友 ({selectedMembers.length} 已选择)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {friends.filter(friend => !friend.isBot).map((friend) => (
                <label
                  key={friend._id}
                  className="flex items-center gap-2 p-2 hover:bg-base-300 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(friend._id)}
                    onChange={() => toggleMember(friend._id)}
                    className="checkbox checkbox-sm"
                  />
                  <img
                    src={friend.profilePic || "/avatar.png"}
                    alt={friend.fullName}
                    className="size-8 rounded-full"
                  />
                  <span>{friend.fullName}</span>
                </label>
              ))}
              {friends.length === 0 && (
                <div className="text-center py-4 text-base-content/70">
                  暂无好友可选
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading || !groupName.trim() || selectedMembers.length === 0}
          >
            {isLoading ? "创建中..." : "创建群聊"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal; 
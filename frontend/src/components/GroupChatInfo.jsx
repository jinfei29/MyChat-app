import { useRef, useState } from "react";
import { X, Camera, UserPlus, UserMinus } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { toast } from "react-hot-toast";
import InviteToGroupModal from "./InviteToGroupModal";

const GroupChatInfo = ({ isOpen, onClose }) => {
  const { selectedGroup,  updateGroupProfilePic, isUpdatingGroupProfilePic , leaveGroup , removeMember  } = useChatStore();
  const { authUser } = useAuthStore();
  const fileInputRef = useRef(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  if (!isOpen || !selectedGroup || !selectedGroup.admin) return null;

  const handleLeaveGroup = async () => {
    if (window.confirm("确定要退出该群聊吗？")) {
      try {
        await leaveGroup(selectedGroup._id);
        toast.success("已退出群聊");
        onClose();
      } catch (error) {
        console.error("退出群聊失败:", error);
        toast.error("退出群聊失败");
      }
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("确定要将该成员移出群聊吗？")) {
      try {
        await removeMember(selectedGroup._id, memberId);
        toast.success("已将成员移出群聊");
      } catch (error) {
        console.error("移出成员失败:", error);
        toast.error(error.response?.data?.error || "移出成员失败");
      }
    }
  };

  const isAdmin = selectedGroup.admin._id === authUser._id;

  const handleImageClick = () => {
    if (isAdmin) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("图片大小不能超过 5MB");
        return;
      }

      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64Image = reader.result;
          await updateGroupProfilePic(selectedGroup._id, base64Image);
          toast.success("群头像更新成功");
        };
      } catch (error) {
        console.error("更新群头像失败:", error);
        toast.error("更新群头像失败");
      }
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">群聊信息</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className={`size-24 rounded-full overflow-hidden ${isAdmin ? 'cursor-pointer hover:opacity-90' : ''}`}>
                  <img
                    src={selectedGroup.profilePic || "/group-avatar.png"}
                    alt={selectedGroup.name}
                    className={`w-full h-full object-cover ${isUpdatingGroupProfilePic ? 'opacity-50' : ''}`}
                  />
                  {isAdmin && (
                    <div 
                      onClick={handleImageClick}
                      className="absolute bottom-0 right-0 size-8 bg-primary hover:bg-primary-focus rounded-full flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Camera className="size-4 text-white" />
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUpdatingGroupProfilePic}
                  />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium">{selectedGroup.name}</h3>
                <p className="text-base-content/70">
                  {selectedGroup.members.length} 位成员
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">群主</h4>
                {isAdmin && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn btn-primary btn-sm gap-2"
                  >
                    <UserPlus className="size-4" />
                    邀请好友
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-base-300">
                <div className="avatar">
                  <div className="size-10 rounded-full">
                    <img
                      src={selectedGroup.admin.profilePic || "/avatar.png"}
                      alt={selectedGroup.admin.fullName}
                    />
                  </div>
                </div>
                <span>{selectedGroup.admin.fullName}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium mb-2">群成员</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedGroup.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-base-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="size-10 rounded-full">
                          <img
                            src={member.profilePic || "/avatar.png"}
                            alt={member.fullName}
                          />
                        </div>
                      </div>
                      <span>{member.fullName}</span>
                    </div>
                    {isAdmin && member._id !== authUser._id && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="btn btn-ghost btn-sm text-error"
                        title="移出群聊"
                      >
                        <UserMinus className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!isAdmin && (
              <button
                onClick={handleLeaveGroup}
                className="btn btn-error w-full"
              >
                退出群聊
              </button>
            )}
          </div>
        </div>
      </div>

      {showInviteModal && (
        <InviteToGroupModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
};

export default GroupChatInfo; 
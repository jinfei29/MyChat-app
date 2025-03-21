import { Users, X, Settings, Trash2, Megaphone, UserMinus, MoreVertical } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useFriendStore } from "../store/useFriendStore";
import { useState } from "react";
import GroupChatInfo from "./GroupChatInfo";
import GroupAnnouncement from "./GroupAnnouncement";
import CallControls from "./CallControls";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup, dissolveGroup } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const { deleteFriend } = useFriendStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
  };

  const isGroupAdmin = selectedGroup?.admin?._id === authUser?._id;

  const handleDissolveGroup = async () => {
    if (!selectedGroup) return;

    if (window.confirm("确定要解散该群聊吗？此操作不可撤销。")) {
      try {
        await dissolveGroup(selectedGroup._id);
      } catch (error) {
        console.error("解散群聊失败:", error);
      }
    }
  };

  const handleDeleteFriend = async () => {
    if (!selectedUser || selectedUser.isBot) return;
    
    if (window.confirm("确定要删除该好友吗？删除后将无法恢复聊天记录。")) {
      await deleteFriend(selectedUser._id);
      setSelectedUser(null);
    }
  };

  // 如果是群聊
  if (selectedGroup) {
    return (
      <>
        <div className="p-2.5 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="size-10 rounded-full relative">
                  {selectedGroup.profilePic ? (
                    <img
                      src={selectedGroup.profilePic}
                      alt={selectedGroup.name}
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-base-300 flex items-center justify-center">
                      <Users className="size-6" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium">{selectedGroup.name}</h3>
                <p className="text-sm text-base-content/70">
                  {selectedGroup.members.length} 位成员
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
             
              <CallControls userId={selectedGroup._id} isGroupChat={true} />
            
              <button
                onClick={() => setShowAnnouncement(true)}
                className="btn btn-ghost btn-sm"
                title="群公告"
              >
                <Megaphone className="size-5" />
              </button>

              <button
                onClick={() => setShowGroupInfo(true)}
                className="btn btn-ghost btn-sm"
                title="群聊设置"
              >
                <Settings className="size-5" />
              </button>

              <button onClick={handleClose} className="btn btn-ghost btn-sm">
                <X className="size-5" />
              </button>

              {isGroupAdmin && (
                <button
                  onClick={handleDissolveGroup}
                  className="btn btn-error btn-sm gap-2"
                  title="解散群聊"
                >
                  <Trash2 className="size-4" />
                  解散群聊
                </button>
              )}
            </div>
          </div>
        </div>

        {showGroupInfo && (
          <GroupChatInfo
            isOpen={showGroupInfo}
            onClose={() => setShowGroupInfo(false)}
          />
        )}

        {showAnnouncement && (
          <GroupAnnouncement
            isOpen={showAnnouncement}
            onClose={() => setShowAnnouncement(false)}
          />
        )}
      </>
    );
  }

  // 如果是私聊
  if (selectedUser) {
    return (
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
              </div>
            </div>

            <div>
              <h3 className="font-medium">{selectedUser.fullName}</h3>
              <p className="text-sm text-base-content/70">
                {selectedUser.isBot ? "" : onlineUsers.includes(selectedUser._id) ? "在线" : "离线"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedUser.isBot && (
              <CallControls userId={selectedUser._id} />
            )}
            <button onClick={handleClose} className="btn btn-ghost btn-sm">
              <X className="size-5" />
            </button>

            {selectedUser && !selectedUser.isBot && (
              <button
                onClick={handleDeleteFriend}
                className="btn btn-ghost btn-sm text-error"
                title="删除好友"
              >
                <UserMinus className="size-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ChatHeader;

import { Users, X, Settings, Trash2, Megaphone, UserMinus, MoreVertical } from "lucide-react"; // Added Phone, Video
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useFriendStore } from "../store/useFriendStore";
import { useState, useRef, useEffect } from "react"; // Added useRef, useEffect
import GroupChatInfo from "./GroupChatInfo";
import GroupAnnouncement from "./GroupAnnouncement";
import CallControls from "./CallControls"; // Assuming this handles its own visibility logic or returns null if needed

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup, dissolveGroup } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const { deleteFriend } = useFriendStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false); // State for dropdown
  const menuRef = useRef(null); // Ref for click outside

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
    setShowChatMenu(false); // Close menu if open
  };

  const isGroupAdmin = selectedGroup?.admin?._id === authUser?._id;

  const handleDissolveGroup = async () => {
    setShowChatMenu(false); // Close menu first
    if (!selectedGroup) return;
    if (window.confirm("确定要解散该群聊吗？此操作不可撤销。")) {
      try {
        await dissolveGroup(selectedGroup._id);
        // No need to setSelectedGroup(null) here, handled by store potentially
      } catch (error) {
        console.error("解散群聊失败:", error);
        // Optionally show an error toast to the user
      }
    }
  };

  const handleDeleteFriend = async () => {
    setShowChatMenu(false); // Close menu first
    if (!selectedUser || selectedUser.isBot) return;
    if (window.confirm("确定要删除该好友吗？删除后将无法恢复聊天记录。")) {
       try {
           await deleteFriend(selectedUser._id);
           setSelectedUser(null); // Close chat after successful deletion
       } catch (error) {
           console.error("删除好友失败:", error);
           // Optionally show an error toast
       }
    }
  };

  const handleOpenGroupInfo = () => {
    setShowGroupInfo(true);
    setShowChatMenu(false);
  };

  const handleOpenAnnouncement = () => {
    setShowAnnouncement(true);
    setShowChatMenu(false);
  };

  // --- Render Logic ---

  const renderCoreInfo = () => (
    <div className="flex items-center gap-3 flex-1 min-w-0"> {/* Added flex-1 min-w-0 */}
      <div className="avatar flex-shrink-0"> {/* Added flex-shrink-0 */}
        <div className="size-10 rounded-full relative">
          {selectedGroup ? (
            selectedGroup.profilePic ? (
              <img src={selectedGroup.profilePic} alt={selectedGroup.name} className="object-cover w-full h-full" />
            ) : (
              <div className="bg-base-300 flex items-center justify-center w-full h-full rounded-full">
                <Users className="size-6" />
              </div>
            )
          ) : selectedUser ? (
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} className="object-cover w-full h-full" />
          ) : null}
        </div>
      </div>

      <div className="min-w-0"> {/* Added min-w-0 */}
        <h3 className="font-medium truncate">{selectedGroup?.name || selectedUser?.fullName}</h3>
        <p className="text-sm text-base-content/70 truncate">
          {selectedGroup
            ? `${selectedGroup.members.length} 位成员`
            : selectedUser?.isBot
            ? "智能助手"
            : onlineUsers.includes(selectedUser?._id || '') ? "在线" : "离线"}
        </p>
      </div>
    </div>
  );

  // --- Group Chat Actions ---
  const renderGroupActionsLarge = () => (
    <div className="hidden lg:flex items-center gap-1">
      <CallControls userId={selectedGroup?._id || ''} isGroupChat={true} />
      <button onClick={handleOpenAnnouncement} className="btn btn-ghost btn-sm" title="群公告"><Megaphone className="size-5" /></button>
      <button onClick={handleOpenGroupInfo} className="btn btn-ghost btn-sm" title="群聊设置"><Settings className="size-5" /></button>
      {isGroupAdmin && (
        <button onClick={handleDissolveGroup} className="btn btn-ghost btn-sm text-error" title="解散群聊"><Trash2 className="size-5" /></button>
      )}
       <button onClick={handleClose} className="btn btn-ghost btn-sm" title="关闭聊天"><X className="size-5" /></button>
    </div>
  );

  const renderGroupActionsSmall = () => (
    <div className="lg:hidden relative" ref={menuRef}>
      <button onClick={() => setShowChatMenu(!showChatMenu)} className="btn btn-ghost btn-sm"><MoreVertical className="size-5" /></button>
      {showChatMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-base-100 rounded-md shadow-lg border border-base-300 py-1 z-50">
          <div className="px-4 py-2 text-sm text-left"><CallControls userId={selectedGroup?._id || ''} isGroupChat={true} dropdownMode={true} /></div>
          <div className="divider my-1"></div>
          <button onClick={handleOpenAnnouncement} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><Megaphone className="size-4" /><span>群公告</span></button>
          <button onClick={handleOpenGroupInfo} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><Settings className="size-4" /><span>群聊设置</span></button>
          {isGroupAdmin && (<button onClick={handleDissolveGroup} className="w-full px-4 py-2 text-sm text-left hover:bg-error hover:text-error-content flex items-center gap-2 text-error"><Trash2 className="size-4" /><span>解散群聊</span></button>)}
          <div className="divider my-1"></div>
          <button onClick={handleClose} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><X className="size-4" /><span>关闭聊天</span></button>
        </div>
      )}
    </div>
  );

  // --- User Chat Actions ---
  const renderUserActionsLarge = () => (
     <div className="hidden lg:flex items-center gap-1">
       {!selectedUser?.isBot && <CallControls userId={selectedUser?._id || ''} />}
       {!selectedUser?.isBot && (
         <button onClick={handleDeleteFriend} className="btn btn-ghost btn-sm text-error" title="删除好友"><UserMinus className="size-5" /></button>
       )}
       <button onClick={handleClose} className="btn btn-ghost btn-sm" title="关闭聊天"><X className="size-5" /></button>
     </div>
   );

   const renderUserActionsSmall = () => (
     <div className="lg:hidden relative" ref={menuRef}>
       <button onClick={() => setShowChatMenu(!showChatMenu)} className="btn btn-ghost btn-sm"><MoreVertical className="size-5" /></button>
       {showChatMenu && (
         <div className="absolute right-0 top-full mt-2 w-48 bg-base-100 rounded-md shadow-lg border border-base-300 py-1 z-50">
           {!selectedUser?.isBot && (
               <>
                <div className="px-4 py-2 text-sm text-left"><CallControls userId={selectedUser?._id || ''} dropdownMode={true} /></div>
                 <div className="divider my-1"></div>
                 <button onClick={handleDeleteFriend} className="w-full px-4 py-2 text-sm text-left hover:bg-error hover:text-error-content flex items-center gap-2 text-error"><UserMinus className="size-4" /><span>删除好友</span></button>
                 <div className="divider my-1"></div>
               </>
           )}
           <button onClick={handleClose} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><X className="size-4" /><span>关闭聊天</span></button>
         </div>
       )}
     </div>
   );

  // --- Main Component Return ---
  if (!selectedGroup && !selectedUser) {
    return null; // Render nothing if no chat is selected
  }

  return (
    <>
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between gap-2"> {/* Added gap-2 */}
          {renderCoreInfo()}

          {/* Actions Section */}
          <div className="flex items-center flex-shrink-0"> {/* Added flex-shrink-0 */}
            {selectedGroup ? (
              <>
                {renderGroupActionsLarge()}
                {renderGroupActionsSmall()}
              </>
            ) : selectedUser ? (
              <>
                {renderUserActionsLarge()}
                {renderUserActionsSmall()}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedGroup && showGroupInfo && (
        <GroupChatInfo isOpen={showGroupInfo} onClose={() => setShowGroupInfo(false)} />
      )}
      {selectedGroup && showAnnouncement && (
        <GroupAnnouncement isOpen={showAnnouncement} onClose={() => setShowAnnouncement(false)} />
      )}
    </>
  );
};

export default ChatHeader;
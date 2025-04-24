import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, MessageSquare, ChevronDown, ChevronUp, UserPlus, Bell, Menu } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import { formatMessageTime } from "../lib/utils";
import AddFriendModal from "./AddFriendModal";
import FriendRequestsModal from "./FriendRequestsModal";

const Sidebar = () => {
  // ... (useState, stores, useEffects remain the same) ...
  const {
    getUsers,
    selectedUser,
    selectedGroup,
    setSelectedUser,
    setSelectedGroup,
    isGroupsLoading,
    unreadMessages,
    getGroupChats,
    groupChats,
    getGroupInvitations,
    unreadInvitationsCount,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const {
    friends,
    getFriendList,
    isLoading: isFriendsLoading,
    getFriendRequests,
    unreadRequestsCount,
  } = useFriendStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false);
  const [showGroups, setShowGroups] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const totalUnreadNotifications = unreadRequestsCount + unreadInvitationsCount;

  useEffect(() => {
    getFriendList();
    getGroupChats();
    getGroupInvitations();
    getFriendRequests();
    getUsers();
  }, [getFriendList, getFriendRequests, getGroupChats, getGroupInvitations, getUsers]);

  // useEffect(() => {
  //   // subscribeToFriendEvents();
  //   // subscribeToUserEvents();
  //   return () => {
  //     unsubscribeFromFriendEvents();
  //     unsubscribeFromUserEvents();
  //   };
  // }, [subscribeToFriendEvents, subscribeToUserEvents, unsubscribeFromFriendEvents, unsubscribeFromUserEvents]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);


  const onlineFriends = friends.filter((friend) => onlineUsers.includes(friend._id));
  const filteredFriends = showOnlineOnly
    ? friends.filter((friend) => onlineUsers.includes(friend._id))
    : friends;

  if (isGroupsLoading || isFriendsLoading) return <SidebarSkeleton />;

  const handleUserSelect = (user) => {
    if (selectedUser?._id === user._id) return;
    setSelectedUser(user);
    setShowMenu(false);
  };

  const handleGroupSelect = async (group) => {
    if (selectedGroup?._id === group._id) return;
    setSelectedGroup(group);
    setShowMenu(false);
  };

  const handleFriendRequestsClick = () => {
    setIsFriendRequestsModalOpen(true);
    setShowMenu(false);
  };

  const handleAddFriendClick = () => {
    setIsAddFriendModalOpen(true);
    setShowMenu(false);
  }

  const handleCreateGroupClick = () => {
    setIsCreateGroupModalOpen(true);
    setShowMenu(false);
  }

  // Function to get sender name (shortened if needed, but likely okay)
  const getSenderName = (sender) => {
     return sender || sender?.username || '用户';
  }

  // Function to get truncated message content
  const getTruncatedContent = (content, maxLength = 10) => { // Reduced maxLength slightly
     if (!content) return '';
     return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
  }


  return (
    <aside className="h-full w-36 lg:w-72 border-r border-base-300 flex flex-col transition-width duration-200 bg-base-100 shrink-0">
      {/* Header (remains the same) */}
      <div className="border-b border-base-300 w-full p-4 lg:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
           <Users className="size-6 flex-shrink-0" />
          <span className="font-medium hidden lg:block truncate">联系人</span>
        </div>
        <div className="flex items-center gap-1 lg:gap-2">
          <div className="hidden lg:flex items-center gap-1">
            <button onClick={handleFriendRequestsClick} className="btn btn-sm btn-ghost relative" title="好友申请">
              <Bell className="size-5" />
              {totalUnreadNotifications > 0 && (<span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{totalUnreadNotifications}</span>)}
            </button>
            <button onClick={handleAddFriendClick} className="btn btn-sm btn-ghost" title="添加好友"><UserPlus className="size-5" /></button>
            <button onClick={handleCreateGroupClick} className="btn btn-sm btn-ghost" title="创建群聊"><Plus className="size-5" /></button>
          </div>
          <div className="lg:hidden relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="btn btn-sm btn-ghost relative" title="菜单">
              <Menu className="size-5" />
              {totalUnreadNotifications > 0 && (<span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{totalUnreadNotifications}</span>)}
            </button>
            {showMenu && (
              <div className="absolute left-0 top-full mt-2 w-40 bg-base-100 rounded-md shadow-lg border border-base-300 py-1 z-50">
                <button onClick={handleFriendRequestsClick} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"> <Bell className="size-4" /> <span>好友申请</span> {totalUnreadNotifications > 0 && (<span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{totalUnreadNotifications}</span>)}</button>
                <button onClick={handleAddFriendClick} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><UserPlus className="size-4" /><span>添加好友</span></button>
                <button onClick={handleCreateGroupClick} className="w-full px-4 py-2 text-sm text-left hover:bg-base-200 flex items-center gap-2"><Plus className="size-4" /><span>创建群聊</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto w-full py-3 space-y-2">
        {/* Groups Section */}
        <div className="px-2 lg:px-3">
          <button onClick={() => setShowGroups(!showGroups)} className="w-full flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="size-5 flex-shrink-0" />
              <span className="font-medium hidden lg:block truncate">群聊</span>
            </div>
            {showGroups ? <ChevronUp className="size-5 flex-shrink-0" /> : <ChevronDown className="size-5 flex-shrink-0" />}
          </button>

          {showGroups && (
            <div className="mt-1 space-y-1">
              {groupChats.length === 0 && (<div className="text-center text-xs lg:text-sm text-zinc-500 py-2 px-2">无群聊</div>)}
              {groupChats.map((group) => {
                const uniqueKey = `group-${group._id}`;
                const unreadCount = unreadMessages.groups[group._id] || 0;
                const lastMsg = group.lastMessage;

                return (
                  <button
                    key={uniqueKey}
                    onClick={() => handleGroupSelect(group)}
                    title={group.name}
                    className={`w-full p-2 flex items-center gap-2 lg:gap-3 rounded-lg hover:bg-base-200 transition-colors relative ${selectedGroup?._id === group._id ? "bg-base-300" : ""}`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="avatar">
                        <div className="size-9 lg:size-10 rounded-full">
                          <img src={group.profilePic || "/group-avatar.jpg"} alt={group.name} className="object-cover" />
                        </div>
                      </div>
                      {/* 头像红点：默认显示，lg屏幕隐藏 */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold ring-1 ring-base-100 lg:hidden">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Text Content Area */}
                    <div className="flex-1 min-w-0 text-left">
                      {/* Group Name (Always Visible) */}
                      <div className="font-medium truncate text-sm lg:text-base">{group.name}</div>

                      {/* --- Last Message SENDER + CONTENT (Small Screens Only) --- */}
                      <div className="lg:hidden text-xs text-zinc-400 truncate">
                        {lastMsg?.content ? (
                          <>
                            {/* Use font-medium for sender name for slight emphasis */}
                            <span className="font-medium">{getSenderName(lastMsg.sender)}:</span>{' '}
                            {getTruncatedContent(lastMsg.content)}
                          </>
                        ) : (
                          <span className="italic text-zinc-500">无消息</span>
                        )}
                      </div>

                      {/* Last Message Snippet WITH SENDER (Large Screens Only) */}
                      <div className="hidden lg:block text-sm text-zinc-400 truncate">
                         {lastMsg?.content ? (
                            <>
                              <span className="font-medium">{getSenderName(lastMsg.sender)}: </span>
                              {/* Use a longer truncation for large screens */}
                              {lastMsg.content.length > 25 ? `${lastMsg.content.slice(0, 25)}...` : lastMsg.content}
                           </>
                         ) : (
                           <span className="italic text-zinc-500">无最近消息</span>
                         )}
                      </div>
                    </div>

                    {/* Timestamp & Badge Stack (Large Screens Only) */}
                    <div className="hidden lg:flex flex-col items-end space-y-1 text-xs text-zinc-400 pl-1">
                      <span>{lastMsg?.timestamp && formatMessageTime(lastMsg.timestamp)}</span>
                      {/* 右侧红点：只在 lg 屏幕显示 */}
                      {unreadCount > 0 && (<span className="bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">{unreadCount}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Friends Section (remains the same) */}
        <div className="px-2 lg:px-3">
          <button onClick={() => setShowUsers(!showUsers)} className="w-full flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="size-5 flex-shrink-0" />
              <span className="font-medium hidden lg:block truncate">好友</span>
            </div>
            {showUsers ? <ChevronUp className="size-5 flex-shrink-0" /> : <ChevronDown className="size-5 flex-shrink-0" />}
          </button>

          {showUsers && (
            <div className="mt-1 space-y-1">
              <div className="px-2 hidden lg:flex items-center justify-between mb-2">
                <label className="cursor-pointer flex items-center gap-2"><input type="checkbox" checked={showOnlineOnly} onChange={(e) => setShowOnlineOnly(e.target.checked)} className="checkbox checkbox-xs checkbox-primary" /><span className="text-xs">只显示在线</span></label>
                <span className="text-xs text-zinc-500">({onlineFriends.length } / {friends.length} 在线)</span>
              </div>
              {filteredFriends.map((friend) => {
                const uniqueKey = `friend-${friend._id}`;
                const isOnline = onlineUsers.includes(friend._id);
                const unreadCount = unreadMessages.users[friend._id] || 0;
                return (
                  <button key={uniqueKey} onClick={() => handleUserSelect(friend)} title={friend.fullName} className={`w-full p-2 flex items-center gap-2 lg:gap-3 rounded-lg hover:bg-base-200 transition-colors relative ${selectedUser?._id === friend._id ? "bg-base-300" : ""}`}>
                    <div className="relative flex-shrink-0">
                      <div className="avatar">
                        <div className={`size-9 lg:size-10 rounded-full ${friend.isBot ? "ring-1 ring-primary" : ""}`}>
                          <img src={friend.profilePic || "/avatar.png"} alt={friend.fullName} className="object-cover" />
                        </div>
                      </div>

                      {/* ✅ 右下角绿色在线点 */}
                      {!friend.isBot && isOnline && (
                        <span className="absolute bottom-2 right-0 size-2.5 bg-green-500 border-2 border-white rounded-full" />
                      )}

                       {/* 头像红点：默认显示，lg屏幕隐藏 */}
                       {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold ring-1 ring-base-100 lg:hidden">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                       )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium truncate text-sm lg:text-base">{friend.fullName} {friend.isBot && (<span className="ml-1.5 text-xs bg-primary/80 text-primary-content px-1 py-0.5 rounded hidden lg:inline-block">AI</span>)}</div>
                      <div className="hidden lg:block text-sm text-zinc-400">{friend.isBot ? "智能助手" : isOnline ? "在线" : "离线"}</div>
                    </div>
                     {/* 右侧红点：只在 lg 屏幕显示 (其容器已有 hidden lg:inline-block) */}
                    {unreadCount > 0 && (<span className="hidden lg:inline-block ml-2 flex-shrink-0 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">{unreadCount}</span>)}
                  </button>
                );
              })}
              {filteredFriends.length === 0 && (<div className="text-center text-xs lg:text-sm text-zinc-500 py-4 px-2">{showOnlineOnly ? "无在线好友" : "无好友"}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* Modals (remain the same) */}
      {isCreateGroupModalOpen && (<CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)}/>)}
      {isAddFriendModalOpen && (<AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)}/>)}
      {isFriendRequestsModalOpen && (<FriendRequestsModal isOpen={isFriendRequestsModalOpen} onClose={() => setIsFriendRequestsModalOpen(false)}/>)}
    </aside>
  );
};

export default Sidebar;
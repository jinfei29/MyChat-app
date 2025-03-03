import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, MessageSquare, ChevronDown, ChevronUp, UserPlus, Bell } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import { formatMessageTime } from "../lib/utils";
import AddFriendModal from "./AddFriendModal";
import FriendRequestsModal from "./FriendRequestsModal";

const Sidebar = () => {
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
    groupInvitations,
    subscribeToGroupEvents,
    unsubscribeFromGroupEvents,
    unreadInvitationsCount,
    subscribeToMessages,
    unsubscribeFromMessages
  } = useChatStore();

  const { onlineUsers, subscribeToUserEvents , unsubscribeFromUserEvents  } = useAuthStore();
  const { 
    friends, 
    getFriendList, 
    isLoading: isFriendsLoading,
    subscribeToFriendEvents,
    unsubscribeFromFriendEvents,
    getFriendRequests,
    friendRequests,
    unreadRequestsCount,
  } = useFriendStore();

  
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    getFriendList();
    getGroupChats();
    getGroupInvitations();
    getFriendRequests();
    getUsers();
    
  }, [getFriendList, getFriendRequests, getGroupChats, getGroupInvitations,getUsers]);

  useEffect(() => {
    subscribeToFriendEvents();
    subscribeToGroupEvents();
    subscribeToMessages();
    subscribeToUserEvents();
    return () => {
      unsubscribeFromMessages();
      unsubscribeFromFriendEvents();
      unsubscribeFromGroupEvents();
      unsubscribeFromUserEvents();
    }
  }, [subscribeToFriendEvents, subscribeToGroupEvents, subscribeToMessages, subscribeToUserEvents, unsubscribeFromFriendEvents, unsubscribeFromGroupEvents, unsubscribeFromMessages, unsubscribeFromUserEvents]);

  const onlineFriends = friends.filter((friend) => onlineUsers.includes(friend._id));
  const filteredFriends = showOnlineOnly
    ? friends.filter((friend) => onlineUsers.includes(friend._id))
    : friends;

  if (isGroupsLoading || isFriendsLoading) return <SidebarSkeleton />;

  const handleUserSelect = (user) => {
    if (selectedUser?._id === user._id) return;
    setSelectedUser(user);
  };

  const handleGroupSelect = async (group) => {
    if (selectedGroup?._id === group._id) return;
    setSelectedGroup(group);
  };
  
  const handleFriendRequestsClick = () => {
    setIsFriendRequestsModalOpen(true);
  };


  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium hidden lg:block">联系人</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFriendRequestsClick}
              className="btn btn-sm btn-ghost relative"
              title="好友申请"
            >
              <Bell className="size-5" />
              {friendRequests.length+groupInvitations.length > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadRequestsCount+unreadInvitationsCount}
                </span>
              )}
            </button>
           
            <button
              onClick={() => setIsAddFriendModalOpen(true)}
              className="btn btn-sm btn-ghost"
              title="添加好友"
            >
              <UserPlus className="size-5" />
            </button>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="btn btn-sm btn-ghost"
              title="创建群聊"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3 space-y-2">
        <div className="px-3">
          <button
            onClick={() => setShowGroups(!showGroups)}
            className="w-full flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              <span className="font-medium">群聊</span>
            </div>
            {showGroups ? (
              <ChevronUp className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </button>
          
          {showGroups && groupChats.length > 0 && (
            <div className="mt-2 space-y-1 pl-2">
              {groupChats.map((group) => {
                const uniqueKey = `group-${group._id}`;
                return (
                  <button
                    key={uniqueKey}
                    onClick={() => handleGroupSelect(group)}
                    className={`
                      w-full p-2 flex items-center gap-3 rounded-lg
                      hover:bg-base-300 transition-colors
                      ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                    `}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <div className="avatar">
                        <div className="size-10 rounded-full">
                            <img
                              src={group.profilePic || "/group-avatar.jpg"}
                              alt={group.name}
                              className="object-cover"
                            />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-left">{group.name}</div>
                      {group.lastMessage && group.lastMessage.content && (
                        <div className="text-sm text-zinc-400 truncate text-left">
                          {group.lastMessage.sender}: {group.lastMessage.content.length > 40 ? `${group.lastMessage.content.slice(0, 40)}...` : group.lastMessage.content}
                        </div>
                      )}
                    </div>   
                    <div className="text-xs text-zinc-400 text-right">
                      {group.lastMessage && group.lastMessage.timestamp && formatMessageTime(group.lastMessage.timestamp)} 
                    </div>
                    {unreadMessages.groups[group._id] > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadMessages.groups[group._id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-3">
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="w-full flex items-center justify-between p-2 hover:bg-base-300 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <span className="font-medium">好友</span>
            </div>
            {showUsers ? (
              <ChevronUp className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </button>

          {showUsers && (
            <div className="mt-2 space-y-1 pl-2">
              <div className="px-2 hidden lg:flex items-center gap-2 mb-2">
                <label className="cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnlineOnly}
                    onChange={(e) => setShowOnlineOnly(e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="text-sm">只显示在线</span>
                </label>
                <span className="text-xs text-zinc-500">
                  ({onlineFriends.length } 在线)
                </span>
              </div>

              {filteredFriends.map((friend) => {
                const uniqueKey = `friend-${friend._id}`;
                return (
                  <button
                    key={uniqueKey}
                    onClick={() => handleUserSelect(friend)}
                    className={`
                      w-full p-2 flex items-center gap-3 rounded-lg
                      hover:bg-base-300 transition-colors
                      ${selectedUser?._id === friend._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                    `}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <img
                        src={friend.profilePic || "/avatar.png"}
                        alt={friend.fullName}
                        className={`size-8 object-cover rounded-full ${friend.isBot ? "ring-2 ring-primary" : ""}`}
                      />
                      {!friend.isBot && onlineUsers.includes(friend._id) && (
                        <span
                          className="absolute bottom-0 right-0 size-2 bg-green-500 
                          rounded-full ring-2 ring-zinc-900"
                        />
                      )}
                    </div>
                    <div className="hidden lg:block text-left min-w-0">
                      <div className="font-medium truncate">
                        {friend.fullName}
                        {friend.isBot && (
                          <span className="ml-2 text-xs bg-primary text-white px-1.5 py-0.5 rounded">AI</span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {friend.isBot ? "AI" : onlineUsers.includes(friend._id) ? "在线" : "离线"}
                      </div>
                    </div>
                    {unreadMessages.users[friend._id] > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {unreadMessages.users[friend._id]}
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredFriends.length === 0 && (
                <div className="text-center text-zinc-500 py-4">
                  没有好友
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isCreateGroupModalOpen && (
        <CreateGroupModal
          isOpen={isCreateGroupModalOpen}
          onClose={() => setIsCreateGroupModalOpen(false)}
        />
      )}

      {isAddFriendModalOpen && (
        <AddFriendModal
          isOpen={isAddFriendModalOpen}
          onClose={() => setIsAddFriendModalOpen(false)}
        />
      )}

      {isFriendRequestsModalOpen && (
        <FriendRequestsModal
          isOpen={isFriendRequestsModalOpen}
          onClose={() => setIsFriendRequestsModalOpen(false)}
        />
      )}

    
    </aside>
  );
};

export default Sidebar;

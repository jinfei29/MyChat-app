import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    getGroupMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (selectedUser) {
          console.log("Loading private messages for user:", selectedUser._id);
          await getMessages(selectedUser._id);
        } else if (selectedGroup) {
          console.log("Loading group messages for group:", selectedGroup._id);
          await getGroupMessages(selectedGroup._id);
        }
        subscribeToMessages();
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    if (selectedUser || selectedGroup) {
      loadMessages();
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser, selectedGroup, getMessages, getGroupMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">欢迎使用聊天应用</h1>
        <p className="text-base-content/70">选择一个聊天开始对话</p>
      </div>
    );
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isOwnMessage = message.senderId._id ? 
            message.senderId._id === authUser._id : 
            message.senderId === authUser._id;

          const sender = isOwnMessage 
            ? authUser 
            : (selectedGroup 
                ? message.senderId 
                : selectedUser);

          return (
            <div
              key={message._id || index}
              className={`chat ${isOwnMessage ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={sender?.profilePic || "/avatar.png"}
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                {selectedGroup && (
                  <span className="font-medium mr-2">{sender?.fullName}</span>
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              {message.text && <div className={`chat-bubble ${isOwnMessage ? "chat-bubble-primary" : ""}`}>
                <ReactMarkdown
                  className="prose max-w-none"
                  remarkPlugins={[remarkGfm]}
                >
                  {message.text}
                </ReactMarkdown>
            </div>}

              {message.image && (
                <div className="mt-2">
                  <img
                    src={message.image}
                    alt="message"
                    className="max-w-[200px] rounded-lg"
                  />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;

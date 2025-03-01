import { useState } from "react";
import { X, Search, UserPlus } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";

const AddFriendModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const { searchUserByEmail, sendFriendRequest, searchResult, isSearching } = useFriendStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    await searchUserByEmail(email.trim());
  };

  const handleSendRequest = async (userId) => {
    await sendFriendRequest(userId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">添加好友</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="输入邮箱搜索用户"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-bordered flex-1"
              required
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSearching || !email.trim()}
            >
              <Search className="size-5" />
            </button>
          </div>

          {isSearching && (
            <div className="text-center py-4">
              <span className="loading loading-spinner"></span>
              <p>搜索中...</p>
            </div>
          )}

          {searchResult && (
            <div className="p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-4">
                <img
                  src={searchResult.profilePic || "/avatar.png"}
                  alt={searchResult.fullName}
                  className="size-12 rounded-full"
                />
                <div>
                  <h3 className="font-medium">{searchResult.fullName}</h3>
                  <p className="text-sm text-base-content/70">{searchResult.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(searchResult._id)}
                className="btn btn-primary w-full mt-4 gap-2"
              >
                <UserPlus className="size-5" />
                发送好友申请
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddFriendModal; 
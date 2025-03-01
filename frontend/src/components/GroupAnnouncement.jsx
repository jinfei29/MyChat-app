import { useState } from "react";
import { X, Edit2, Save } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const GroupAnnouncement = ({ isOpen, onClose }) => {
  const { selectedGroup, updateAnnouncement } = useChatStore();
  const { authUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(selectedGroup?.announcement?.content || "");

  if (!isOpen || !selectedGroup) return null;

  const isAdmin = selectedGroup.admin._id === authUser._id;

  const handleSave = async () => {
    try {
      await updateAnnouncement(selectedGroup._id, content);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">群公告</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="textarea textarea-bordered w-full h-40"
                placeholder="请输入群公告内容..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary gap-2"
                >
                  <Save className="size-4" />
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGroup.announcement?.content ? (
                <>
                  <div className="min-h-40 p-4 bg-base-100 rounded-lg whitespace-pre-wrap">
                    {selectedGroup.announcement.content}
                  </div>
                  {selectedGroup.announcement.updatedAt && (
                    <div className="text-sm text-base-content/70">
                      最后更新: {formatMessageTime(selectedGroup.announcement.updatedAt)}
                    </div>
                  )}
                </>
              ) : (
                <div className="min-h-40 p-4 bg-base-100 rounded-lg flex items-center justify-center text-base-content/50">
                  暂无群公告
                </div>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    setContent(selectedGroup.announcement?.content || "");
                    setIsEditing(true);
                  }}
                  className="btn btn-outline w-full gap-2"
                >
                  <Edit2 className="size-4" />
                  {selectedGroup.announcement?.content ? "编辑公告" : "添加公告"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupAnnouncement; 
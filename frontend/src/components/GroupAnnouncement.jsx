import { useState } from "react";
import { X, Edit2, Save, Trash2, Plus } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const GroupAnnouncement = ({ isOpen, onClose }) => {
  const { 
    selectedGroup, 
    updateAnnouncement, 
    deleteAnnouncement, 
    editAnnouncement 
  } = useChatStore();
  const { authUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [content, setContent] = useState("");

  if (!isOpen || !selectedGroup) return null;

  const isAdmin = selectedGroup.admin._id === authUser._id;
  const announcements = selectedGroup.announcements || [];

  // 查找公告发布者信息
  const findAnnouncementCreator = () => {
    return selectedGroup.admin
  };

  const handleSave = async () => {
    try {
      if (editingAnnouncementId) {
        // 编辑现有公告
        await editAnnouncement(selectedGroup._id, editingAnnouncementId, content);
      } else {
        // 发布新公告
        await updateAnnouncement(selectedGroup._id, content);
      }
      setIsEditing(false);
      setEditingAnnouncementId(null);
      setContent("");
    } catch (error) {
      console.error("保存公告失败:", error);
    }
  };

  const handleEdit = (announcement) => {
    setContent(announcement.content);
    setEditingAnnouncementId(announcement._id);
    setIsEditing(true);
  };

  const handleDelete = async (announcementId) => {
    try {
      await deleteAnnouncement(selectedGroup._id, announcementId);
    } catch (error) {
      console.error("删除公告失败:", error);
    }
  };

  const handleAddNew = () => {
    setContent("");
    setEditingAnnouncementId(null);
    setIsEditing(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-200 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">群公告</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="textarea textarea-bordered w-full h-40"
                placeholder="请输入公告内容..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditingAnnouncementId(null);
                    setContent("");
                  }}
                  className="btn btn-ghost"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary gap-2"
                  disabled={!content.trim()}
                >
                  <Save className="size-4" />
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isAdmin && (
                <button
                  onClick={handleAddNew}
                  className="btn btn-outline w-full gap-2"
                >
                  <Plus className="size-4" />
                  发布新公告
                </button>
              )}

              {announcements.length > 0 ? (
                <div className="space-y-4">
                  {announcements.map((announcement) => {
                    const creator = findAnnouncementCreator();
                    return (
                      <div
                        key={announcement._id}
                        className="bg-base-100 rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={creator?.profilePic || "/avatar.png"}
                              alt={creator?.fullName}
                              className="size-6 rounded-full"
                            />
                            <span className="font-medium">
                              {creator?.fullName || "未知用户"}
                            </span>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(announcement)}
                                className="btn btn-ghost btn-sm"
                                title="编辑"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(announcement._id)}
                                className="btn btn-ghost btn-sm text-error"
                                title="删除"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{announcement.content}</div>
                        <div className="text-sm text-base-content/70">
                          {formatMessageTime(announcement.updatedAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-base-content/50">
                  暂无群公告
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupAnnouncement; 
import { useState, useRef } from "react";
import { Image, Send, Smile } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const MessageInput = () => {
  const [message, setMessage] = useState("");
  const imageInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { sendMessage, sendGroupMessage, selectedUser, selectedGroup } = useChatStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !imagePreview) return;

    const messageData = {
      text: message.trim(),
      image: imagePreview,
    };

    try {
      if (selectedGroup) {
        await sendGroupMessage(selectedGroup._id, messageData);
      } else if (selectedUser) {
        if (selectedUser.isBot) {
          setMessage("");
          await sendMessage(messageData);
        }
        else {
          await sendMessage(messageData);
        }
      }
      setMessage("");
      setImagePreview(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleImageChange = (e) => {
    console.log(e.target.files);
    const file = e.target.files[0];
    if (!file) return;
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件（如 JPG、PNG）');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    // 文件读取成功时的回调
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;

      img.onload = () => {
        // 创建 canvas 元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 设置 canvas 的宽高为图片的宽高
        const MAX_WIDTH = 800; // 最大宽度
        const MAX_HEIGHT = 800; // 最大高度
        let width = img.width;
        let height = img.height;

        // 按比例缩放图片
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 将图片绘制到 canvas 上
        ctx.drawImage(img, 0, 0, width, height);

        // 压缩图片（quality 为压缩质量，范围：0 到 1）
        const quality = 0.7; // 设置为 0.7，表示 70% 的质量
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // 更新预览
        setImagePreview(compressedDataUrl);
      };
    };
  };

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-base-300">
      {imagePreview && (
        <div className="mb-2 relative w-fit">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-md"
          />
          <button
            type="button"
            className="absolute -top-2 -right-2 btn btn-sm btn-circle btn-error"
            onClick={() => setImagePreview(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-circle btn-ghost btn-sm"
          onClick={() => imageInputRef.current?.click()}
        >
          <Image className="size-5" />
        </button>

        <button
          type="button"
          className="btn btn-circle btn-ghost btn-sm"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile className="size-5" />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full input input-bordered"
          />

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2">
              <Picker
                data={data}
                onEmojiSelect={addEmoji}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-circle btn-ghost btn-sm">
          <Send className="size-5" />
        </button>

        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={imageInputRef}
          className="hidden"
        />
      </div>
    </form>
  );
};

export default MessageInput;

import { Phone, Video } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

const CallControls = ({ userId, isGroupChat = false }) => {
  const { initiateCall } = useCallStore();

  const handleCall = (type) => {
    initiateCall(
      userId,
      type,
      isGroupChat ? userId : null,
      isGroupChat
    );
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleCall("audio")}
        className="btn btn-ghost btn-circle"
        title="语音通话"
      >
        <Phone className="w-5 h-5" />
      </button>
      <button
        onClick={() => handleCall("video")}
        className="btn btn-ghost btn-circle"
        title="视频通话"
      >
        <Video className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CallControls;

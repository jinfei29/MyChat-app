
import Draggable from "react-draggable";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Maximize2 } from "lucide-react";

const FloatingCallBall = () => {
  const { currentCall, isMinimized, callDuration, toggleMinimized, endCall, formatDuration} = useCallStore();
  const isVideoCall = currentCall?.type === "video";


  if (!isMinimized) return null;

  return (
    <Draggable bounds="parent">
      <div className="fixed z-50 cursor-move select-none">
        <div className="flex items-center justify-center w-20 h-20 bg-primary rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex flex-col items-center">
            {/* 通话时长 */}
            <div className="text-white text-sm font-medium mb-1">
              {formatDuration(callDuration)}
            </div>
            
            {/* 控制按钮 */}
            <div className="flex gap-2">
              <button
                onClick={toggleMinimized}
                className="text-white hover:text-white/80 transition-colors"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={endCall}
                className="text-red-500 hover:text-red-400 transition-colors"
              >
                {isVideoCall ? <PhoneOff size={16} /> : <Phone size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default FloatingCallBall;
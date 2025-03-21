import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from "lucide-react";

const CallModal = () => {
  const {
    currentCall,
    isCallModalOpen,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall
  } = useCallStore();

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isCallModalOpen) return null;

  const isVideoCall = currentCall?.type === "video";
  const isIncoming = currentCall?.isIncoming;
  const isConnected = localStream && localStream;
  console.log("localStream", localStream);
  console.log("remoteStream", remoteStream);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl p-4">
        {/* 通话状态显示 */}
        <div className="text-center text-white mb-4">
          <h3 className="text-xl font-medium">
            {isIncoming ? "来电" : "正在呼叫..."}
          </h3>
          <p className="text-lg">
            {currentCall?.callerId?.fullName || "未知用户"}
          </p>
          <p className="text-base-content/70">
            {isVideoCall ? "视频通话" : "语音通话"}
          </p>
        </div>

        {/* 视频显示区域 */}
        {isVideoCall && (
          <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden mb-4">
            {/* 远程视频 */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* 本地视频（小窗口） */}
            {localStream && (
              <div className="absolute bottom-4 right-4 w-1/4 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex justify-center gap-4">
          {isIncoming && !isConnected ? (
            <>
              <button
                onClick={acceptCall}
                className="btn btn-success btn-circle btn-lg"
              >
                {isVideoCall ? <Video /> : <Phone />}
              </button>
              <button
                onClick={rejectCall}
                className="btn btn-error btn-circle btn-lg"
              >
                {isVideoCall ? <VideoOff /> : <PhoneOff />}
              </button>
            </>
          ) : (
            <button
              onClick={endCall}
              className="btn btn-error btn-circle btn-lg"
            >
              <PhoneOff />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal; 
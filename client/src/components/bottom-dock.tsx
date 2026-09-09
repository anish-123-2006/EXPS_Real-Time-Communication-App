"use client";

import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, PenTool, FolderSync } from "lucide-react";

export function BottomDock({
    toggleSidebar,
    onToggleVideo,
    onToggleAudio,
    isVideoEnabled,
    isAudioEnabled,
    onStartScreenShare,
    onStopScreenShare,
    onEndMeeting,
    isScreenSharing,
}: {
    toggleSidebar: (tab: "whiteboard" | "files") => void;
    onToggleVideo: () => void;
    onToggleAudio: () => void;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    onStartScreenShare: () => void;
    onStopScreenShare: () => void;
    onEndMeeting: () => void;
    isScreenSharing: boolean;
}) {
    return (
        <div className="h-20 w-full flex items-center justify-between px-4 sm:px-6 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-900 shrink-0">
            {/* Collaboration tools */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => toggleSidebar("whiteboard")}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-sm"
                    title="Whiteboard"
                >
                    <PenTool className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button
                    onClick={() => toggleSidebar("files")}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all group shadow-sm"
                    title="File Share"
                >
                    <FolderSync className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Primary media controls */}
            <div className="flex items-center gap-3 sm:gap-4 absolute left-1/2 -translate-x-1/2">
                <button
                    onClick={onToggleAudio}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all shadow-lg ${!isAudioEnabled ? "bg-red-500/10 text-red-500 border border-red-500/30" : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700/50"}`}
                >
                    {!isAudioEnabled ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                <button
                    onClick={onToggleVideo}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all shadow-lg ${!isVideoEnabled ? "bg-red-500/10 text-red-500 border border-red-500/30" : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700/50"}`}
                >
                    {!isVideoEnabled ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                <button
                    onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all shadow-lg ${isScreenSharing ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] border border-blue-500" : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700/50"}`}
                    title={isScreenSharing ? "Stop sharing" : "Share screen"}
                >
                    <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
            </div>

            {/* End meeting */}
            <div className="flex items-center">
                <button
                    onClick={onEndMeeting}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 h-10 sm:h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                >
                    <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">End</span>
                </button>
            </div>
        </div>
    );
}

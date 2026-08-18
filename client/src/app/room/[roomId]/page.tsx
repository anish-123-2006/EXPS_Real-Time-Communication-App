"use client";

import { ArrowLeft, Clock, Copy, CopyCheck } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { VideoGrid } from "@/components/video-grid";
import { CollaborationSidebar } from "@/components/collaboration-sidebar";
import { BottomDock } from "@/components/bottom-dock";
import { useWebRTC } from "@/lib/useWebRTC";

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [time, setTime] = useState("00:00");
  const [isCopied, setIsCopied] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Use our backend WebRTC logic hook
  const { localStream, remoteStream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio, startScreenShare, leaveRoom } = useWebRTC(roomId);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleSidebar = (tab: "whiteboard" | "files") => {
    setIsSidebarOpen((prev) => !prev);
    // In a real implementation you would also set the Active Tab inside the sidebar
  };

  const handleScreenShare = async () => {
    await startScreenShare();
    setIsScreenSharing(s => !s);
  };

  const handleEndMeeting = () => {
    leaveRoom();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Top Header Bar */}
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 shrink-0 z-10">
        <div className="flex items-center">
          <Link
            href="/"
            onClick={leaveRoom}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group px-3 py-2 -ml-3 rounded-lg hover:bg-zinc-900"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium hidden sm:inline">Leave Room</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center gap-3">
            <span className="font-mono text-sm text-zinc-300 font-medium tracking-wide">{roomId}</span>
            <button
              onClick={handleCopy}
              className="text-zinc-500 hover:text-white transition-colors"
              title="Copy Link"
            >
              {isCopied ? <CopyCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium tabular-nums">{time}</span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <VideoGrid localStream={localStream} remoteStream={remoteStream} />

        <CollaborationSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <BottomDock
        toggleSidebar={toggleSidebar}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onScreenShare={handleScreenShare}
        isScreenSharing={isScreenSharing}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  );
}

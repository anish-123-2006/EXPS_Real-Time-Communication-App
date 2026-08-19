"use client";

import { Mic, MicOff } from "lucide-react";
import { useRef, useEffect } from "react";

export function VideoGrid({ localStream, remoteStream }: { localStream: MediaStream | null; remoteStream: MediaStream | null }) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    return (
        <div className="flex-1 w-full h-full p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Local Video */}
            <div
                className="relative bg-zinc-900 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] aspect-video w-full group"
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
                {!localStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl sm:text-4xl text-zinc-500 border border-zinc-700 shadow-inner">
                            J
                        </div>
                    </div>
                )}

                {/* Name tag */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                    <span className="text-white font-medium text-xs sm:text-sm">You</span>
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                </div>
            </div>

            {/* Remote Video */}
            <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg aspect-video w-full">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                {!remoteStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl sm:text-4xl text-zinc-500 border border-zinc-700 shadow-inner">
                            ...
                        </div>
                    </div>
                )}

                {/* Name tag */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                    <span className="text-white font-medium text-xs sm:text-sm">{remoteStream ? "Remote Peer" : "Waiting..."}</span>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-500">
                        <MicOff className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </div>
    );
}

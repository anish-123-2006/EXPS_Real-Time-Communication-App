"use client";

import { Mic, MicOff } from "lucide-react";
import { useRef, useEffect } from "react";

function RemoteTile({ peerId, stream }: { peerId: string; stream: MediaStream }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg aspect-video w-full">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                <span className="text-white font-medium text-xs sm:text-sm truncate max-w-[100px]">{peerId.slice(0, 8)}</span>
                <MicOff className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            </div>
        </div>
    );
}

function gridClass(remoteCount: number): string {
    if (remoteCount === 0) return "grid-cols-1";
    if (remoteCount <= 2) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-2 lg:grid-cols-3";
}

export function VideoGrid({
    localStream,
    remoteStreams,
}: {
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
}) {
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const remoteEntries = Array.from(remoteStreams.entries());

    return (
        <div className={`flex-1 w-full h-full p-2 sm:p-4 grid gap-4 items-center ${gridClass(remoteEntries.length)}`}>
            {/* Local tile */}
            <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] aspect-video w-full group">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {!localStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl sm:text-4xl text-zinc-500 border border-zinc-700 shadow-inner">
                            ?
                        </div>
                    </div>
                )}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                    <span className="text-white font-medium text-xs sm:text-sm">You</span>
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                </div>
            </div>

            {/* Remote tiles — one per participant */}
            {remoteEntries.length === 0 && (
                <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg aspect-video w-full">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl sm:text-4xl text-zinc-500 border border-zinc-700 shadow-inner">
                            ...
                        </div>
                    </div>
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                        <span className="text-white font-medium text-xs sm:text-sm">Waiting…</span>
                    </div>
                </div>
            )}

            {remoteEntries.map(([peerId, stream]) => (
                <RemoteTile key={peerId} peerId={peerId} stream={stream} />
            ))}
        </div>
    );
}

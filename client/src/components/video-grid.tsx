"use client";

import { Mic, MicOff, User } from "lucide-react";
import { useRef, useEffect, useState } from "react";

function RemoteTile({ peerId, stream }: { peerId: string; stream: MediaStream }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideo, setHasVideo] = useState(true);
    const [hasAudio, setHasAudio] = useState(true);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const updateTrackStates = () => {
            const vTrack = stream.getVideoTracks()[0];
            const aTrack = stream.getAudioTracks()[0];
            setHasVideo(Boolean(vTrack && vTrack.enabled && !vTrack.muted));
            setHasAudio(Boolean(aTrack && aTrack.enabled && !aTrack.muted));
        };

        updateTrackStates();

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        const handleTrackChange = () => updateTrackStates();

        videoTracks.forEach((t) => {
            t.addEventListener("mute", handleTrackChange);
            t.addEventListener("unmute", handleTrackChange);
            t.addEventListener("ended", handleTrackChange);
        });

        audioTracks.forEach((t) => {
            t.addEventListener("mute", handleTrackChange);
            t.addEventListener("unmute", handleTrackChange);
            t.addEventListener("ended", handleTrackChange);
        });

        stream.addEventListener("addtrack", handleTrackChange);
        stream.addEventListener("removetrack", handleTrackChange);

        return () => {
            videoTracks.forEach((t) => {
                t.removeEventListener("mute", handleTrackChange);
                t.removeEventListener("unmute", handleTrackChange);
                t.removeEventListener("ended", handleTrackChange);
            });
            audioTracks.forEach((t) => {
                t.removeEventListener("mute", handleTrackChange);
                t.removeEventListener("unmute", handleTrackChange);
                t.removeEventListener("ended", handleTrackChange);
            });
            stream.removeEventListener("addtrack", handleTrackChange);
            stream.removeEventListener("removetrack", handleTrackChange);
        };
    }, [stream]);

    const shortId = peerId.length > 8 ? peerId.slice(0, 8) : peerId;

    return (
        <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl aspect-video w-full flex items-center justify-center group">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${hasVideo ? "opacity-100" : "opacity-0"}`}
            />

            {!hasVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 flex items-center justify-center text-xl sm:text-2xl text-zinc-400 border border-zinc-700 shadow-inner">
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-500" />
                    </div>
                </div>
            )}

            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2 z-10">
                <span className="text-white font-medium text-xs sm:text-sm truncate max-w-[120px]">
                    User {shortId}
                </span>
                {hasAudio ? (
                    <Mic className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
            </div>
        </div>
    );
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

    // Derive track active state directly from stream without redundant effects
    const vTrack = localStream?.getVideoTracks()[0];
    const aTrack = localStream?.getAudioTracks()[0];
    const hasLocalVideo = Boolean(vTrack && vTrack.enabled);
    const hasLocalAudio = Boolean(aTrack && aTrack.enabled);

    const remoteEntries = Array.from(remoteStreams.entries());
    const totalCount = 1 + remoteEntries.length;

    const gridCols =
        totalCount === 1
            ? "grid-cols-1 md:grid-cols-2 max-w-5xl"
            : totalCount === 2
              ? "grid-cols-1 md:grid-cols-2 max-w-6xl"
              : totalCount <= 4
                ? "grid-cols-1 sm:grid-cols-2 max-w-6xl"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl";

    return (
        <div className="flex-1 w-full h-full p-3 sm:p-6 overflow-y-auto flex items-center justify-center">
            <div className={`w-full grid gap-4 sm:gap-6 place-content-center mx-auto ${gridCols}`}>
                {/* Local User Tile */}
                <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)] aspect-video w-full flex items-center justify-center group">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-300 ${hasLocalVideo ? "opacity-100" : "opacity-0"}`}
                    />

                    {(!localStream || !hasLocalVideo) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-inner">
                                <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2 z-10">
                        <span className="text-white font-medium text-xs sm:text-sm">You</span>
                        {hasLocalAudio ? (
                            <Mic className="w-3.5 h-3.5 text-zinc-300" />
                        ) : (
                            <MicOff className="w-3.5 h-3.5 text-red-400" />
                        )}
                    </div>
                </div>

                {/* Waiting placeholder when alone in room */}
                {remoteEntries.length === 0 && (
                    <div className="relative bg-zinc-900/60 rounded-2xl overflow-hidden border border-dashed border-zinc-800 aspect-video w-full flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-3">
                            <User className="w-6 h-6 text-zinc-500 animate-pulse" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">Waiting for participants</p>
                        <p className="text-xs text-zinc-500 mt-1">Share the room link to invite others</p>
                    </div>
                )}

                {/* Remote Participant Tiles */}
                {remoteEntries.map(([peerId, stream]) => (
                    <RemoteTile key={peerId} peerId={peerId} stream={stream} />
                ))}
            </div>
        </div>
    );
}

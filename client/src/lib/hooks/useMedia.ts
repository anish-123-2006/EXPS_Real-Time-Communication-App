import { useState, useRef, useCallback, useEffect } from 'react';

export function useMedia() {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const localStreamRef = useRef<MediaStream | null>(null);
    const screenTrackRef = useRef<MediaStreamTrack | null>(null);

    // Keep ref in sync for cleanup callbacks that outlive state.
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    const startMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            return stream;
        } catch {
            return null;
        }
    }, []);

    const stopAllTracks = useCallback(() => {
        screenTrackRef.current?.stop();
        screenTrackRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setIsScreenSharing(false);
    }, []);

    const toggleVideo = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsVideoEnabled(track.enabled);
        }
    }, []);

    const toggleAudio = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setIsAudioEnabled(track.enabled);
        }
    }, []);

    const revertToCameraTrack = useCallback(
        (peerConnections: Map<string, RTCPeerConnection>) => {
            const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
            if (!cameraTrack) return;
            peerConnections.forEach((pc) => {
                const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                sender?.replaceTrack(cameraTrack);
            });
            setIsScreenSharing(false);
        },
        []
    );

    const startScreenShare = useCallback(
        async (peerConnections: Map<string, RTCPeerConnection>): Promise<boolean> => {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;

                peerConnections.forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    sender?.replaceTrack(screenTrack);
                });

                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    screenTrackRef.current = null;
                    revertToCameraTrack(peerConnections);
                };

                return true;
            } catch {
                // Permission denied or dismissed — do not update UI state.
                return false;
            }
        },
        [revertToCameraTrack]
    );

    const stopScreenShare = useCallback(
        (peerConnections: Map<string, RTCPeerConnection>) => {
            screenTrackRef.current?.stop();
            screenTrackRef.current = null;
            revertToCameraTrack(peerConnections);
        },
        [revertToCameraTrack]
    );

    return {
        localStream,
        localStreamRef,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        startMedia,
        stopAllTracks,
        toggleVideo,
        toggleAudio,
        startScreenShare,
        stopScreenShare,
    };
}

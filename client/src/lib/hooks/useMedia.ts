import { useState, useRef, useCallback, useEffect } from 'react';

export function useMedia() {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    const startMedia = useCallback(async (): Promise<MediaStream | null> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true,
            });
            localStreamRef.current = stream;
            cameraVideoTrackRef.current = stream.getVideoTracks()[0] || null;
            setLocalStream(stream);
            setIsVideoEnabled(true);
            setIsAudioEnabled(true);
            return stream;
        } catch (err) {
            console.error('Failed to acquire user media:', err);
            return null;
        }
    }, []);

    const revertToCameraTrack = useCallback(
        (peerConnections: Map<string, RTCPeerConnection>) => {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }

            const cameraTrack = cameraVideoTrackRef.current || localStreamRef.current?.getVideoTracks()[0];
            if (cameraTrack) {
                peerConnections.forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(cameraTrack).catch(() => {});
                    }
                });
            }

            setIsScreenSharing(false);
        },
        []
    );

    const stopScreenShare = useCallback(
        (peerConnections: Map<string, RTCPeerConnection>) => {
            revertToCameraTrack(peerConnections);
        },
        [revertToCameraTrack]
    );

    const startScreenShare = useCallback(
        async (peerConnections: Map<string, RTCPeerConnection>): Promise<boolean> => {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });

                const screenTrack = screenStream.getVideoTracks()[0];
                if (!screenTrack) {
                    setIsScreenSharing(false);
                    return false;
                }

                screenStreamRef.current = screenStream;

                // Replace video track for all active WebRTC peers
                peerConnections.forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack).catch(() => {});
                    }
                });

                setIsScreenSharing(true);

                // Handle native browser "Stop sharing" float bar
                screenTrack.onended = () => {
                    revertToCameraTrack(peerConnections);
                };

                return true;
            } catch {
                // User dismissed or denied display media picker
                setIsScreenSharing(false);
                return false;
            }
        },
        [revertToCameraTrack]
    );

    const stopAllTracks = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }

        cameraVideoTrackRef.current = null;
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

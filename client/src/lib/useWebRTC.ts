import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTC(roomId: string, enabled: boolean = true) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);

    // Initialize Socket Component
    useEffect(() => {
        if (!enabled) return;

        // Connect to Socket.io server
        socketRef.current = io('http://localhost:5000');
        const socket = socketRef.current;

        const setupMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);

                // Notify server to join room
                socket.emit('join-room', roomId);
            } catch (err) {
                console.error("Failed to get local stream", err);
            }
        };

        setupMedia();

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            peerConnectionRef.current?.close();
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, enabled]);

    // Peer Connection Handlers
    useEffect(() => {
        if (!socketRef.current || !localStream) return;

        const socket = socketRef.current;

        const createPeerConnection = (targetUserId: string) => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            // Add local tracks to peer connection
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            // Handle receiving remote tracks
            pc.ontrack = (event) => {
                const [stream] = event.streams;
                setRemoteStream(stream);
            };

            // Handle ICE Candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('send-ice-candidate', {
                        targetUserId: targetUserId,
                        candidate: event.candidate
                    });
                }
            };

            return pc;
        };

        // User connected -> Make Offer
        socket.on('user-connected', async (newUserId: string) => {
            const pc = createPeerConnection(newUserId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('send-webrtc-offer', {
                targetUserId: newUserId,
                callerId: socket.id,
                sdpOffer: offer
            });
        });

        // Received Offer -> Create Answer
        socket.on('receive-webrtc-offer', async ({ callerId, sdpOffer }) => {
            const pc = createPeerConnection(callerId);
            await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('send-webrtc-answer', {
                targetUserId: callerId,
                sdpAnswer: answer
            });
        });

        // Received Answer -> Finish setup
        socket.on('receive-webrtc-answer', async ({ sdpAnswer }) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
            }
        });

        // Receive ICE Candidates
        socket.on('receive-ice-candidate', async ({ candidate }) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        });

        return () => {
            socket.off('user-connected');
            socket.off('receive-webrtc-offer');
            socket.off('receive-webrtc-answer');
            socket.off('receive-ice-candidate');
        };
    }, [localStream, roomId]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    }, [localStream]);

    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    }, [localStream]);

    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            const pc = peerConnectionRef.current;
            if (pc) {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) await sender.replaceTrack(screenTrack);
            }

            // When screen share stops, revert to camera
            screenTrack.onended = () => {
                const cameraTrack = localStream?.getVideoTracks()[0];
                const pc = peerConnectionRef.current;
                if (pc && cameraTrack) {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(cameraTrack);
                }
            };
        } catch (err) {
            console.error('Screen share failed:', err);
        }
    }, [localStream]);

    const leaveRoom = useCallback(() => {
        localStream?.getTracks().forEach(track => track.stop());
        peerConnectionRef.current?.close();
        socketRef.current?.disconnect();
    }, [localStream]);

    return {
        localStream,
        remoteStream,
        isVideoEnabled,
        isAudioEnabled,
        toggleVideo,
        toggleAudio,
        startScreenShare,
        leaveRoom
    };
}

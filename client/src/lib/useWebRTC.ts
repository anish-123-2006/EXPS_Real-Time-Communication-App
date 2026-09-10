import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, TURN_CREDENTIAL, TURN_URL, TURN_USERNAME } from './runtime-config';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL
            ? [{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }]
            : []),
    ]
};

export function useWebRTC(roomId: string, enabled: boolean = true) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        if (!enabled) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        let active = true;

        const setupMediaAndConnect = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (!active) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                setLocalStream(stream);

                const sock = io(SOCKET_URL, { auth: { token } });
                socketRef.current = sock;
                setSocket(sock);

                sock.on("connect", () => sock.emit("join-room", roomId));
            } catch (err) {
                console.error("Failed to get local stream", err);
            }
        };

        setupMediaAndConnect();

        return () => {
            active = false;
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
            setRemoteStream(null);
            peerConnectionRef.current?.close();
            peerConnectionRef.current = null;
            socketRef.current?.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [roomId, enabled]);

    useEffect(() => {
        if (!socket || !localStream) return;

        const createPeerConnection = (targetUserId: string) => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            pc.ontrack = (event) => {
                const [stream] = event.streams;
                setRemoteStream(stream);
            };

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

        socket.on('receive-webrtc-answer', async ({ sdpAnswer }) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
            }
        });

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
    }, [localStream, socket]);

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
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
    }, []);

    return {
        socket,
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

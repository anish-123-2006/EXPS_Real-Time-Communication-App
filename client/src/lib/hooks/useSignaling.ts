import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, TURN_CREDENTIAL, TURN_URL, TURN_USERNAME } from '../runtime-config';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL
            ? [{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }]
            : []),
    ],
};

export function useSignaling(
    roomId: string,
    localStream: MediaStream | null,
    enabled: boolean
) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    const socketRef = useRef<Socket | null>(null);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

    const getPeerConnections = useCallback(() => peerConnections.current, []);

    const removePeer = useCallback((peerId: string) => {
        peerConnections.current.get(peerId)?.close();
        peerConnections.current.delete(peerId);
        setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });
    }, []);

    const createPeerConnection = useCallback(
        (peerId: string, sock: Socket) => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnections.current.set(peerId, pc);

            localStream?.getTracks().forEach((track) => {
                pc.addTrack(track, localStream);
            });

            pc.ontrack = (event) => {
                const [stream] = event.streams;
                setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sock.emit('send-ice-candidate', {
                        targetUserId: peerId,
                        candidate: event.candidate,
                    });
                }
            };

            return pc;
        },
        [localStream]
    );

    useEffect(() => {
        if (!enabled || !localStream) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const sock = io(SOCKET_URL, { auth: { token } });
        socketRef.current = sock;
        setSocket(sock);

        sock.on('connect', () => sock.emit('join-room', roomId));

        sock.on('user-connected', async (newUserId: string) => {
            const pc = createPeerConnection(newUserId, sock);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sock.emit('send-webrtc-offer', {
                targetUserId: newUserId,
                callerId: sock.id,
                sdpOffer: offer,
            });
        });

        sock.on('receive-webrtc-offer', async ({ callerId, sdpOffer }: {
            callerId: string;
            sdpOffer: RTCSessionDescriptionInit;
        }) => {
            const pc = createPeerConnection(callerId, sock);
            await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sock.emit('send-webrtc-answer', { targetUserId: callerId, sdpAnswer: answer });
        });

        sock.on('receive-webrtc-answer', async ({ sdpAnswer }: {
            sdpAnswer: RTCSessionDescriptionInit;
        }) => {
            for (const pc of peerConnections.current.values()) {
                if (!pc.currentRemoteDescription) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
                    break;
                }
            }
        });

        sock.on('receive-ice-candidate', async ({ candidate, from }: {
            candidate: RTCIceCandidateInit;
            from: string;
        }) => {
            const pc = peerConnections.current.get(from);
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {
                }
            }
        });

        sock.on('user-disconnected', (peerId: string) => {
            removePeer(peerId);
        });

        return () => {
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();
            setRemoteStreams(new Map());
            sock.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [roomId, enabled, localStream, createPeerConnection, removePeer]);

    const leaveRoom = useCallback(() => {
        peerConnections.current.forEach((pc) => pc.close());
        peerConnections.current.clear();
        setRemoteStreams(new Map());
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
    }, []);

    return { socket, remoteStreams, getPeerConnections, leaveRoom };
}

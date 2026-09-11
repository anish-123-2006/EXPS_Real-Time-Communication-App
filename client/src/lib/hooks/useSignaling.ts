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
    const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    const getPeerConnections = useCallback(() => peerConnections.current, []);

    const removePeer = useCallback((peerId: string) => {
        const pc = peerConnections.current.get(peerId);
        if (pc) {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
            peerConnections.current.delete(peerId);
        }
        iceCandidateQueues.current.delete(peerId);
        setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
        });
    }, []);

    const createPeerConnection = useCallback(
        (peerId: string, sock: Socket): RTCPeerConnection => {
            // Close any existing stale connection for this peer
            if (peerConnections.current.has(peerId)) {
                peerConnections.current.get(peerId)?.close();
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnections.current.set(peerId, pc);

            if (localStream) {
                localStream.getTracks().forEach((track) => {
                    pc.addTrack(track, localStream);
                });
            }

            pc.ontrack = (event) => {
                const stream = event.streams[0] || new MediaStream([event.track]);
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    next.set(peerId, stream);
                    return next;
                });
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sock.emit('send-ice-candidate', {
                        roomId,
                        targetUserId: peerId,
                        candidate: event.candidate,
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                    // Participant dropped or disconnected
                    removePeer(peerId);
                }
            };

            return pc;
        },
        [localStream, roomId, removePeer]
    );

    useEffect(() => {
        if (!enabled || !localStream) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const sock = io(SOCKET_URL, { auth: { token } });
        socketRef.current = sock;

        sock.on('connect', () => {
            setSocket(sock);
            sock.emit('join-room', roomId);
        });

        // Existing participants receive notification of newcomer and initiate offer
        sock.on('user-connected', async (newUserId: string) => {
            try {
                const pc = createPeerConnection(newUserId, sock);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                sock.emit('send-webrtc-offer', {
                    roomId,
                    targetUserId: newUserId,
                    sdpOffer: offer,
                });
            } catch (err) {
                console.error('Failed to initiate WebRTC offer to new user:', err);
            }
        });

        // Newcomer receives offer from an existing participant
        sock.on('receive-webrtc-offer', async ({ callerId, sdpOffer }: {
            callerId: string;
            sdpOffer: RTCSessionDescriptionInit;
        }) => {
            try {
                let pc = peerConnections.current.get(callerId);
                if (!pc) {
                    pc = createPeerConnection(callerId, sock);
                }

                await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));

                // Process any queued ICE candidates for this caller
                const queued = iceCandidateQueues.current.get(callerId) || [];
                for (const candidate of queued) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
                iceCandidateQueues.current.delete(callerId);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                sock.emit('send-webrtc-answer', {
                    roomId,
                    targetUserId: callerId,
                    sdpAnswer: answer,
                });
            } catch (err) {
                console.error('Failed to handle incoming WebRTC offer:', err);
            }
        });

        // Caller receives answer from the specific responder
        sock.on('receive-webrtc-answer', async ({ responderId, sdpAnswer }: {
            responderId: string;
            sdpAnswer: RTCSessionDescriptionInit;
        }) => {
            try {
                const pc = peerConnections.current.get(responderId);
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));

                    // Process any queued ICE candidates for this responder
                    const queued = iceCandidateQueues.current.get(responderId) || [];
                    for (const candidate of queued) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                    }
                    iceCandidateQueues.current.delete(responderId);
                }
            } catch (err) {
                console.error('Failed to set remote description from answer:', err);
            }
        });

        // Add ICE candidate to specific peer connection, or queue if remote description isn't ready
        sock.on('receive-ice-candidate', async ({ from, candidate }: {
            from: string;
            candidate: RTCIceCandidateInit;
        }) => {
            const pc = peerConnections.current.get(from);
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch {
                    // Ignore ICE candidate errors on closed connections
                }
            } else {
                if (!iceCandidateQueues.current.has(from)) {
                    iceCandidateQueues.current.set(from, []);
                }
                iceCandidateQueues.current.get(from)!.push(candidate);
            }
        });

        sock.on('user-disconnected', (peerId: string) => {
            removePeer(peerId);
        });

        const activePeerConnections = peerConnections.current;
        const activeIceCandidateQueues = iceCandidateQueues.current;

        return () => {
            activePeerConnections.forEach((pc) => {
                pc.ontrack = null;
                pc.onicecandidate = null;
                pc.close();
            });
            activePeerConnections.clear();
            activeIceCandidateQueues.clear();
            setRemoteStreams(new Map());
            sock.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [roomId, enabled, localStream, createPeerConnection, removePeer]);

    const leaveRoom = useCallback(() => {
        peerConnections.current.forEach((pc) => {
            pc.ontrack = null;
            pc.onicecandidate = null;
            pc.close();
        });
        peerConnections.current.clear();
        iceCandidateQueues.current.clear();
        setRemoteStreams(new Map());
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
    }, []);

    return { socket, remoteStreams, getPeerConnections, leaveRoom };
}

import type { Server, Socket } from 'socket.io';
import { isInRoom, getRoomForSocket } from './roomPresence.js';

export function registerSignalingHandlers(io: Server, socket: Socket) {
    socket.on('send-webrtc-offer', ({ targetUserId, callerId, sdpOffer }: {
        targetUserId: string;
        callerId: string;
        sdpOffer: RTCSessionDescriptionInit;
    }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;
        if (!isInRoom(senderRoom, targetUserId)) return;

        io.to(targetUserId).emit('receive-webrtc-offer', { callerId, sdpOffer });
    });

    socket.on('send-webrtc-answer', ({ targetUserId, sdpAnswer }: {
        targetUserId: string;
        sdpAnswer: RTCSessionDescriptionInit;
    }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;
        if (!isInRoom(senderRoom, targetUserId)) return;

        io.to(targetUserId).emit('receive-webrtc-answer', { sdpAnswer });
    });

    socket.on('send-ice-candidate', ({ targetUserId, candidate }: {
        targetUserId: string;
        candidate: RTCIceCandidateInit;
    }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;
        if (!isInRoom(senderRoom, targetUserId)) return;

        io.to(targetUserId).emit('receive-ice-candidate', { candidate });
    });
}

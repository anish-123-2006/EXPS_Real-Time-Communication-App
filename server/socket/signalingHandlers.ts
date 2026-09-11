import type { Server, Socket } from 'socket.io';
import { isInRoom, getRoomForSocket } from './roomPresence.js';

interface SignalingOfferPayload {
    targetUserId: string;
    sdpOffer: RTCSessionDescriptionInit;
}

interface SignalingAnswerPayload {
    targetUserId: string;
    sdpAnswer: RTCSessionDescriptionInit;
}

interface SignalingCandidatePayload {
    targetUserId: string;
    candidate: RTCIceCandidateInit;
}

export function registerSignalingHandlers(io: Server, socket: Socket): void {
    socket.on('send-webrtc-offer', (payload: SignalingOfferPayload) => {
        if (
            !payload ||
            typeof payload.targetUserId !== 'string' ||
            !payload.sdpOffer ||
            payload.sdpOffer.type !== 'offer'
        ) {
            return;
        }

        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        if (!isInRoom(senderRoom, socket.id)) return;
        if (!isInRoom(senderRoom, payload.targetUserId)) return;

        io.to(payload.targetUserId).emit('receive-webrtc-offer', {
            callerId: socket.id,
            sdpOffer: payload.sdpOffer,
        });
    });

    socket.on('send-webrtc-answer', (payload: SignalingAnswerPayload) => {
        if (
            !payload ||
            typeof payload.targetUserId !== 'string' ||
            !payload.sdpAnswer ||
            payload.sdpAnswer.type !== 'answer'
        ) {
            return;
        }

        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        if (!isInRoom(senderRoom, socket.id)) return;
        if (!isInRoom(senderRoom, payload.targetUserId)) return;

        io.to(payload.targetUserId).emit('receive-webrtc-answer', {
            responderId: socket.id,
            sdpAnswer: payload.sdpAnswer,
        });
    });

    socket.on('send-ice-candidate', (payload: SignalingCandidatePayload) => {
        if (!payload || typeof payload.targetUserId !== 'string' || !payload.candidate) {
            return;
        }

        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        if (!isInRoom(senderRoom, socket.id)) return;
        if (!isInRoom(senderRoom, payload.targetUserId)) return;

        io.to(payload.targetUserId).emit('receive-ice-candidate', {
            from: socket.id,
            candidate: payload.candidate,
        });
    });
}

import type { Server, Socket } from 'socket.io';
import { isInRoom } from './roomPresence.js';

type DrawSegment = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    color: string;
    brushSize: number;
};

const roomSegments = new Map<string, DrawSegment[]>();

export function getSnapshot(roomId: string): DrawSegment[] {
    return roomSegments.get(roomId) ?? [];
}

export function clearSnapshot(roomId: string) {
    roomSegments.delete(roomId);
}

export function registerWhiteboardHandlers(io: Server, socket: Socket) {
    socket.on('whiteboard-draw', ({ roomId, segment }: { roomId: string; segment: DrawSegment }) => {
        if (typeof roomId !== 'string' || !segment) return;
        if (!isInRoom(roomId, socket.id)) return;

        if (!roomSegments.has(roomId)) roomSegments.set(roomId, []);
        roomSegments.get(roomId)!.push(segment);

        socket.to(roomId).emit('whiteboard-draw', { segment });
    });

    socket.on('whiteboard-clear', ({ roomId }: { roomId: string }) => {
        if (typeof roomId !== 'string') return;
        if (!isInRoom(roomId, socket.id)) return;

        clearSnapshot(roomId);
        socket.to(roomId).emit('whiteboard-clear');
    });
}

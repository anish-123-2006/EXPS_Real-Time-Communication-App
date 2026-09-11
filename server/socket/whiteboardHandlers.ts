import type { Server, Socket } from 'socket.io';
import { isInRoom, getRoomForSocket } from './roomPresence.js';

export interface DrawSegment {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    color: string;
    brushSize: number;
}

// CSS hex color: #rgb or #rrggbb, nothing else accepted.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

const roomSegments = new Map<string, DrawSegment[]>();
const MAX_SEGMENTS_PER_ROOM = 5000;

export function getSnapshot(roomId: string): DrawSegment[] {
    return roomSegments.get(roomId) ?? [];
}

export function clearSnapshot(roomId: string): void {
    roomSegments.delete(roomId);
}

/** Remove all stored segments for a room. Called when the last member leaves. */
export function pruneRoomSegments(roomId: string): void {
    roomSegments.delete(roomId);
}

function isValidSegment(segment: unknown): segment is DrawSegment {
    if (!segment || typeof segment !== 'object') return false;
    const s = segment as Record<string, unknown>;
    return (
        typeof s.fromX === 'number' &&
        typeof s.fromY === 'number' &&
        typeof s.toX === 'number' &&
        typeof s.toY === 'number' &&
        Number.isFinite(s.fromX) && s.fromX >= 0 && s.fromX <= 1 &&
        Number.isFinite(s.fromY) && s.fromY >= 0 && s.fromY <= 1 &&
        Number.isFinite(s.toX)   && s.toX   >= 0 && s.toX   <= 1 &&
        Number.isFinite(s.toY)   && s.toY   >= 0 && s.toY   <= 1 &&
        typeof s.color === 'string' &&
        HEX_COLOR_RE.test(s.color) &&
        typeof s.brushSize === 'number' &&
        s.brushSize > 0 &&
        s.brushSize <= 50
    );
}

export function registerWhiteboardHandlers(io: Server, socket: Socket): void {
    socket.on('whiteboard-draw', ({ roomId, segment }: { roomId?: string; segment?: unknown }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        const effectiveRoom = roomId || senderRoom;
        if (effectiveRoom !== senderRoom) return;
        if (!isInRoom(effectiveRoom, socket.id)) return;

        if (!isValidSegment(segment)) return;

        if (!roomSegments.has(effectiveRoom)) {
            roomSegments.set(effectiveRoom, []);
        }

        const segments = roomSegments.get(effectiveRoom)!;
        if (segments.length >= MAX_SEGMENTS_PER_ROOM) {
            segments.shift();
        }
        segments.push(segment);

        socket.to(effectiveRoom).emit('whiteboard-draw', { segment });
    });

    socket.on('whiteboard-clear', ({ roomId }: { roomId?: string }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        const effectiveRoom = roomId || senderRoom;
        if (effectiveRoom !== senderRoom) return;
        if (!isInRoom(effectiveRoom, socket.id)) return;

        clearSnapshot(effectiveRoom);
        socket.to(effectiveRoom).emit('whiteboard-clear');
    });

    socket.on('get-whiteboard-snapshot', ({ roomId }: { roomId?: string }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) return;

        const effectiveRoom = roomId || senderRoom;
        if (effectiveRoom !== senderRoom) return;
        if (!isInRoom(effectiveRoom, socket.id)) return;

        socket.emit('whiteboard-snapshot', { segments: getSnapshot(effectiveRoom) });
    });
}

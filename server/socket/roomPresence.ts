/**
 * In-memory room presence tracker.
 *
 * Maps roomId → Set of socket IDs currently in that room.
 * Also maps socketId → roomId so we can clean up on disconnect.
 */

const roomSockets = new Map<string, Set<string>>();
const socketRoom = new Map<string, string>();

export function joinRoom(roomId: string, socketId: string) {
    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(socketId);
    socketRoom.set(socketId, roomId);
}

export function leaveRoom(socketId: string) {
    const roomId = socketRoom.get(socketId);
    if (roomId) {
        roomSockets.get(roomId)?.delete(socketId);
        if (roomSockets.get(roomId)?.size === 0) {
            roomSockets.delete(roomId);
        }
        socketRoom.delete(socketId);
    }
}

export function isInRoom(roomId: string, socketId: string): boolean {
    return roomSockets.get(roomId)?.has(socketId) ?? false;
}

export function getRoomSockets(roomId: string): Set<string> {
    return roomSockets.get(roomId) ?? new Set();
}

export function getRoomForSocket(socketId: string): string | undefined {
    return socketRoom.get(socketId);
}

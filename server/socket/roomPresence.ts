const roomSockets = new Map<string, Set<string>>();
const socketRoom = new Map<string, string>();

export function joinRoom(roomId: string, socketId: string): void {
    if (!roomSockets.has(roomId)) {
        roomSockets.set(roomId, new Set());
    }
    roomSockets.get(roomId)!.add(socketId);
    socketRoom.set(socketId, roomId);
}

export function leaveRoom(socketId: string): string | undefined {
    const roomId = socketRoom.get(socketId);
    if (roomId) {
        const members = roomSockets.get(roomId);
        if (members) {
            members.delete(socketId);
            if (members.size === 0) {
                roomSockets.delete(roomId);
            }
        }
        socketRoom.delete(socketId);
    }
    return roomId;
}

export function isInRoom(roomId: string, socketId: string): boolean {
    return roomSockets.get(roomId)?.has(socketId) ?? false;
}

export function getRoomSockets(roomId: string): Set<string> {
    return roomSockets.get(roomId) ?? new Set();
}

export function getOtherSocketsInRoom(roomId: string, excludeSocketId: string): string[] {
    const members = roomSockets.get(roomId);
    if (!members) return [];
    return Array.from(members).filter((id) => id !== excludeSocketId);
}

export function getRoomForSocket(socketId: string): string | undefined {
    return socketRoom.get(socketId);
}

export function getRoomMemberCount(roomId: string): number {
    return roomSockets.get(roomId)?.size ?? 0;
}

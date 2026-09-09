import prisma from '../db.js';

export async function createRoom(hostId: string, rawTitle: unknown) {
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';

    if (title.length > 120) {
        throw Object.assign(new Error('Room title must be 120 characters or fewer.'), { status: 400 });
    }

    return prisma.room.create({
        data: {
            title: title || 'Untitled room',
            hostId,
        },
    });
}

export async function getRoom(roomId: string) {
    if (typeof roomId !== 'string' || !roomId) {
        throw Object.assign(new Error('Invalid room ID.'), { status: 400 });
    }

    const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, title: true, hostId: true, createdAt: true },
    });

    if (!room) {
        throw Object.assign(new Error('Room not found.'), { status: 404 });
    }

    return room;
}

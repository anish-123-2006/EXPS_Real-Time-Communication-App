import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { createRoom, getRoom } from '../services/roomService.js';
import prisma from '../db.js';

export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }

        const { password: _, ...safeProfile } = user;
        res.status(200).json(safeProfile);
    } catch {
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
}

export async function createNewRoom(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.userId) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }

        const room = await createRoom(req.userId, req.body.title);
        res.status(201).json(room);
    } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? 'Failed to create room.';
        res.status(status).json({ error: message });
    }
}

export async function getRoomById(req: AuthRequest, res: Response): Promise<void> {
    try {
        const roomId = req.params.roomId;
        if (!roomId || typeof roomId !== 'string') {
            res.status(400).json({ error: 'Room ID is required.' });
            return;
        }

        const room = await getRoom(roomId);
        res.status(200).json(room);
    } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? 'Failed to fetch room.';
        res.status(status).json({ error: message });
    }
}

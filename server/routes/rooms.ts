import { Router } from 'express';
import type { Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createRoom, getRoom } from '../services/roomService.js';
import prisma from '../db.js';

const router = Router();

router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId as string } });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const { password: _, ...safe } = user;
        return res.status(200).json(safe);
    } catch {
        return res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

router.post('/rooms', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const room = await createRoom(req.userId as string, req.body.title);
        return res.status(201).json(room);
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to create room.' });
    }
});

router.get('/rooms/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const room = await getRoom(req.params.roomId as string);
        return res.status(200).json(room);
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? 'Failed to fetch room.' });
    }
});

export default router;

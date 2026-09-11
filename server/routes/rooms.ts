import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getCurrentUser, createNewRoom, getRoomById } from '../controllers/roomController.js';

const router = Router();

router.get('/me', authenticateToken, getCurrentUser);
router.post('/rooms', authenticateToken, createNewRoom);
router.get('/rooms/:roomId', authenticateToken, getRoomById);

export default router;

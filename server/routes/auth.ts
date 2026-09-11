import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = Router();

router.post('/users', registerUser);
router.post('/login', loginUser);

export default router;

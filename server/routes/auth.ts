import { Router } from 'express';
import type { Request, Response } from 'express';
import { register, login } from '../services/authService.js';

const router = Router();

router.post('/users', async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password } = req.body;
        if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }
        const user = await register(name, email, password);
        return res.status(201).json(user);
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? 'Registration failed.' });
    }
});

router.post('/login', async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await login(email, password);
        return res.status(200).json({ message: 'Login successful.', token: result.token });
    } catch (err: any) {
        return res.status(err.status ?? 500).json({ error: err.message ?? 'Login failed.' });
    }
});

export default router;

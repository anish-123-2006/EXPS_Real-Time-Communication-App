import type { Request, Response } from 'express';
import { register, login } from '../services/authService.js';

// RFC-5322-inspired regex: local@domain.tld, no consecutive dots, reasonable length limits.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export async function registerUser(req: Request, res: Response): Promise<void> {
    try {
        const { name, email, password } = req.body;
        if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            res.status(400).json({ error: 'Name, email, and password are required.' });
            return;
        }

        if (!EMAIL_RE.test(email.trim())) {
            res.status(400).json({ error: 'Please enter a valid email address.' });
            return;
        }

        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            return;
        }

        const user = await register(name.trim(), email.trim().toLowerCase(), password);
        res.status(201).json(user);
    } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? 'Registration failed.';
        res.status(status).json({ error: message });
    }
}

export async function loginUser(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            res.status(400).json({ error: 'Email and password are required.' });
            return;
        }

        if (!EMAIL_RE.test(email.trim())) {
            res.status(400).json({ error: 'Please enter a valid email address.' });
            return;
        }

        const result = await login(email.trim().toLowerCase(), password);
        res.status(200).json({ message: 'Login successful.', token: result.token });
    } catch (err: unknown) {
        const status = (err as { status?: number }).status ?? 500;
        const message = (err as { message?: string }).message ?? 'Login failed.';
        res.status(status).json({ error: message });
    }
}

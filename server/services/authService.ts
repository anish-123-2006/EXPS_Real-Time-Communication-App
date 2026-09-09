import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const jwtSecret = process.env.JWT_SECRET as string;

export async function register(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedEmail || !normalizedName || password.length < 8) {
        throw Object.assign(new Error('Name, a valid email, and a password of at least 8 characters are required.'), { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
        throw Object.assign(new Error('An account with that email already exists.'), { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email: normalizedEmail, name: normalizedName, password: hashedPassword },
    });

    const { password: _, ...safe } = user;
    return safe;
}

export async function login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
        throw Object.assign(new Error('Email and password are required.'), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw Object.assign(new Error('Invalid email or password.'), { status: 401 });
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' });
    return { token };
}

import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET as string;

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
        next(new Error('Authentication required.'));
        return;
    }
    try {
        const payload = jwt.verify(token, jwtSecret) as { userId: string };
        socket.data.userId = payload.userId;
        next();
    } catch {
        next(new Error('Invalid or expired token.'));
    }
}

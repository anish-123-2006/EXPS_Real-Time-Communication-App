import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import prisma from './db.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set before starting the server.');
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
};

const server = http.createServer(app);

const io = new Server(server, {
    cors: { ...corsOptions, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 7 * 1024 * 1024,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' }
});

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
app.use('/users', authLimiter);
app.use('/login', authLimiter);
app.use(authRoutes);
app.use(roomRoutes);

import { socketAuthMiddleware } from './middleware/socketAuth.js';
import { joinRoom, leaveRoom, getRoomForSocket, getOtherSocketsInRoom, getRoomMemberCount } from './socket/roomPresence.js';
import { getSnapshot, pruneRoomSegments } from './socket/whiteboardHandlers.js';
import { registerSignalingHandlers } from './socket/signalingHandlers.js';
import { registerWhiteboardHandlers } from './socket/whiteboardHandlers.js';
import { registerFileHandlers } from './socket/fileHandlers.js';

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
    socket.on('join-room', async (roomId: unknown) => {
        if (typeof roomId !== 'string' || !roomId) {
            socket.emit('room-error', 'Invalid room identifier.');
            return;
        }

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true },
        });

        if (!room) {
            socket.emit('room-error', 'Room not found.');
            return;
        }

        socket.join(roomId);
        joinRoom(roomId, socket.id);

        const existingPeers = getOtherSocketsInRoom(roomId, socket.id);
        socket.emit('room-joined', { roomId, peers: existingPeers });

        const snapshot = getSnapshot(roomId);
        if (snapshot.length > 0) {
            socket.emit('whiteboard-snapshot', { segments: snapshot });
        }

        socket.to(roomId).emit('user-connected', socket.id);
    });

    registerSignalingHandlers(io, socket);
    registerWhiteboardHandlers(io, socket);
    registerFileHandlers(io, socket);

    socket.on('disconnect', () => {
        const roomId = getRoomForSocket(socket.id);
        if (roomId) {
            socket.to(roomId).emit('user-disconnected', socket.id);
        }
        leaveRoom(socket.id);
        
        if (roomId && getRoomMemberCount(roomId) === 0) {
            pruneRoomSegments(roomId);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

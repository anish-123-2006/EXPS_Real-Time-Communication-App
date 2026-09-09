import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
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
});

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Routes
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
app.use(authRoutes);
app.use(roomRoutes);

// Socket middleware & handlers
import { socketAuthMiddleware } from './middleware/socketAuth.js';
import { joinRoom, leaveRoom, getRoomForSocket } from './socket/roomPresence.js';
import { getSnapshot } from './socket/whiteboardHandlers.js';
import { registerSignalingHandlers } from './socket/signalingHandlers.js';
import { registerWhiteboardHandlers } from './socket/whiteboardHandlers.js';
import { registerFileHandlers } from './socket/fileHandlers.js';

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
    socket.on('join-room', async (roomId: unknown) => {
        if (typeof roomId !== 'string' || !roomId) {
            socket.emit('room-error', 'Invalid room.');
            return;
        }

        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!room) {
            socket.emit('room-error', 'Room not found.');
            return;
        }

        socket.join(roomId);
        joinRoom(roomId, socket.id);

        // Send existing whiteboard state to the late joiner.
        const snapshot = getSnapshot(roomId);
        if (snapshot.length > 0) {
            socket.emit('whiteboard-snapshot', { segments: snapshot });
        }

        // Notify existing participants.
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
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

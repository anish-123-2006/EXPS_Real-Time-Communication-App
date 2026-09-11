import type { Server, Socket } from 'socket.io';
import { isInRoom, getRoomForSocket } from './roomPresence.js';

// 5 MB binary limit. Base64 adds ~33% overhead; the extra 1 KB covers the data-URL header.
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_BYTES * 1.4) + 1024;

// Strict MIME type: token/token with no whitespace or special chars beyond hyphens, dots, and plus.
const MIME_TYPE_RE = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/;

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function isMimeAllowed(mime: string): boolean {
    if (!MIME_TYPE_RE.test(mime)) return false;
    if (ALLOWED_MIME_TYPES.has(mime)) return true;
    if (mime.startsWith('image/')) return true;
    if (mime.startsWith('text/')) return true;
    return false;
}

export interface FilePayload {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
    sharedAt: number;
}

export function registerFileHandlers(io: Server, socket: Socket): void {
    socket.on('file-share', ({ roomId, file }: { roomId?: string; file?: unknown }) => {
        const senderRoom = getRoomForSocket(socket.id);
        if (!senderRoom) {
            socket.emit('file-error', 'You must be inside an active room to share files.');
            return;
        }

        const effectiveRoom = roomId || senderRoom;
        if (effectiveRoom !== senderRoom || !isInRoom(effectiveRoom, socket.id)) {
            socket.emit('file-error', 'Room membership verification failed.');
            return;
        }

        if (!file || typeof file !== 'object') {
            socket.emit('file-error', 'Invalid file payload.');
            return;
        }

        const f = file as Record<string, unknown>;

        if (typeof f.name !== 'string' || !f.name.trim() || f.name.length > 255) {
            socket.emit('file-error', 'Invalid file name.');
            return;
        }

        if (typeof f.size !== 'number' || f.size <= 0 || f.size > MAX_BYTES) {
            socket.emit('file-error', `File size exceeds the 5 MB limit (received ${(Number(f.size || 0) / (1024 * 1024)).toFixed(1)} MB).`);
            return;
        }

        if (typeof f.mimeType !== 'string' || !isMimeAllowed(f.mimeType)) {
            socket.emit('file-error', 'Unsupported file type. Allowed formats: images, PDFs, text, and common office documents.');
            return;
        }

        if (
            typeof f.dataUrl !== 'string' ||
            !f.dataUrl.startsWith(`data:${f.mimeType};base64,`) ||
            f.dataUrl.length > MAX_DATA_URL_LENGTH
        ) {
            socket.emit('file-error', 'Invalid or oversized file data.');
            return;
        }

        // Accept sharedAt from client if it is within ±1 hour of server time; otherwise stamp now.
        const now = Date.now();
        const clientTs = typeof f.sharedAt === 'number' ? f.sharedAt : NaN;
        const sharedAt = Number.isFinite(clientTs) && Math.abs(clientTs - now) < 3_600_000
            ? clientTs
            : now;

        const sanitizedFile: FilePayload = {
            id: typeof f.id === 'string' && f.id ? f.id : `${now}-${Math.random().toString(36).slice(2, 8)}`,
            name: f.name.replace(/[^\w\s.-]/gi, '_').slice(0, 200),
            size: f.size,
            mimeType: f.mimeType,
            dataUrl: f.dataUrl,
            sharedAt,
        };

        socket.to(effectiveRoom).emit('file-share', { file: sanitizedFile });
    });
}

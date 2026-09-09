import type { Server, Socket } from 'socket.io';
import { isInRoom } from './roomPresence.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB expressed as data-URL characters

const ALLOWED_MIME_PREFIXES = [
    'image/',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-',
];

function isMimeAllowed(mimeType: string): boolean {
    return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

type FilePayload = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
    sharedAt: number;
};

export function registerFileHandlers(io: Server, socket: Socket) {
    socket.on('file-share', ({ roomId, file }: { roomId: string; file: FilePayload }) => {
        if (typeof roomId !== 'string' || !file) return;
        if (!isInRoom(roomId, socket.id)) return;

        // Validate size against the raw data URL length (conservative proxy for byte size).
        if (typeof file.dataUrl !== 'string' || file.dataUrl.length > MAX_BYTES * 1.4) {
            socket.emit('file-error', 'File is too large. The maximum allowed size is 5 MB.');
            return;
        }

        if (typeof file.mimeType !== 'string' || !isMimeAllowed(file.mimeType)) {
            socket.emit('file-error', 'File type is not allowed. You can share images, PDFs, text, and common office documents.');
            return;
        }

        socket.to(roomId).emit('file-share', { file });
    });
}

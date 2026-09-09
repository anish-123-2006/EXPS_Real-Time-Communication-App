import { useState, useRef, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export type SharedFilePayload = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
    sharedAt: number;
};

export type SharedFile = SharedFilePayload & {
    sizeLabel: string;
    isRemote: boolean;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_PREFIXES = [
    'image/',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-',
];

function formatBytes(size: number): string {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
    return `${size} B`;
}

function isMimeAllowed(mimeType: string): boolean {
    return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

export function useFileShare(socket: Socket | null, roomId: string) {
    const [files, setFiles] = useState<SharedFile[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const seenIds = useRef<Set<string>>(new Set());

    const pushFile = useCallback((payload: SharedFilePayload, isRemote: boolean) => {
        if (seenIds.current.has(payload.id)) return;
        seenIds.current.add(payload.id);
        setFiles((prev) => [
            { ...payload, sizeLabel: formatBytes(payload.size), isRemote },
            ...prev,
        ]);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleIncoming = ({ file }: { file: SharedFilePayload }) => pushFile(file, true);
        const handleError = (message: string) => setValidationError(message);

        socket.on('file-share', handleIncoming);
        socket.on('file-error', handleError);

        return () => {
            socket.off('file-share', handleIncoming);
            socket.off('file-error', handleError);
        };
    }, [socket, pushFile]);

    const addFiles = useCallback(
        async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) return;
            setValidationError(null);

            for (const file of Array.from(fileList)) {
                if (file.size > MAX_BYTES) {
                    setValidationError(
                        `"${file.name}" is too large (${formatBytes(file.size)}). The maximum allowed size is 5 MB.`
                    );
                    continue;
                }

                const mimeType = file.type || 'application/octet-stream';
                if (!isMimeAllowed(mimeType)) {
                    setValidationError(
                        `"${file.name}" cannot be shared. Allowed types: images, PDFs, text, and common office documents.`
                    );
                    continue;
                }

                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
                    reader.readAsDataURL(file);
                });

                const payload: SharedFilePayload = {
                    id: `${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
                    name: file.name,
                    size: file.size,
                    mimeType,
                    dataUrl,
                    sharedAt: Date.now(),
                };

                pushFile(payload, false);
                socket?.emit('file-share', { roomId, file: payload });
            }
        },
        [pushFile, roomId, socket]
    );

    const removeFile = useCallback((id: string) => {
        seenIds.current.delete(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    return { files, validationError, addFiles, removeFile };
}

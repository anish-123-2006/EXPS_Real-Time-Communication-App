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

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard limit

const ALLOWED_MIME_PREFIXES = [
    'image/',
    'application/pdf',
    'text/',
    'application/json',
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
    if (!mimeType) return false;
    return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

export function useFileShare(socket: Socket | null, roomId: string) {
    const [files, setFiles] = useState<SharedFile[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
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

        const handleIncoming = ({ file }: { file: SharedFilePayload }) => {
            pushFile(file, true);
        };

        const handleError = (message: string) => {
            setValidationError(message);
        };

        socket.on('file-share', handleIncoming);
        socket.on('file-error', handleError);

        return () => {
            socket.off('file-share', handleIncoming);
            socket.off('file-error', handleError);
        };
    }, [socket, pushFile]);

    const clearError = useCallback(() => {
        setValidationError(null);
    }, []);

    const addFiles = useCallback(
        async (fileList: FileList | null) => {
            if (!fileList || fileList.length === 0) return;
            setValidationError(null);

            const filesToProcess = Array.from(fileList);

            for (const file of filesToProcess) {
                if (file.size === 0) {
                    setValidationError(`"${file.name}" is empty (0 B) and cannot be shared.`);
                    continue;
                }

                if (file.size > MAX_BYTES) {
                    setValidationError(
                        `"${file.name}" is too large (${formatBytes(file.size)}). The maximum allowed file size is 5 MB.`
                    );
                    continue;
                }

                const mimeType = file.type || 'application/octet-stream';
                if (!isMimeAllowed(mimeType)) {
                    setValidationError(
                        `"${file.name}" has an unsupported file type. Allowed formats: images, PDFs, text, and common office documents.`
                    );
                    continue;
                }

                setIsUploading(true);
                try {
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
                        reader.readAsDataURL(file);
                    });

                    const payload: SharedFilePayload = {
                        id: `${Date.now()}-${file.name.slice(0, 30)}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
                        name: file.name,
                        size: file.size,
                        mimeType,
                        dataUrl,
                        sharedAt: Date.now(),
                    };

                    pushFile(payload, false);
                    socket?.emit('file-share', { roomId, file: payload });
                } catch (err: unknown) {
                    setValidationError((err as Error).message || `Could not read "${file.name}".`);
                } finally {
                    setIsUploading(false);
                }
            }
        },
        [pushFile, roomId, socket]
    );

    const removeFile = useCallback((id: string) => {
        seenIds.current.delete(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    return { files, validationError, isUploading, clearError, addFiles, removeFile };
}

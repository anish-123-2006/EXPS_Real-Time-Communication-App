import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

type DrawSegment = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    color: string;
    brushSize: number;
};

export function useWhiteboard(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    socket: Socket | null,
    roomId: string
) {
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    // Scale canvas to device pixel ratio and keep it in sync on resize.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            const ctx = canvas.getContext('2d');
            // Save current drawing before resize.
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;

            if (ctx) {
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                if (imageData) ctx.putImageData(imageData, 0, 0);
            }
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, [canvasRef]);

    const getPos = useCallback(
        (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        },
        []
    );

    const applySegment = useCallback(
        (ctx: CanvasRenderingContext2D, segment: DrawSegment) => {
            ctx.beginPath();
            ctx.moveTo(segment.fromX, segment.fromY);
            ctx.lineTo(segment.toX, segment.toY);
            ctx.strokeStyle = segment.color;
            ctx.lineWidth = segment.brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        },
        []
    );

    const startDraw = useCallback(
        (e: React.MouseEvent | React.TouchEvent, color: string, brushSize: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            isDrawing.current = true;
            lastPoint.current = getPos(e, canvas);
            void color; void brushSize; // referenced via closure in draw()
        },
        [canvasRef, getPos]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent, color: string, brushSize: number) => {
            if (!isDrawing.current || !lastPoint.current) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const next = getPos(e, canvas);
            const segment: DrawSegment = {
                fromX: lastPoint.current.x,
                fromY: lastPoint.current.y,
                toX: next.x,
                toY: next.y,
                color,
                brushSize,
            };

            applySegment(ctx, segment);
            lastPoint.current = next;
            socket?.emit('whiteboard-draw', { roomId, segment });
        },
        [canvasRef, getPos, applySegment, socket, roomId]
    );

    const stopDraw = useCallback(() => {
        isDrawing.current = false;
        lastPoint.current = null;
    }, []);

    const clearCanvas = useCallback(
        (emitToRoom: boolean) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (emitToRoom && socket) socket.emit('whiteboard-clear', { roomId });
        },
        [canvasRef, socket, roomId]
    );

    // Socket event listeners.
    useEffect(() => {
        if (!socket) return;

        const handleDraw = ({ segment }: { segment: DrawSegment }) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) applySegment(ctx, segment);
        };

        const handleClear = () => clearCanvas(false);

        // Replay full whiteboard history for late joiners.
        const handleSnapshot = ({ segments }: { segments: DrawSegment[] }) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!ctx) return;
            segments.forEach((seg) => applySegment(ctx, seg));
        };

        socket.on('whiteboard-draw', handleDraw);
        socket.on('whiteboard-clear', handleClear);
        socket.on('whiteboard-snapshot', handleSnapshot);

        return () => {
            socket.off('whiteboard-draw', handleDraw);
            socket.off('whiteboard-clear', handleClear);
            socket.off('whiteboard-snapshot', handleSnapshot);
        };
    }, [socket, canvasRef, applySegment, clearCanvas]);

    return { startDraw, draw, stopDraw, clearCanvas };
}

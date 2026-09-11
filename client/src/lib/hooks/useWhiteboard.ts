import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export type DrawSegment = {
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
    const lastPoint = useRef<{ normX: number; normY: number } | null>(null);
    const segmentsRef = useRef<DrawSegment[]>([]);

    const renderSegment = useCallback(
        (ctx: CanvasRenderingContext2D, segment: DrawSegment, width: number, height: number) => {
            const x1 = segment.fromX * width;
            const y1 = segment.fromY * height;
            const x2 = segment.toX * width;
            const y2 = segment.toY * height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = segment.color;
            ctx.lineWidth = Math.max(1, segment.brushSize);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        },
        []
    );

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        ctx.clearRect(0, 0, width, height);

        for (const seg of segmentsRef.current) {
            renderSegment(ctx, seg, width, height);
        }
    }, [canvasRef, renderSegment]);

    // Handle canvas dimensions and devicePixelRatio scaling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            if (width === 0 || height === 0) return;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
                ctx.scale(dpr, dpr);
                redrawAll();
            }
        };

        handleResize();

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvas);

        return () => {
            resizeObserver.disconnect();
        };
    }, [canvasRef, redrawAll]);

    // Request snapshot on mount or when socket connects to preserve late-joiner state
    useEffect(() => {
        if (!socket || !roomId) return;

        socket.emit('get-whiteboard-snapshot', { roomId });

        const isValidSegment = (s: any): s is DrawSegment => {
            return (
                typeof s === 'object' && s !== null &&
                typeof s.fromX === 'number' && s.fromX >= 0 && s.fromX <= 1 &&
                typeof s.fromY === 'number' && s.fromY >= 0 && s.fromY <= 1 &&
                typeof s.toX === 'number' && s.toX >= 0 && s.toX <= 1 &&
                typeof s.toY === 'number' && s.toY >= 0 && s.toY <= 1 &&
                typeof s.color === 'string' &&
                typeof s.brushSize === 'number' && s.brushSize > 0 && s.brushSize <= 50
            );
        };

        const handleSnapshot = ({ segments }: { segments: any[] }) => {
            if (Array.isArray(segments)) {
                segmentsRef.current = segments.filter(isValidSegment);
                redrawAll();
            }
        };

        const handleDraw = ({ segment }: { segment: any }) => {
            if (!isValidSegment(segment)) return;
            segmentsRef.current.push(segment);
            const canvas = canvasRef.current;
            if (canvas) {
                if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
                    redrawAll();
                } else {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        renderSegment(ctx, segment, canvas.offsetWidth, canvas.offsetHeight);
                    }
                }
            }
        };

        const handleClear = () => {
            segmentsRef.current = [];
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
                }
            }
        };

        socket.on('whiteboard-snapshot', handleSnapshot);
        socket.on('whiteboard-draw', handleDraw);
        socket.on('whiteboard-clear', handleClear);

        return () => {
            socket.off('whiteboard-snapshot', handleSnapshot);
            socket.off('whiteboard-draw', handleDraw);
            socket.off('whiteboard-clear', handleClear);
        };
    }, [socket, roomId, canvasRef, renderSegment, redrawAll]);

    const getNormalizedPos = useCallback(
        (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

            return { normX: x, normY: y };
        },
        []
    );

    const startDraw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            isDrawing.current = true;
            lastPoint.current = getNormalizedPos(e, canvas);
        },
        [canvasRef, getNormalizedPos]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent, color: string, brushSize: number) => {
            if (!isDrawing.current || !lastPoint.current) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const next = getNormalizedPos(e, canvas);

            const segment: DrawSegment = {
                fromX: lastPoint.current.normX,
                fromY: lastPoint.current.normY,
                toX: next.normX,
                toY: next.normY,
                color,
                brushSize,
            };

            segmentsRef.current.push(segment);
            renderSegment(ctx, segment, canvas.offsetWidth, canvas.offsetHeight);
            lastPoint.current = next;

            socket?.emit('whiteboard-draw', { roomId, segment });
        },
        [canvasRef, getNormalizedPos, renderSegment, socket, roomId]
    );

    const stopDraw = useCallback(() => {
        isDrawing.current = false;
        lastPoint.current = null;
    }, []);

    const clearCanvas = useCallback(
        (emitToRoom: boolean = true) => {
            segmentsRef.current = [];
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
                }
            }
            if (emitToRoom && socket) {
                socket.emit('whiteboard-clear', { roomId });
            }
        },
        [canvasRef, socket, roomId]
    );

    return { startDraw, draw, stopDraw, clearCanvas };
}

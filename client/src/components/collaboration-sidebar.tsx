"use client";

import { Trash2, FileUp, Download, File, X, Minus, Circle } from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Socket } from "socket.io-client";

type SharedFilePayload = {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
    sharedAt: number;
};

type SharedFile = SharedFilePayload & {
    sizeLabel: string;
    isRemote: boolean;
};

type DrawSegment = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    color: string;
    brushSize: number;
};

const COLORS = [
    { label: "White", hex: "#e4e4e7" },
    { label: "Blue", hex: "#3b82f6" },
    { label: "Red", hex: "#ef4444" },
    { label: "Green", hex: "#22c55e" },
    { label: "Yellow", hex: "#eab308" },
];

const SIZES = [
    { label: "S", value: 2 },
    { label: "M", value: 5 },
    { label: "L", value: 10 },
];

const formatBytes = (size: number) => {
    if (size >= 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (size >= 1024) {
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    }
    return `${size} B`;
};

function Whiteboard({ socket, roomId }: { socket: Socket | null; roomId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    const [color, setColor] = useState("#e4e4e7");
    const [brushSize, setBrushSize] = useState(5);

    const drawSegment = useCallback((ctx: CanvasRenderingContext2D, segment: DrawSegment) => {
        ctx.beginPath();
        ctx.moveTo(segment.fromX, segment.fromY);
        ctx.lineTo(segment.toX, segment.toY);
        ctx.strokeStyle = segment.color;
        ctx.lineWidth = segment.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }, []);

    const getPos = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }, []);

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const pos = getPos(e, canvas);
        isDrawing.current = true;
        lastPoint.current = pos;
    }, [getPos]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !lastPoint.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const nextPoint = getPos(e, canvas);
        const segment: DrawSegment = {
            fromX: lastPoint.current.x,
            fromY: lastPoint.current.y,
            toX: nextPoint.x,
            toY: nextPoint.y,
            color,
            brushSize,
        };

        drawSegment(ctx, segment);
        lastPoint.current = nextPoint;

        socket?.emit("whiteboard-draw", { roomId, segment });
    }, [brushSize, color, drawSegment, getPos, roomId, socket]);

    const stopDraw = useCallback(() => {
        isDrawing.current = false;
        lastPoint.current = null;
    }, []);

    const clearCanvas = useCallback((emitToRoom: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (emitToRoom && socket) {
            socket.emit("whiteboard-clear", { roomId });
        }
    }, [roomId, socket]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleRemoteDraw = ({ segment }: { segment: DrawSegment }) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            drawSegment(ctx, segment);
        };

        const handleRemoteClear = () => {
            clearCanvas(false);
        };

        socket.on("whiteboard-draw", handleRemoteDraw);
        socket.on("whiteboard-clear", handleRemoteClear);

        return () => {
            socket.off("whiteboard-draw", handleRemoteDraw);
            socket.off("whiteboard-clear", handleRemoteClear);
        };
    }, [clearCanvas, drawSegment, socket]);

    return (
        <div className="flex flex-col h-full gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-xl flex-wrap">
                <div className="flex gap-1.5 items-center">
                    {COLORS.map((c) => (
                        <button
                            key={c.hex}
                            onClick={() => setColor(c.hex)}
                            title={c.label}
                            style={{ background: c.hex }}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                                color === c.hex ? "border-white scale-110 shadow-md" : "border-transparent"
                            }`}
                        />
                    ))}
                </div>

                <div className="h-5 w-px bg-zinc-700 mx-1" />

                <div className="flex gap-1 items-center">
                    {SIZES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => setBrushSize(s.value)}
                            title={s.label}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                brushSize === s.value
                                    ? "bg-zinc-700 text-white"
                                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                            }`}
                        >
                            {s.value === 2 ? (
                                <Minus className="w-3 h-3" />
                            ) : s.value === 5 ? (
                                <Circle className="w-3.5 h-3.5" />
                            ) : (
                                <Circle className="w-5 h-5" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="ml-auto">
                    <button
                        onClick={() => clearCanvas(true)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Clear Board"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 min-h-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block cursor-crosshair touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                />
            </div>
        </div>
    );
}

function FileManager({ socket, roomId }: { socket: Socket | null; roomId: string }) {
    const [files, setFiles] = useState<SharedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const seenIds = useRef<Set<string>>(new Set());

    const pushSharedFile = useCallback((payload: SharedFilePayload, isRemote: boolean) => {
        if (seenIds.current.has(payload.id)) {
            return;
        }

        seenIds.current.add(payload.id);

        setFiles((prev) => [
            {
                ...payload,
                sizeLabel: formatBytes(payload.size),
                isRemote,
            },
            ...prev,
        ]);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleIncomingFile = ({ file }: { file: SharedFilePayload }) => {
            pushSharedFile(file, true);
        };

        socket.on("file-share", handleIncomingFile);

        return () => {
            socket.off("file-share", handleIncomingFile);
        };
    }, [pushSharedFile, socket]);

    const readFileAsDataUrl = useCallback((file: File) => {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(String(reader.result));
            };
            reader.onerror = () => {
                reject(new Error(`Failed to read ${file.name}`));
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const addFiles = useCallback(async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) {
            return;
        }

        const selectedFiles = Array.from(fileList);

        for (const file of selectedFiles) {
            const dataUrl = await readFileAsDataUrl(file);
            const payload: SharedFilePayload = {
                id: `${Date.now()}-${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                size: file.size,
                mimeType: file.type || "application/octet-stream",
                dataUrl,
                sharedAt: Date.now(),
            };

            pushSharedFile(payload, false);

            socket?.emit("file-share", {
                roomId,
                file: payload,
            });
        }
    }, [pushSharedFile, readFileAsDataUrl, roomId, socket]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        void addFiles(e.dataTransfer.files);
    }, [addFiles]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const removeFile = useCallback((id: string) => {
        seenIds.current.delete(id);
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const fileCountText = useMemo(() => {
        return `Shared Files (${files.length})`;
    }, [files.length]);

    return (
        <div className="flex flex-col gap-5 h-full">
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${
                    isDragging
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700"
                }`}
            >
                <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
                        isDragging ? "bg-blue-500/20" : "bg-zinc-900 group-hover:bg-zinc-800"
                    }`}
                >
                    <FileUp className="w-6 h-6 text-blue-400 transition-transform group-hover:scale-110" />
                </div>

                <h3 className="text-zinc-200 font-medium mb-1">Upload a File</h3>
                <p className="text-zinc-500 text-sm mb-5">
                    {isDragging ? "Drop it!" : "Drag and drop or click to browse"}
                </p>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        inputRef.current?.click();
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                    Browse Files
                </button>

                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        void addFiles(e.target.files);
                    }}
                />
            </div>

            {files.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-3">
                    <h4 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider px-1">
                        {fileCountText}
                    </h4>

                    {files.map((f) => (
                        <div
                            key={f.id}
                            className="flex items-center justify-between p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900 transition-colors group"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center shrink-0 border border-zinc-800">
                                    <File className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{f.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {f.sizeLabel} {f.isRemote ? "- received" : "- shared by you"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <a
                                    href={f.dataUrl}
                                    download={f.name}
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </a>

                                <button
                                    onClick={() => removeFile(f.id)}
                                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CollaborationSidebar({
    isOpen,
    onClose,
    roomId,
    activeTab,
    onTabChange,
    socket,
}: {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
    activeTab: "whiteboard" | "files";
    onTabChange: (tab: "whiteboard" | "files") => void;
    socket: Socket | null;
}) {
    if (!isOpen) return null;

    return (
        <div className="w-80 lg:w-96 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950 shrink-0">
                <div className="flex gap-2">
                    {(["whiteboard", "files"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                                activeTab === tab
                                    ? "bg-zinc-800 text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                            }`}
                        >
                            {tab === "whiteboard" ? "Whiteboard" : "Files"}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-hidden p-4">
                {activeTab === "whiteboard" ? (
                    <Whiteboard socket={socket} roomId={roomId} />
                ) : (
                    <FileManager socket={socket} roomId={roomId} />
                )}
            </div>
        </div>
    );
}

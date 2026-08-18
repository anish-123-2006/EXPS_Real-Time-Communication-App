"use client";

import { Trash2, FileUp, Download, File, X, Minus, Circle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

// ─────────── Types ───────────
type SharedFile = { name: string; size: string; url: string };

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

// ─────────── Whiteboard ───────────
function Whiteboard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const [color, setColor] = useState("#e4e4e7");
    const [brushSize, setBrushSize] = useState(5);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        isDrawing.current = true;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }, []);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }, [color, brushSize]);

    const stopDraw = useCallback(() => {
        isDrawing.current = false;
    }, []);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Set canvas dimensions on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }, []);

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2 rounded-xl flex-wrap">
                {/* Colors */}
                <div className="flex gap-1.5 items-center">
                    {COLORS.map(c => (
                        <button
                            key={c.hex}
                            onClick={() => setColor(c.hex)}
                            title={c.label}
                            style={{ background: c.hex }}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${color === c.hex ? "border-white scale-110 shadow-md" : "border-transparent"}`}
                        />
                    ))}
                </div>
                <div className="h-5 w-px bg-zinc-700 mx-1" />
                {/* Sizes */}
                <div className="flex gap-1 items-center">
                    {SIZES.map(s => (
                        <button
                            key={s.value}
                            onClick={() => setBrushSize(s.value)}
                            title={s.label}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${brushSize === s.value ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white hover:bg-zinc-800"}`}
                        >
                            {s.value === 2 ? <Minus className="w-3 h-3" /> : s.value === 5 ? <Circle className="w-3.5 h-3.5" /> : <Circle className="w-5 h-5" />}
                        </button>
                    ))}
                </div>
                <div className="ml-auto">
                    <button
                        onClick={clearCanvas}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Clear Board"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas */}
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

// ─────────── File Manager ───────────
function FileManager() {
    const [files, setFiles] = useState<SharedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const newFiles: SharedFile[] = Array.from(fileList).map(f => ({
            name: f.name,
            size: f.size > 1024 * 1024
                ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(f.size / 1024).toFixed(0)} KB`,
            url: URL.createObjectURL(f),
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);

    const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Drop Zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group
          ${isDragging ? "border-blue-500 bg-blue-500/5" : "border-zinc-800 hover:bg-zinc-900/50 hover:border-zinc-700"}`}
            >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? "bg-blue-500/20" : "bg-zinc-900 group-hover:bg-zinc-800"}`}>
                    <FileUp className={`w-6 h-6 transition-transform group-hover:scale-110 ${isDragging ? "text-blue-400" : "text-blue-400"}`} />
                </div>
                <h3 className="text-zinc-200 font-medium mb-1">Upload a File</h3>
                <p className="text-zinc-500 text-sm mb-5">
                    {isDragging ? "Drop it!" : "Drag and drop or click to browse"}
                </p>
                <button
                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                    Browse Files
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => addFiles(e.target.files)}
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-3">
                    <h4 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider px-1">Shared Files ({files.length})</h4>
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900 transition-colors group">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center shrink-0 border border-zinc-800">
                                    <File className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{f.name}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">{f.size}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <a
                                    href={f.url}
                                    download={f.name}
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => removeFile(i)}
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

// ─────────── Sidebar Shell ───────────
export function CollaborationSidebar({
    isOpen,
    onClose,
    defaultTab = "whiteboard",
}: {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: "whiteboard" | "files";
}) {
    const [activeTab, setActiveTab] = useState<"whiteboard" | "files">(defaultTab);

    // Sync tab when defaultTab changes (dock button press)
    useEffect(() => {
        if (isOpen) setActiveTab(defaultTab);
    }, [defaultTab, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="w-80 lg:w-96 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950 shrink-0">
                <div className="flex gap-2">
                    {(["whiteboard", "files"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${activeTab === tab ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            {tab === "whiteboard" ? "Whiteboard" : "Files"}
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
                {activeTab === "whiteboard" ? <Whiteboard /> : <FileManager />}
            </div>
        </div>
    );
}


export function CollaborationSidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<"whiteboard" | "files">("whiteboard");

    if (!isOpen) return null;

    return (
        <div className="w-80 lg:w-96 h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0">
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("whiteboard")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'whiteboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Whiteboard
                    </button>
                    <button
                        onClick={() => setActiveTab("files")}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'files' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Files
                    </button>
                </div>
                <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 h-full">
                {activeTab === "whiteboard" ? (
                    <div className="flex flex-col h-full gap-4">
                        <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded-xl sticky top-0 z-10 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-zinc-500" />
                                <div className="flex gap-1.5">
                                    <button className="w-6 h-6 rounded-full bg-zinc-950 border-2 border-zinc-700 hover:scale-110 transition-transform"></button>
                                    <button className="w-6 h-6 rounded-full bg-blue-500 border-2 border-transparent hover:scale-110 transition-transform shadow-[0_0_10px_rgba(37,99,235,0.4)] ring-2 ring-white/10"></button>
                                    <button className="w-6 h-6 rounded-full bg-red-500 border-2 border-transparent hover:scale-110 transition-transform shadow-[0_0_10px_rgba(239,68,68,0.4)]"></button>
                                </div>
                            </div>
                            <div className="flex gap-2 border-l border-zinc-800 pl-2">
                                <button className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"><div className="w-1 h-1 bg-current rounded-full"></div></button>
                                <button className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"><div className="w-2 h-2 bg-current rounded-full"></div></button>
                                <button className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-white transition-colors bg-zinc-800 rounded-md"><div className="w-4 h-4 bg-current rounded-full"></div></button>
                            </div>
                            <button className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border-l border-zinc-800 pl-2" title="Clear Board">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 bg-zinc-900 rounded-xl overflow-hidden cursor-crosshair border border-zinc-800 flex items-center justify-center relative inner-shadow">
                            <span className="text-zinc-700 font-medium select-none flex flex-col items-center gap-2">
                                <Palette className="w-8 h-8 opacity-20" />
                                Blank Canvas
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-6">
                        <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-900/50 hover:border-zinc-700 transition-colors cursor-pointer group">
                            <div className="w-14 h-14 bg-zinc-900 group-hover:bg-zinc-800 rounded-full flex items-center justify-center mb-4 transition-colors">
                                <FileUp className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <h3 className="text-zinc-200 font-medium mb-1">Upload a File</h3>
                            <p className="text-zinc-500 text-sm mb-5">Drag and drop or select to browse</p>
                            <button className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm">
                                Browse Files
                            </button>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-4 px-1">Shared Files</h4>
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl group hover:border-zinc-700 hover:bg-zinc-900 transition-colors w-full cursor-pointer">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center shrink-0 border border-zinc-800 shadow-inner">
                                                <File className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="truncate text-left">
                                                <p className="text-sm font-medium text-zinc-200 truncate">Quarterly_Report_v{i}.pdf</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">2.4 MB • Shared by Alex</p>
                                            </div>
                                        </div>
                                        <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg shrink-0 transition-colors">
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import { User, LogOut } from "lucide-react";
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getAuthTokenSnapshot() {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function subscribeAuth(callback: () => void) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
}

export function Navbar() {
    const router = useRouter();
    const token = useSyncExternalStore(subscribeAuth, getAuthTokenSnapshot, () => null);
    const isAuthenticated = Boolean(token);
    const [fetchedName, setFetchedName] = useState("");
    const userName = token ? fetchedName : "";

    useEffect(() => {
        if (!token) return;

        let isSubscribed = true;
        import("@/lib/api").then(({ default: api }) => {
            api.get("/me").then((res) => {
                if (isSubscribed) {
                    setFetchedName(res.data.name || res.data.email || "");
                }
            }).catch(() => {
                localStorage.removeItem("token");
                window.dispatchEvent(new Event("storage"));
            });
        });

        return () => {
            isSubscribed = false;
        };
    }, [token]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event("storage"));
        setFetchedName("");
        router.push("/");
    };

    return (
        <nav className="w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight text-white cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    Meshly
                </Link>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Dashboard
                            </Link>
                            <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                    <User className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="flex-col hidden sm:flex pr-2">
                                    <span className="text-sm font-medium text-zinc-200 leading-tight">{userName || "User"}</span>
                                    <span className="text-xs text-zinc-500 leading-tight">Signed in</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-xl transition-all"
                                title="Log Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                            >
                                Log In
                            </Link>
                            <Link
                                href="/register"
                                className="px-5 py-2 text-sm font-medium bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

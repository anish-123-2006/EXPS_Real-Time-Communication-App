"use client";

import { User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { AuthModal } from "./auth-modal";
import Link from "next/link";

type AuthMode = "login" | "register";

export function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>("login");
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [userName, setUserName] = useState("");

    useEffect(() => {
        setIsAuthenticated(Boolean(localStorage.getItem("token")));
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        import("@/lib/api").then(({ default: api }) => {
            api.get("/me").then((res) => {
                setUserName(res.data.name || res.data.email || "");
            }).catch(() => {});
        });
    }, [isAuthenticated]);

    const openAuth = (mode: AuthMode) => {
        setAuthMode(mode);
        setIsAuthOpen(true);
    };

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
        import("@/lib/api").then(({ default: api }) => {
            api.get("/me").then((res) => {
                setUserName(res.data.name || res.data.email || "");
            }).catch(() => {});
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUserName("");
    };

    return (
        <>
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
                                <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                        <User className="w-4 h-4 text-zinc-400" />
                                    </div>
                                    <div className="flex-col hidden sm:flex pr-2">
                                        <span className="text-sm font-medium text-zinc-200 leading-tight">{userName || "User"}</span>
                                        <span className="text-xs text-zinc-500 leading-tight">Signed in</span>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-xl transition-all" title="Log Out">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => openAuth("login")}
                                    className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => openAuth("register")}
                                    className="px-5 py-2 text-sm font-medium bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition-colors shadow-sm"
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onAuthSuccess={handleAuthSuccess}
                initialMode={authMode}
            />
        </>
    );
}

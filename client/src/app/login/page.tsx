"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Navbar } from "@/components/navbar";

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const data = (error as { response?: { data?: { error?: unknown } } }).response?.data;
        if (typeof data?.error === "string") return data.error;
    }
    return fallback;
};

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await api.post("/login", formData);
            localStorage.setItem("token", response.data.token);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, "Login failed. Please check your credentials."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-blue-500/30">
            <Navbar />
            <main className="relative flex flex-1 items-center justify-center p-4 sm:p-6 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 -z-0 h-[450px] w-[450px] rounded-full bg-blue-600/15 blur-[120px]" />
                <div className="absolute right-1/4 bottom-1/4 -z-0 h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[100px]" />

                <div className="relative z-10 w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
                        <p className="mt-2 text-sm text-zinc-400">Sign in to your Meshly account</p>
                    </div>

                    {error && (
                        <div className="mb-6 text-sm text-red-400 bg-red-500/10 p-3.5 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] disabled:opacity-50 mt-2 cursor-pointer"
                        >
                            {isLoading ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-zinc-400">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            Sign up here
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
import { X } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";

export function AuthModal({ isOpen, onClose, onAuthSuccess }: { isOpen: boolean; onClose: () => void; onAuthSuccess?: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const res = await api.post('/login', { email, password });
                localStorage.setItem('token', res.data.token);
            } else {
                await api.post('/users', { name, email, password });
                // Automatically login after signup (optional) or just inform user
                const loginRes = await api.post('/login', { email, password });
                localStorage.setItem('token', loginRes.data.token);
            }
            if (onAuthSuccess) onAuthSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden relative">
                <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-white">{isLogin ? "Welcome Back" : "Create an Account"}</h2>

                    {error && <div className="mb-4 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="John Doe" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="you@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="••••••••" />
                        </div>
                        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-6 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] disabled:opacity-50">
                            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        {isLogin ? (
                            <p className="text-zinc-400 text-sm">
                                Don't have an account?{" "}
                                <button onClick={() => setIsLogin(false)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign up here</button>
                            </p>
                        ) : (
                            <p className="text-zinc-400 text-sm">
                                Already have an account?{" "}
                                <button onClick={() => setIsLogin(true)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Log in here</button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

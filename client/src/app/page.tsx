import { Navbar } from "@/components/navbar";
import { ArrowRight, Video } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10"></div>

        <div className="max-w-3xl w-full space-y-12 text-center z-10">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 drop-shadow-sm">
              Collaborate in <br className="hidden md:block" /> Real-Time
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Experience seamless, high-quality video conferencing and interactive collaboration. Built for modern teams who demand performance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 w-full max-w-xl mx-auto">
            <div className="relative w-full sm:flex-1 h-12 md:h-14">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Video className="w-5 h-5 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Enter Room ID"
                className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono shadow-inner"
              />
            </div>

            <Link
              href="/room/demo-123"
              className="flex items-center justify-center gap-2 w-full sm:w-auto h-12 md:h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] group"
            >
              Join Room
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="pt-8 flex items-center justify-center gap-2">
            <div className="h-px bg-zinc-800 w-16 md:w-24"></div>
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">or</span>
            <div className="h-px bg-zinc-800 w-16 md:w-24"></div>
          </div>

          <div>
            <Link
              href="/room/new"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 text-white font-medium rounded-xl transition-all hover:border-zinc-600 group"
            >
              Create New Room
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
"use client";

import { Navbar } from "@/components/navbar";
import { ArrowRight, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getRoomId } from "@/lib/room-id";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const joinRoom = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedRoomId = getRoomId(roomId);
    if (normalizedRoomId) router.push(`/room/${encodeURIComponent(normalizedRoomId)}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-blue-500/30">
      <Navbar />
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-6">
        <div className="absolute top-1/4 left-1/4 -z-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/4 -z-0 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
        <div className="z-10 w-full max-w-3xl space-y-12 text-center">
          <div className="space-y-6">
            <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 md:text-7xl">Collaborate in real time</h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">Create a secure video room, share its link, and work together without a demo workspace.</p>
          </div>
          <form onSubmit={joinRoom} className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="relative h-12 w-full sm:h-14 sm:flex-1">
              <Video className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input value={roomId} onChange={(event) => setRoomId(event.target.value)} type="text" placeholder="Enter a room ID" className="h-full w-full rounded-xl border border-zinc-800 bg-zinc-900 py-0 pr-4 pl-12 font-mono text-white shadow-inner placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none" required />
            </div>
            <button className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-700 sm:h-14 sm:w-auto">Join room <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
          </form>
          <div className="flex items-center justify-center gap-2 pt-2"><div className="h-px w-16 bg-zinc-800" /><span className="text-sm font-medium tracking-wider text-zinc-500 uppercase">or</span><div className="h-px w-16 bg-zinc-800" /></div>
          <button onClick={() => router.push("/dashboard")} className="rounded-xl border border-zinc-700/50 bg-zinc-900 px-8 py-3.5 font-medium text-white transition-all hover:border-zinc-600 hover:bg-zinc-800">Create a room</button>
        </div>
      </main>
    </div>
  );
}

"use client";

import api from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoomId } from "@/lib/room-id";

export default function DashboardPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { if (!localStorage.getItem("token")) router.replace("/login"); }, [router]);

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setIsCreating(true);
    try { const response = await api.post("/rooms", { title }); router.push(`/room/${response.data.id}`); }
    catch { setError("Unable to create the room. Please sign in again and retry."); }
    finally { setIsCreating(false); }
  };
  const handleJoinRoom = (event: React.FormEvent) => {
    event.preventDefault(); const id = getRoomId(joinRoomId); if (id) router.push(`/room/${encodeURIComponent(id)}`);
  };

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-50"><div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl sm:p-8"><h1 className="text-center text-3xl font-bold">Your rooms</h1><p className="mt-2 text-center text-zinc-400">Start a meeting or join one with an invite link.</p>{error && <p role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-300">{error}</p>}<div className="mt-8 grid gap-6 md:grid-cols-2"><form onSubmit={handleCreateRoom} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6"><h2 className="text-xl font-semibold">Start a meeting</h2><p className="mt-2 text-sm text-zinc-400">Give your room a recognizable name, then share the link.</p><label className="mt-5 block text-sm font-medium">Room name <span className="text-zinc-500">(optional)</span></label><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Project planning" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500" /><button disabled={isCreating} className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-semibold disabled:opacity-60">{isCreating ? "Creating…" : "Create room"}</button></form><form onSubmit={handleJoinRoom} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6"><h2 className="text-xl font-semibold">Join a meeting</h2><p className="mt-2 text-sm text-zinc-400">Paste the room ID from an invite link.</p><label className="mt-5 block text-sm font-medium" htmlFor="room-id">Room ID</label><input id="room-id" value={joinRoomId} onChange={(event) => setJoinRoomId(event.target.value)} required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" /><button className="mt-4 w-full rounded-lg bg-zinc-700 py-2.5 font-semibold hover:bg-zinc-600">Join room</button></form></div></div></main>;
}

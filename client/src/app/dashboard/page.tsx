"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  
  // State for when a user wants to join a room that already exists
  const [joinRoomId, setJoinRoomId] = useState("");
  const [error, setError] = useState("");

  // THIS IS YOUR PREDICTION CODE AT WORK!
  const handleCreateRoom = async () => {
    setError("");
    try {
      // 1. Ask the backend to create a room
      const response = await api.post("/rooms", { title: "My Quick Meeting" });
      
      // 2. Grab the new ID from the database response
      const newRoomId = response.data.id;
      
      // 3. Teleport the user to that specific room's URL
      router.push(`/room/${newRoomId}`);
    } catch (err) {
      setError("Failed to create a new room. Are you logged in?");
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      // Teleport the user to the URL of the ID they typed in
      router.push(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Welcome to your Dashboard</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-center">{error}</div>}

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: Create Room */}
          <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Start a Meeting</h2>
            <p className="text-sm text-blue-700 mb-6 text-center">Create a new secure video room and invite others.</p>
            <button 
              onClick={handleCreateRoom}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 transition shadow-md"
            >
              Create New Room
            </button>
          </div>

          {/* RIGHT SIDE: Join Room */}
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Join a Meeting</h2>
            <p className="text-sm text-gray-600 mb-6 text-center">Enter a Room ID provided by your host.</p>
            
            <form onSubmit={handleJoinRoom} className="w-full flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Paste Room ID here..."
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 text-center font-mono"
                required 
              />
              <button 
                type="submit" 
                className="w-full bg-gray-800 text-white font-bold py-3 px-4 rounded hover:bg-gray-900 transition shadow-md"
              >
                Join Room
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
<h1 align="center">🎥 Meshly</h1>

<h4 align="center">Real-time video conferencing, collaboration whiteboard, and peer-to-peer file sharing platform.</h4>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

---

## Overview

Meshly provides real-time multi-participant video calling, an interactive collaborative whiteboard, and in-room file sharing. It is built as a TypeScript monorepo with an Express and Socket.IO backend and a Next.js frontend with Tailwind CSS.

### Core Capabilities

- **Explicit Authentication Journeys**: Dedicated `/login` and `/register` pages with form validation and JWT session handling.
- **Multi-Participant WebRTC Mesh**: Peer connections and remote streams indexed by participant ID, rendering individual video tiles for each room participant.
- **Room-Guarded Real-Time Security**: The Socket.IO server validates room membership for both sender and recipient before relaying WebRTC offers, answers, ICE candidates, whiteboard strokes, or shared files.
- **Strict File Sharing Controls**: 5 MB file size limit and MIME-type restrictions with pre-read validation and user error alerts.
- **Display-Independent Whiteboard**: Normalized vector coordinates (`0.0` to `1.0`) with DPI-aware scaling and automatic snapshot restoration for late joiners.
- **Reliable Screen Sharing**: Single-button toggle, permission denial handling, native track end detection, and comprehensive track termination upon leaving the room.
- **Layered Architecture**: Clear separation of concerns into routes, controllers, services, socket handlers, and specialized React hooks.

---

## Architecture & Module Structure

```
EXPS_Real-Time-Communication-App/
├── client/                      # Next.js frontend
│   └── src/
│       ├── app/                 # App Router pages (/login, /register, /dashboard, /room/[roomId])
│       ├── components/          # VideoGrid, CollaborationSidebar, BottomDock, Navbar
│       └── lib/
│           ├── api.ts           # Axios HTTP client with JWT interceptor
│           ├── runtime-config.ts# Environment variable configuration
│           └── hooks/
│               ├── useMedia.ts       # Camera/mic controls, screen sharing, track cleanup
│               ├── useSignaling.ts   # Multi-peer WebRTC mesh & candidate queueing
│               ├── useWhiteboard.ts  # Normalized vector whiteboard & snapshot replay
│               └── useFileShare.ts   # Client-side 5 MB file validation & transfer
└── server/                      # Express + Socket.IO backend
    ├── controllers/
    │   ├── authController.ts    # Registration and login HTTP handlers
    │   └── roomController.ts    # Room creation, lookup, and user profile handlers
    ├── middleware/
    │   ├── auth.ts              # Express JWT bearer token middleware
    │   └── socketAuth.ts        # Socket.IO handshake authentication middleware
    ├── routes/
    │   ├── auth.ts              # POST /users, POST /login
    │   └── rooms.ts             # GET /me, POST /rooms, GET /rooms/:roomId
    ├── services/
    │   ├── authService.ts       # Password hashing & JWT signing
    │   └── roomService.ts       # Room persistence via Prisma
    ├── socket/
    │   ├── roomPresence.ts      # In-memory room membership and presence tracker
    │   ├── signalingHandlers.ts # Room-guarded WebRTC offer/answer/ICE candidate relay
    │   ├── whiteboardHandlers.ts# Room-guarded vector stroke relay and snapshot buffer
    │   └── fileHandlers.ts      # 5 MB file payload validation and distribution
    ├── prisma/
    │   └── schema.prisma        # Database schema for User and Room models
    ├── db.ts                    # Prisma singleton instance
    └── index.ts                 # Server initialization and middleware composition
```

---

## WebRTC Signaling Flow

```
Participant A (In Room)            Signaling Server (Socket.IO)            Participant B (Joining)
      |                                      |                                       |
      |                                      | <---------- join-room (roomId) ------ |
      |                                      | ----------- room-joined ------------> |
      | <--------- user-connected -----------|                                       |
      |                                      |                                       |
      | ------- send-webrtc-offer ---------> | (Verifies both in roomId)             |
      |                                      | --------- receive-webrtc-offer -----> |
      |                                      |                                       |
      |                                      | <-------- send-webrtc-answer -------- |
      |                                      | (Verifies both in roomId)             |
      | <------ receive-webrtc-answer -------|                                       |
      |                                      |                                       |
      | <====== ICE Candidate Exchange (Tagged with sender socket ID) =============> |
      |                                      |                                       |
      | <================ Direct Peer-to-Peer Video/Audio Mesh =====================> |
```

1. When a new participant joins, the server validates their JWT and room existence, joins them to the room, and broadcasts `user-connected` to existing members.
2. Existing participants create an `RTCPeerConnection` for the new peer ID, create an SDP offer, and send it through the server.
3. The server validates that both sender and target belong to the room, injects `callerId: socket.id`, and delivers the offer.
4. The joining participant creates their peer connection, sets the remote description, flushes any queued ICE candidates, creates an SDP answer, and returns it with their target ID.
5. The server injects `responderId: socket.id` and forwards the answer.
6. ICE candidates are tagged with `from: socket.id` and queued if the remote description has not yet been processed.

---

## REST API Reference

| Method | Route | Authentication | Description |
|---|---|---|---|
| `GET` | `/health` | No | Server health check (`{ "status": "ok" }`) |
| `POST` | `/users` | No | User registration with name, email, and password |
| `POST` | `/login` | No | Authenticate user and return JWT |
| `GET` | `/me` | Yes (`Bearer <token>`) | Retrieve authenticated user profile |
| `POST` | `/rooms` | Yes (`Bearer <token>`) | Create a new room with an optional title |
| `GET` | `/rooms/:roomId` | Yes (`Bearer <token>`) | Retrieve room metadata and verify access |

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **PostgreSQL**: Running instance (local or hosted)

### 1. Server Configuration

Navigate to the server directory:

```bash
cd server
cp .env.example .env
npm install
```

Configure `server/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/meshly"
JWT_SECRET="your-secure-random-jwt-secret"
PORT=5000
CLIENT_ORIGIN="http://localhost:3000"
```

Apply database migrations:
```bash
npx prisma migrate deploy
```

Run the server in development mode:
```bash
npm run dev
```

### 2. Client Configuration

In a separate terminal:

```bash
cd client
cp .env.example .env.local
npm install
```

Configure `client/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```

Run the client in development mode:
```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## Scripts

### Server
- `npm run dev`: Starts development server with `tsx watch`.
- `npm run typecheck`: Runs TypeScript compiler verification (`tsc --noEmit`).
- `npm run start`: Runs production server.

### Client
- `npm run dev`: Starts Next.js development server.
- `npm run build`: Generates production build.
- `npm run lint`: Runs ESLint checks.

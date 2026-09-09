# Meshly — Server

Express + Socket.IO server with Prisma (PostgreSQL via Neon).

## Structure

```
server/
├── index.ts              # Bootstrap: HTTP server, CORS, route/socket wiring
├── db.ts                 # Prisma singleton
├── middleware/
│   ├── auth.ts           # Express JWT middleware
│   └── socketAuth.ts     # Socket.IO JWT middleware
├── routes/
│   ├── auth.ts           # POST /users, POST /login
│   └── rooms.ts          # GET /me, POST /rooms, GET /rooms/:roomId
├── services/
│   ├── authService.ts    # register / login business logic
│   └── roomService.ts    # createRoom / getRoom business logic
├── socket/
│   ├── roomPresence.ts   # In-memory socket ↔ room membership tracker
│   ├── signalingHandlers.ts  # WebRTC offer / answer / ICE relay (room-guarded)
│   ├── whiteboardHandlers.ts # Draw / clear + per-room snapshot for late joiners
│   └── fileHandlers.ts   # File share with 5 MB limit + MIME whitelist
└── prisma/
    └── schema.prisma
```

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Secret used to sign / verify JWTs |
| `PORT` | Port to listen on (default: 5000) |
| `CLIENT_ORIGIN` | Comma-separated list of allowed CORS origins |

## Socket events

All real-time events require an authenticated socket (JWT in handshake auth). Before relaying WebRTC or whiteboard events the server confirms both sender and target are members of the same room.

| Event (client → server) | Description |
|---|---|
| `join-room` | Join a room; triggers snapshot replay for whiteboard |
| `send-webrtc-offer` | Relay SDP offer to a peer in the same room |
| `send-webrtc-answer` | Relay SDP answer back to caller |
| `send-ice-candidate` | Relay ICE candidate to a peer |
| `whiteboard-draw` | Broadcast a draw segment to the room |
| `whiteboard-clear` | Clear the room whiteboard |
| `file-share` | Share a file (≤ 5 MB, allowed MIME types only) |

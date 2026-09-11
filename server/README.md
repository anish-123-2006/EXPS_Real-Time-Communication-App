# Meshly — Server

Express and Socket.IO real-time backend with Prisma ORM and PostgreSQL.

## Structure

```
server/
├── controllers/
│   ├── authController.ts        # Handlers for POST /users and POST /login
│   └── roomController.ts        # Handlers for GET /me, POST /rooms, GET /rooms/:roomId
├── middleware/
│   ├── auth.ts                  # Express JWT Bearer token authentication
│   └── socketAuth.ts            # Socket.IO handshake JWT authentication
├── routes/
│   ├── auth.ts                  # Pure route declarations for auth endpoints
│   └── rooms.ts                 # Pure route declarations for room endpoints
├── services/
│   ├── authService.ts           # Password hashing (bcrypt) & JWT issuance
│   └── roomService.ts           # Room CRUD queries via Prisma
├── socket/
│   ├── roomPresence.ts          # In-memory socket-to-room presence manager
│   ├── signalingHandlers.ts     # Room-guarded WebRTC offer/answer/ICE candidate relay
│   ├── whiteboardHandlers.ts    # Room-guarded vector stroke relay and snapshot buffer
│   └── fileHandlers.ts          # Room-guarded file payload validation (5 MB max)
├── prisma/
│   └── schema.prisma            # Prisma schema for User and Room models
├── db.ts                        # Shared PrismaClient singleton
└── index.ts                     # HTTP + Socket.IO server initialization
```

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens |
| `PORT` | Port the HTTP and Socket.IO server listens on (default: 5000) |
| `CLIENT_ORIGIN` | Comma-separated list of allowed CORS origins (e.g. `http://localhost:3000`) |

## Socket.IO Events

All Socket.IO events require an authenticated socket connection (`token` in handshake auth). Before relaying WebRTC signals, whiteboard strokes, or shared files, the server verifies that both sender and recipient are members of the requested room.

| Event (Client → Server) | Payload | Description |
|---|---|---|
| `join-room` | `roomId` | Joins socket to room, sends snapshot to newcomer, broadcasts `user-connected` |
| `send-webrtc-offer` | `{ roomId, targetUserId, sdpOffer }` | Validates room membership and relays `receive-webrtc-offer` with sender's `callerId` |
| `send-webrtc-answer` | `{ roomId, targetUserId, sdpAnswer }` | Validates room membership and relays `receive-webrtc-answer` with sender's `responderId` |
| `send-ice-candidate` | `{ roomId, targetUserId, candidate }` | Validates room membership and relays `receive-ice-candidate` with sender's `from` ID |
| `whiteboard-draw` | `{ roomId, segment }` | Validates room membership and segment structure, buffers stroke, broadcasts to room |
| `whiteboard-clear` | `{ roomId }` | Validates room membership, clears room stroke buffer, broadcasts to room |
| `get-whiteboard-snapshot` | `{ roomId }` | Validates room membership and sends all buffered strokes to the requesting socket |
| `file-share` | `{ roomId, file }` | Validates room membership, 5 MB size limit, and MIME type; relays `file-share` |

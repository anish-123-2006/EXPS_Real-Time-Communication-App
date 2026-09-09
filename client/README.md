# Meshly — Client

Next.js 14 (App Router) frontend for the Meshly real-time collaboration app.

## Structure

```
client/src/
├── app/
│   ├── page.tsx              # Landing page (join or create room)
│   ├── dashboard/page.tsx    # Authenticated room management
│   └── room/[roomId]/page.tsx  # In-room experience
├── components/
│   ├── navbar.tsx            # Top nav with login / register modal trigger
│   ├── auth-modal.tsx        # Login + register form (initialMode prop)
│   ├── video-grid.tsx        # Multi-participant video tiles
│   ├── collaboration-sidebar.tsx  # Whiteboard + file share panel
│   └── bottom-dock.tsx       # Media controls + end meeting
└── lib/
    ├── api.ts                # Axios instance with JWT interceptor
    ├── runtime-config.ts     # Env-var exports
    ├── room-id.ts            # Room ID normalisation
    └── hooks/
        ├── useMedia.ts       # Camera stream, video/audio toggles, screen share
        ├── useSignaling.ts   # Socket.IO connection + multi-peer WebRTC signaling
        ├── useWhiteboard.ts  # Canvas drawing, DPI scaling, snapshot replay
        └── useFileShare.ts   # File validation (5 MB / MIME), send, receive
```

## Setup

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL
npm install
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend HTTP URL (default: http://localhost:5000) |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO URL (defaults to API_URL) |
| `NEXT_PUBLIC_TURN_URL` | Optional TURN server URL |
| `NEXT_PUBLIC_TURN_USERNAME` | Optional TURN username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Optional TURN credential |

## Key design decisions

- **Auth modal mode** — `Navbar` passes `initialMode="login"` or `"register"` explicitly; the modal resets its state on each open via `useEffect`.
- **Multi-peer video** — `useSignaling` keeps a `Map<socketId, RTCPeerConnection>` and a `Map<socketId, MediaStream>`. `VideoGrid` renders one tile per entry.
- **Screen share state** — `useMedia.startScreenShare` returns `false` if the browser denies permission so the UI never shows a false active state. The `screenTrack.onended` callback reverts to camera automatically.
- **File limits** — `useFileShare` rejects files above 5 MB or with disallowed MIME types before reading them, and surfaces a clear error message. The server enforces the same limits independently.
- **Whiteboard late-join** — The server accumulates draw segments per room and emits `whiteboard-snapshot` when a new socket joins. `useWhiteboard` replays the snapshot immediately.

# Meshly — Client

Next.js frontend for real-time video collaboration, multi-peer video mesh, interactive vector whiteboard, and file sharing.

## Structure

```
client/src/
├── app/
│   ├── page.tsx                 # Landing page (join or create room)
│   ├── login/page.tsx           # Dedicated login page with dark zinc UI
│   ├── register/page.tsx        # Dedicated registration page with dark zinc UI
│   ├── dashboard/page.tsx       # Authenticated room dashboard
│   └── room/[roomId]/page.tsx   # In-room collaboration experience
├── components/
│   ├── navbar.tsx               # Top navigation with explicit Log In / Sign Up actions
│   ├── video-grid.tsx           # Multi-participant video tiles with mute indicators
│   ├── collaboration-sidebar.tsx# Collaborative whiteboard and file manager sidebar
│   └── bottom-dock.tsx          # Audio, video, screen share, and leave controls
└── lib/
    ├── api.ts                   # Axios client with JWT request interceptor
    ├── runtime-config.ts        # Configuration helper for environment variables
    ├── room-id.ts               # Room ID parser and normalizer
    └── hooks/
        ├── useMedia.ts          # Local media stream, toggle tracks, screen share, cleanup
        ├── useSignaling.ts      # Multi-peer WebRTC mesh with participant ID indexing
        ├── useWhiteboard.ts     # Normalized vector drawing and snapshot synchronization
        └── useFileShare.ts      # Strict 5 MB limit, pre-read MIME validation, transfer
```

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend HTTP API URL | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO URL | `http://localhost:5000` |
| `NEXT_PUBLIC_TURN_URL` | Optional TURN server URL | — |
| `NEXT_PUBLIC_TURN_USERNAME` | Optional TURN username | — |
| `NEXT_PUBLIC_TURN_CREDENTIAL`| Optional TURN credential | — |

## Key Architectural Decisions

- **Explicit Auth Navigation**: Dedicated `/login` and `/register` routes ensure login and registration are separate, bookmarkable actions with clean validation and error feedback.
- **Multi-Peer WebRTC Mesh**: `useSignaling` maintains `Map<string, RTCPeerConnection>` and `Map<string, MediaStream>` keyed by participant ID. SDP answers and ICE candidates are routed specifically by participant ID with candidate queuing to avoid race conditions.
- **Display-Independent Whiteboard**: Coordinates are normalized to floats between `0.0` and `1.0`. Vector strokes are stored in memory and re-rendered on canvas resize via `ResizeObserver`, ensuring crisp lines on any screen resolution. The canvas automatically fetches the room snapshot on mount so late joiners see the current drawing state.
- **File Limits & Error Handling**: `useFileShare` validates file size (<= 5 MB) and MIME types before reading into memory, surfacing immediate error alerts. The server enforces the same checks before broadcasting.
- **Screen Share State Management**: Catches display media permission denial so the button never stays in a false active state. Automatically handles browser native stop actions and cleans up all screen tracks when leaving the room.

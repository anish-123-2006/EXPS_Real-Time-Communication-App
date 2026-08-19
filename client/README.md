# Meshly client

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set both public URLs to the API/WebSocket server address. Configure a TURN service for reliable production WebRTC connectivity.
3. Run `npm install` and `npm run dev`.

Use `npm run build` before deployment. Deploy the client with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` set to the public backend URL, and set the backend `CLIENT_ORIGIN` to the client URL.

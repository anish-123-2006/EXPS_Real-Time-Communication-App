<h1 align="center">
  <br>
  🎥 Meshly
  <br>
</h1>

<h4 align="center">A real-time video conferencing and collaboration platform built with WebRTC &amp; Socket.io</h4>

<p align="center">
  <a href="https://exps-real-time-communication-app.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 🔥 Features

- **🔐 Secure Authentication** — JWT-based user registration and login with bcrypt password hashing
- **📹 Peer-to-Peer Video Calls** — Browser-native WebRTC for low-latency, direct video/audio connections
- **⚡ Real-time Signaling** — Socket.io-powered signaling server to establish and manage WebRTC sessions
- **🏠 Meeting Rooms** — Create named rooms instantly and share a link to invite participants
- **🖥️ Modern UI** — Responsive, dark-themed interface built with Next.js 16 and Tailwind CSS v4
- **🛡️ Guarded Routes** — Authenticated-only access to rooms and user profiles
- **TURN Server Support** — Configurable TURN credentials for reliable connections across strict NAT/firewalls

---

## 🏗️ Architecture

Meshly follows a clean **client / server** monorepo structure:

```
EXPS_Real-Time-Communication-App/
├── client/          # Next.js 16 frontend (React 19, TypeScript, Tailwind CSS v4)
│   ├── src/
│   │   └── app/     # App Router pages and components
│   └── public/      # Static assets
└── server/          # Express 5 backend (TypeScript, Socket.io, Prisma)
    ├── middleware/   # JWT authentication middleware
    ├── prisma/       # Database schema and migrations
    └── generated/   # Prisma auto-generated client
```

### How it works

```
Browser A                   Signaling Server (Socket.io)           Browser B
   |  ------ join room --------->  |                                   |
   |                               |  <-------- join room ----------   |
   |  <----- peer joined --------  |                                   |
   |  ------ WebRTC Offer -------> |  ------- WebRTC Offer -------->   |
   |  <----- WebRTC Answer ------  |  <------ WebRTC Answer ---------  |
   |  <===== Direct P2P Video/Audio Stream (WebRTC) ================>  |
```

1. Users authenticate and create or join a **Room** (stored in PostgreSQL via Prisma).
2. The **Socket.io server** acts as a signaling relay, forwarding WebRTC offers, answers, and ICE candidates between peers.
3. Once the WebRTC handshake completes, media flows **directly between browsers** — the server is no longer in the media path.

---

## 🛠️ Tech Stack

### Frontend (`/client`)
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework & page routing |
| **React 19** | UI rendering |
| **TypeScript 5** | Static type safety |
| **Tailwind CSS v4** | Utility-first styling |
| **Socket.io-client 4** | Real-time signaling |
| **Lucide React** | Icon library |
| **Axios** | HTTP client for REST API calls |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| **Express 5** | HTTP REST API server |
| **TypeScript 7** | Static type safety |
| **Socket.io 4** | WebRTC signaling & real-time events |
| **Prisma 7** | ORM for database access |
| **PostgreSQL** | Persistent data store (users & rooms) |
| **JSON Web Tokens** | Stateless authentication |
| **bcrypt** | Secure password hashing |
| **tsx** | TypeScript execution without compilation |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A running **PostgreSQL** database (local or hosted, e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com))

### 1. Clone the repository

```bash
git clone https://github.com/anish-123-2006/EXPS_Real-Time-Communication-App.git
cd EXPS_Real-Time-Communication-App
```

### 2. Set up the Server

```bash
cd server

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# → Edit .env with your DATABASE_URL and JWT_SECRET (see Environment Variables below)

# Run database migrations
npm run db:deploy

# Start the development server (with hot-reload)
npm run dev
```

The server will start on **http://localhost:5000**.

### 3. Set up the Client

Open a new terminal:

```bash
cd client

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
# → Edit .env.local with your API and Socket URLs (see Environment Variables below)

# Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/meshly` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `a-long-random-secret-string` |
| `PORT` | Port the server listens on | `5000` |
| `CLIENT_ORIGIN` | Allowed CORS origin(s), comma-separated | `http://localhost:3000` |

> ⚠️ **Never commit your `.env` file.** Generate a strong `JWT_SECRET` using:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### Client (`client/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the Express backend | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | URL of the Socket.io server | `http://localhost:5000` |
| `NEXT_PUBLIC_TURN_URL` | TURN server URI (for NAT traversal) | `turn:turn.example.com:3478` |
| `NEXT_PUBLIC_TURN_USERNAME` | TURN server username | `meshly` |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | TURN server password/credential | `your-turn-credential` |

> 💡 **TURN server** is required for video calls between users behind strict firewalls or symmetric NAT. For development on the same network, STUN-only (no TURN) typically works fine.

---

## 📡 API Reference

All endpoints except `/users` (registration) and `/login` require a valid `Authorization: Bearer <token>` header.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Server health check |
| `GET` | `/ping` | ❌ | Connectivity check |
| `POST` | `/users` | ❌ | Register a new user |
| `POST` | `/login` | ❌ | Log in and receive a JWT |
| `GET` | `/me` | ✅ | Get the authenticated user's profile |
| `POST` | `/rooms` | ✅ | Create a new meeting room |
| `GET` | `/rooms/:roomId` | ✅ | Get room details by ID |

### Example: Register a new user

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "securepassword"}'
```

### Example: Create a room

```bash
curl -X POST http://localhost:5000/rooms \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Team Standup"}'
```

---

## 🗄️ Database Schema

Managed by **Prisma** with PostgreSQL.

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hash — never stored in plain text
  name      String
  createdAt DateTime @default(now())
  rooms     Room[]
}

model Room {
  id        String   @id @default(uuid())
  title     String?
  hostId    String
  createdAt DateTime @default(now())
  host      User     @relation(fields: [hostId], references: [id])
}
```

Run migrations after any schema changes:

```bash
cd server
npx prisma migrate dev --name <migration-name>
```

---

## ☁️ Deployment

The app is deployed as two separate services:

| Service | Platform | Notes |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Set root to `./client`, add all `NEXT_PUBLIC_*` env vars |
| **Backend** | [Render](https://render.com) / [Railway](https://railway.app) | Set root to `./server`, add all server env vars, run `npm run db:deploy` as a pre-deploy step |

### Deploying to Vercel (Client)

1. Import the repository in Vercel and set the **Root Directory** to `client`.
2. Add all `NEXT_PUBLIC_*` environment variables pointing to your deployed backend URL.
3. Deploy.

### Deploying the Server

1. Create a new Web Service on Render / Railway.
2. Set **Root Directory** to `server`.
3. Set **Build Command**: `npm install && npm run build && npm run db:deploy`
4. Set **Start Command**: `npm start`
5. Add all server environment variables.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/anish-123-2006">anish-123-2006</a>
</p>

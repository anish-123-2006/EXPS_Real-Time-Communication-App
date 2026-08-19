import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticatetoken } from './middleware/auth.js';
import type { AuthRequest } from './middleware/auth.js';
import http from 'http'; // Built into Node.js, no installation needed
import { Server } from 'socket.io';


//1.Initialize dotenv FIRST, before we use any environment variables
dotenv.config();
const app = express();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set before starting the server.");
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
};

// create the master HTTP server and give it our express app
const server=http.createServer(app);

//attach socket.io to the master server, and configure CORS just like we did for express
const io=new Server(server,{
    cors: { ...corsOptions, methods: ["GET", "POST"] }
})

// Allow requests from our Next.js frontend
app.use(cors(corsOptions));

// 2. Safely grab the port from the environment
const PORT = process.env.PORT || 5000;

// 3. Register Middleware
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'server is running' });
});






app.get('/ping', (req: Request, res: Response) => {
    res.status(200).json({ "message": "pong" })
})
/*
app.get-> tells the server: "If a user makes an HTTP GET request to the /health URL, run this function."

req-> contains information about the incoming request (like headers or parameters).

res-> is what we use to send data back to the user.

.status(200)-> sets the HTTP status code. 200 is the universal web standard for "OK / Success".

.json(...)-> sends a JSON object back to the browser.
*/

// Notice how we put `authenticateToken` right in the middle! 
// The request MUST pass the bouncer before it runs the code inside.
app.get('/me', authenticatetoken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        // Because the bouncer let them through, we KNOW req.userId is safe to use
        if (!req.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { id: req.userId }
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });

        }
        // Hide the password before sending the profile back
        const { password, ...userWithoutPassword } = user;

        res.status(200).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }

})

// POST route to create a new room
app.post('/rooms',authenticatetoken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { title } = req.body;
        const normalizedTitle = typeof title === "string" ? title.trim() : "";

        if (normalizedTitle.length > 120) {
            return res.status(400).json({ error: "Room title must be 120 characters or fewer." });
        }

        // Create the room in the database
        const newRoom = await prisma.room.create({
            data: {
                title: normalizedTitle || "Untitled room",
                // Look at this magic! The Bouncer verified the JWT and attached the userId to the request. 
                // We use it here to link the room to the user who clicked the button!
                hostId: req.userId as string, 
            }
        });

        res.status(201).json(newRoom);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create room" });
    }
});

app.get('/rooms/:roomId', authenticatetoken, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const roomId = req.params.roomId;
        if (typeof roomId !== "string") {
            return res.status(400).json({ error: "Invalid room ID." });
        }
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true, title: true, hostId: true, createdAt: true },
        });

        if (!room) {
            return res.status(404).json({ error: "Room not found." });
        }

        return res.status(200).json(room);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch room." });
    }
});

server.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
});

/*
app.listen tells the server to turn on, bind to port 5000 on your computer, and start listening for incoming network traffic.

The callback function (() => { ... }) runs exactly once, right after the server successfully starts.
*/

//npx tsx watch index.ts

// Excellent! You just built, compiled, and successfully ran your first TypeScript Express server. That {"status":"ok"} is proof that your browser made an HTTP GET request, your Node.js server caught it, processed it, and sent back a JSON response.

app.post('/users', async (req: Request, res: Response) => {
    try {
        // We will read the email, name, and password from the incoming request body
        const { email, name, password } = req.body;

        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
        const normalizedName = typeof name === "string" ? name.trim() : "";
        if (!normalizedEmail || !normalizedName || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ error: "Name, a valid email, and a password of at least 8 characters are required." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return res.status(409).json({ error: "An account with that email already exists." });
        }

        // 1. Generate the hash (The "Meat Grinder")
        // The '10' is the "salt rounds" - it determines how mathematically complex the hash is.
        // 10 is the industry standard balance between security and server speed.
        const hashedPassword = await bcrypt.hash(password, 10);


        // Tell Prisma to create a new user in the database
        // 2. Save the user with the HASHED password, not the raw one
        const newUser = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: normalizedName,
                password: hashedPassword,// <-- Saving the gibberish!
            }
        });

        // 3. Security best practice: Never send the password (even hashed) back to the frontend
        const { password: _, ...userWithoutPassword } = newUser;
        // const { password: _, ...userWithoutPassword } = newUser;: This is a clever TypeScript trick called Destructuring with Rest Parameters. It pulls the password out of the user object (naming it _ to throw it away) and bundles everything else (id, email, name, createdAt) into a new object called userWithoutPassword. This ensures we never accidentally leak password hashes to the frontend browser.

        // Send the newly created user back to the browser
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create user" });
    }
});



app.post('/login', async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        if (!normalizedEmail || typeof password !== "string") {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // 1. Check if a user with this email actually exists
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!user) {
            // 401 is the standard HTTP status for "Unauthorized"
            return res.status(401).json({ error: "invalid email or password" });
        }
        // 2. The Meat Grinder Comparison
        // We take the password they just typed in, run it through the exact same meat grinder,
        // and see if the resulting gibberish matches the gibberish in our database.
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        // 3. Issue the VIP Wristband (JWT)
        // We embed their user ID inside the token so we know exactly who is holding it
        const token = jwt.sign(
            { userId: user.id },
            jwtSecret,
            { expiresIn: '24h' } // The wristband expires in 24 hours
        );

        // 4. Send the token back to the user
        res.status(200).json({
            message: "login successful",
            token: token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "failed to login" });
    }
});


// The WebScocket Phone SwitchBoard
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
        next(new Error("Authentication required"));
        return;
    }

    try {
        socket.data.userId = (jwt.verify(token, jwtSecret) as { userId: string }).userId;
        next();
    } catch {
        next(new Error("Invalid or expired token"));
    }
});

io.on("connection",(socket)=>{
    //this run every time a users nextjs browser opens a websocket line
    console.log(`a user connected with socket id: ${socket.id}`);

    //listen for the custom "join-room" event
    socket.on("join-room", async (roomId: unknown) => {
        if (typeof roomId !== "string" || !roomId) {
            socket.emit("room-error", "Invalid room.");
            return;
        }

        const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!room) {
            socket.emit("room-error", "Room not found.");
            return;
        }

        //the built in magic: put the user in the soundproof hotel room
        socket.join(roomId);
        console.log(` User ${socket.id} walked into room: ${roomId}`);
        //  Tell everyone ELSE in the soundproof room that a new person arrived!
        // We send them the new person's socket.id so they know exactly who to call.
        socket.to(roomId).emit("user-connected",socket.id);
    })

    socket.on("send-ping",(roomId)=>{
        //broadcast to everyone in the room except the sender
        socket.to(roomId).emit("receive-ping","hello from another user!");
        console.log(`ping broadcasted in room: ${roomId}`);
    });

    //replay the webrtc offer from caller->callee
    socket.on("send-webrtc-offer",({targetUserId,callerId,sdpOffer})=>{
        console.log(`relaying offer from ${callerId} to target:${targetUserId}`);

        //direct message to the specific targetd socket ID
        io.to(targetUserId).emit("receive-webrtc-offer",{
            callerId,
            sdpOffer
        });
    });

    // relay the webrtc anser from callee-> caller
    socket.on("send-webrtc-answer",({targetUserId,sdpAnswer})=>{
        console.log(`📨 Relaying answer back to caller: ${targetUserId}`);
        //deliver the anwer directly to user A
        io.to(targetUserId).emit("receive-webrtc-answer",{
            sdpAnswer
        });

    });

    // Relay ICE Candidates between peers
    socket.on("send-ice-candidate", ({ targetUserId, candidate }) => {
        // We don't need to log this one, because ICE candidates fire dozens of times per second!
        io.to(targetUserId).emit("receive-ice-candidate", {
            candidate
        });
    });

    socket.on("whiteboard-draw", ({ roomId, segment }) => {
        if (!roomId || !segment) {
            return;
        }

        socket.to(roomId).emit("whiteboard-draw", { segment });
    });

    socket.on("whiteboard-clear", ({ roomId }) => {
        if (!roomId) {
            return;
        }

        socket.to(roomId).emit("whiteboard-clear");
    });

    socket.on("file-share", ({ roomId, file }) => {
        if (!roomId || !file) {
            return;
        }

        socket.to(roomId).emit("file-share", { file });
    });
    

    //this runs when they close the tab or lose account
    socket.on("disconnect",()=>{
        console.log(`user disconnected: ${socket.id}`);
    })
})

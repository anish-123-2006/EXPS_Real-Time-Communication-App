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

// create the master HTTP server and give it our express app
const server=http.createServer(app);

//attach socket.io to the master server, and configure CORS just like we did for express
const io=new Server(server,{
    cors:{
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

// Allow requests from our Next.js frontend
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// 2. Safely grab the port from the environment
const PORT = process.env.PORT || 5000;

// 3. Register Middleware
app.use(cors());
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
        // We can optionally accept a title from the frontend
        const { title } = req.body;

        // Create the room in the database
        const newRoom = await prisma.room.create({
            data: {
                title: title || "Untitled Room",
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

        // 1. Generate the hash (The "Meat Grinder")
        // The '10' is the "salt rounds" - it determines how mathematically complex the hash is.
        // 10 is the industry standard balance between security and server speed.
        const hashedPassword = await bcrypt.hash(password, 10);


        // Tell Prisma to create a new user in the database
        // 2. Save the user with the HASHED password, not the raw one
        const newUser = await prisma.user.create({
            data: {
                email: email,
                name: name,
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

        // 1. Check if a user with this email actually exists
        const user = await prisma.user.findUnique({
            where: { email: email }
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
            process.env.JWT_SECRET as string,
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
io.on("connection",(socket)=>{
    //this run every time a users nextjs browser opens a websocket line
    console.log(`a user connected with socket id: ${socket.id}`);

    //listen for the custom "join-room" event
    socket.on("join-room",(roomId)=>{

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
    

    //this runs when they close the tab or lose account
    socket.on("disconnect",()=>{
        console.log(`user disconnected: ${socket.id}`);
    })
})
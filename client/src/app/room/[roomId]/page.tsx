"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client"; // Import the dialer!

//define the configuration outside the component so it doesnt get recreated on every render

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export default function RoomPage() {
  const params = useParams();

  const roomId = params.roomId as string;
  // we will store the socket instance in state so we can use it later
  const [socket, setSocket] = useState<Socket | null>(null);

  //save the actual webcam stram so we send it to other people later
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  // Create the React Refernce for our local video element
  const localVideoRef = useRef<HTMLVideoElement>(null);

  //new: safely store the webRTC engine without triggering re-renders
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // NEW: Store the P2P Data Channel for file sharing & whiteboards
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // NEW: Whiteboard Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false); // Tripwire: Is the mouse currently clicked down?
  const lastPosRef = useRef<{ x: number; y: number } | null>(null); // The X/Y of the last pixel

  // NEW: File Sharing Refs
  const fileBufferRef = useRef<ArrayBuffer[]>([]);
  const fileMetaRef = useRef<{ name: string; size: number } | null>(null);


  //socket connection effect
  useEffect(() => {
    // dial the server: this instantly sends the websocket upgrade request
    const socketinstance = io("http://localhost:5000");

    //save it to state
    setSocket(socketinstance);

    //2.listen for success: when the sever accepts the conncetion
    socketinstance.on("connect", () => {
      console.log("frontend connected to socket.io, my id is: ", socketinstance.id);
      // NEW: Tell the backend exactly which room URL we are sitting in!
      socketinstance.emit("join-room", roomId);
    });

    //listen for new users joining the room
    socketinstance.on("user-connected", async (newUserId) => {
      console.log(`user ${newUserId} just joined the room i must be the caller`);

      //step1: create the webRTC engine
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      // NEW: Create the Data Channel BEFORE creating the offer!
      const dataChannel = peerConnection.createDataChannel("super-secret-channel");
      dataChannel.binaryType = "arraybuffer";
      dataChannelRef.current = dataChannel;
      // Add these tripwires!
      dataChannel.onopen = () => {
        console.log("🟢 Caller Data Channel is officially OPEN!");
      };
      dataChannel.onmessage = (event) => {
        // NEW: Check if the incoming data is a RAW BINARY CHUNK
        if (event.data instanceof ArrayBuffer) {
          fileBufferRef.current.push(event.data);
          return; // Stop here, don't try to parse it as JSON
        }

        // If it's not binary, it must be JSON
        try {
          const data = JSON.parse(event.data);

          if (data.type === "draw") {
            drawRemote(data.prevX, data.prevY, data.currentX, data.currentY);
          }
          // NEW: Catch the file start signal
          else if (data.type === "file-start") {
            console.log(`Incoming file: ${data.name}`);
            fileBufferRef.current = []; // Clear the buffer
            fileMetaRef.current = data;
          }
          // NEW: Catch the file end signal & download!
          else if (data.type === "file-end") {
            console.log("File received, stitching and downloading...");

            // 1. Combine all the binary chunks back into a single Blob
            const blob = new Blob(fileBufferRef.current);

            // 2. Create a temporary download URL in the browser's memory
            const url = URL.createObjectURL(blob);

            // 3. Create a fake HTML link and click it using JavaScript
            const a = document.createElement("a");
            a.href = url;
            a.download = fileMetaRef.current?.name || "downloaded-file";
            a.click();

            // 4. Clean up the memory
            URL.revokeObjectURL(url);
          }
        } catch (err) {
          console.log("📩 Received Text Message:", event.data);
        }
      };

      // NEW: The ICE Candidate Tripwire (Add this right after creating the engine!)
      peerConnection.onicecandidate = (event) => {
        // If the engine found a valid routing packet...
        if (event.candidate) {
          // Send it to the other user! (Replace TARGET_ID with either newUserId or callerId depending on the block)
          socketinstance.emit("send-ice-candidate", {
            targetUserId: newUserId, // Use 'newUserId' for Caller, 'callerId' for Callee
            candidate: event.candidate
          });
        }
      };

      //step2: plug our local webcam stream into the engine
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
        console.log("local camera tracks added to the WebRTC engine");
      } else {
        console.warn("no local stream found are camera permissiond allowed?");
      }

      //step3: create the offer(the handshake proposal)
      const offer = await peerConnection.createOffer();

      //step4: tell the engine to use this offer as our "local Description"
      await peerConnection.setLocalDescription(offer);

      //step5: send the offer to new user through our socket server

      socketinstance.emit("send-webrtc-offer", {
        targetUserId: newUserId,
        callerId: socketinstance.id,
        sdpOffer: offer,
      });
      console.log("webRTC offer sent to the server")


    })

    // NEW: Listen for incoming WebRTC Offers (Callee Side)
    socketinstance.on("receive-webrtc-offer", async ({ callerId, sdpOffer }) => {
      console.log(`Received WebRTC Offer from Caller: ${callerId}`);

      // 1. Create Callee's WebRTC Engine
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      // Add this massive tripwire block!
      peerConnection.ondatachannel = (event) => {
        const incomingChannel = event.channel;
        incomingChannel.binaryType = "arraybuffer";
        dataChannelRef.current = incomingChannel;

        console.log("✅ P2P Data Channel caught by Callee!");

        incomingChannel.onopen = () => {
          console.log("🟢 Callee Data Channel is officially OPEN!");
        };

        incomingChannel.onmessage = (messageEvent) => {
          // NEW: Check if the incoming data is a RAW BINARY CHUNK
          if (messageEvent.data instanceof ArrayBuffer) {
            fileBufferRef.current.push(messageEvent.data);
            return; // Stop here, don't try to parse it as JSON
          }

          // If it's not binary, it must be JSON
          try {
            const data = JSON.parse(messageEvent.data);

            if (data.type === "draw") {
              drawRemote(data.prevX, data.prevY, data.currentX, data.currentY);
            }
            // NEW: Catch the file start signal
            else if (data.type === "file-start") {
              console.log(`Incoming file: ${data.name}`);
              fileBufferRef.current = []; // Clear the buffer
              fileMetaRef.current = data;
            }
            // NEW: Catch the file end signal & download!
            else if (data.type === "file-end") {
              console.log("File received, stitching and downloading...");

              // 1. Combine all the binary chunks back into a single Blob
              const blob = new Blob(fileBufferRef.current);

              // 2. Create a temporary download URL in the browser's memory
              const url = URL.createObjectURL(blob);

              // 3. Create a fake HTML link and click it using JavaScript
              const a = document.createElement("a");
              a.href = url;
              a.download = fileMetaRef.current?.name || "downloaded-file";
              a.click();

              // 4. Clean up the memory
              URL.revokeObjectURL(url);
            }
          } catch (err) {
            console.log("📩 Received Text Message:", messageEvent.data);
          }
        };
      };



      // NEW: The ICE Candidate Tripwire (Add this right after creating the engine!)
      peerConnection.onicecandidate = (event) => {
        // If the engine found a valid routing packet...
        if (event.candidate) {
          // Send it to the other user! (Replace TARGET_ID with either newUserId or callerId depending on the block)
          socketinstance.emit("send-ice-candidate", {
            targetUserId: callerId, // Use 'newUserId' for Caller, 'callerId' for Callee
            candidate: event.candidate
          });
        }
      };

      // 2. Attach incoming remote track listener!
      peerConnection.ontrack = (event) => {
        console.log("Received remote media stream track!");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // 3. Attach local camera tracks to the connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // 4. Accept the Caller's SDP Offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpOffer));

      // 5. Generate an SDP Answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 6. Send the Answer back to the Caller through Socket.io
      socketinstance.emit("send-webrtc-answer", {
        targetUserId: callerId,
        sdpAnswer: answer
      });

      console.log("WebRTC Answer sent back to caller!");
    });

    // NEW: Listen for the Answer coming back from the Callee
    socketinstance.on("receive-webrtc-answer", async ({ sdpAnswer }) => {
      console.log("Received WebRTC Answer from Callee!");

      const peerConnection = peerConnectionRef.current;

      if (peerConnection) {
        // 1. Set up the water sensor (tripwire) so the Caller can see the Callee's video!
        peerConnection.ontrack = (event) => {
          console.log("Caller received remote media stream track!");
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // 2. Lock in the connection by accepting the Callee's Answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
        console.log("WebRTC Handshake Complete (SDP Exchanged)!");
      }
    });

    // NEW: Listen for incoming ICE candidates and plug them into our engine
    socketinstance.on("receive-ice-candidate", async ({ candidate }) => {
      const peerConnection = peerConnectionRef.current;
      if (peerConnection && candidate) {
        try {
          // Add the other person's IP address/routing info to our engine!
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      }
    });

    //the cleanup function
    return () => {
      console.log("disconnecting socket...");
      socketinstance.disconnect();
    }
  }, [roomId, localStream])//the empty array[] means "only run this exactly once when the page loads", NOTE: We added localStream to the dependency array!

  //*the camera effect
  useEffect(() => {
    const startCamera = async () => {
      try {
        //ask the browser for video and audio permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        //save the stream into react state
        setLocalStream(stream);
        // Plug the live stream pipe into our video tag using the ref
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.log("error accessing camera, did you allow permission?", error);
      }
    };
    startCamera();
  }, []);

  // The Screen Share Toggle Function
  const toggleScreenShare = async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) {
      console.warn("No WebRTC connection exists yet!");
      return;
    }

    try {
      if (!isScreenSharing) {
        // 1. Ask the user for their screen
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // 2. Find the WebRTC Sender
        const videoSender = peerConnection.getSenders().find(
          (sender) => sender.track?.kind === "video"
        );

        // 3. Swap webcam out, screen in
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);

        // NEW: 4. Listen for the native browser "Stop Sharing" button!
        screenTrack.onended = () => {
          console.log("Native stop sharing clicked! Swapping back to webcam...");
          stopScreenShare(videoSender);
        };

      } else {
        // If we are ALREADY sharing, the user clicked our React "Stop Sharing" button
        const videoSender = peerConnection.getSenders().find(
          (sender) => sender.track?.kind === "video"
        );
        stopScreenShare(videoSender);
      }
    } catch (error) {
      console.error("Error sharing screen:", error);
    }
  };

  // NEW: A helper function to safely revert back to the webcam
  const stopScreenShare = async (videoSender: RTCRtpSender | undefined) => {
    if (videoSender && localStream) {
      const webcamTrack = localStream.getVideoTracks()[0];

      // Swap the screen out, webcam in!
      await videoSender.replaceTrack(webcamTrack);

      // Update our local UI
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
    setIsScreenSharing(false);
  };

  // NEW: Send a test message over our direct P2P connection!
  const sendTestMessage = () => {
    const dataChannel = dataChannelRef.current;

    // Check if the channel exists AND is actually open for business
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send("🚀 Hello from the other side! No servers involved.");
      console.log("Message sent to peer!");
    } else {
      console.warn("Data channel is not open yet!");
    }
  };

  // --- FILE SHARING LOGIC ---
  const CHUNK_SIZE = 16 * 1024; // 16KB max size for WebRTC Data Channels

  const sendFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const dataChannel = dataChannelRef.current;

    if (!file || !dataChannel || dataChannel.readyState !== "open") return;

    console.log(`Starting upload: ${file.name}`);

    // 1. Send the metadata packet so the receiver knows a file is coming
    dataChannel.send(JSON.stringify({
      type: "file-start",
      name: file.name,
      size: file.size
    }));

    // 2. Read the raw binary data using vanilla JS
    const buffer = await file.arrayBuffer();
    let offset = 0;

    // 3. Slice and send the chunks
    while (offset < buffer.byteLength) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      dataChannel.send(chunk); // Sending RAW binary data, not JSON!
      offset += CHUNK_SIZE;
    }

    // 4. Tell the receiver we are done
    dataChannel.send(JSON.stringify({ type: "file-end" }));
    console.log("File completely sent!");
  };

  // --- WHITEBOARD LOGIC ---

  // 1. Mouse Down: Start the line
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate exact mouse position relative to the canvas box
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;
    lastPosRef.current = { x, y };
  };

  // 2. Mouse Move: Connect the dots!
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If the mouse isn't clicked down, don't do anything
    if (!isDrawingRef.current || !lastPosRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d"); // Grab the "paintbrush"
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Configure the paintbrush
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#3b82f6"; // Tailwind blue-500!

    // Draw the actual line
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y); // Start at previous pixel
    ctx.lineTo(x, y); // Draw line to current pixel
    ctx.stroke();

    // NEW: Broadcast this exact stroke to the other user!
    const dataChannel = dataChannelRef.current;
    if (dataChannel && dataChannel.readyState === "open") {
      const drawPacket = {
        type: "draw",
        prevX: lastPosRef.current.x,
        prevY: lastPosRef.current.y,
        currentX: x,
        currentY: y
      };
      // Convert the JavaScript object to a string and send it!
      dataChannel.send(JSON.stringify(drawPacket));
    }

    // Instantly update the ref so the next millisecond starts from this new pixel
    lastPosRef.current = { x, y };
  };

  // 3. Mouse Up: Stop the line
  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };
  // NEW: The Remote Paintbrush (triggered by WebRTC)
  const drawRemote = (prevX: number, prevY: number, currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    // Let's make remote lines a different color (like Red) so we can tell who is drawing!
    ctx.strokeStyle = "#ef4444";

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-5xl w-full flex flex-col items-center gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 w-full text-center">
          <h1 className="text-2xl font-bold text-blue-400 mb-2">Virtual Meeting Room</h1>

          <div className="bg-gray-900 p-3 rounded font-mono text-gray-300 text-sm mb-4 inline-block">
            Room ID: {roomId}
          </div>

          {/* CONTROL PANEL */}
          <div className="flex gap-4 justify-center mb-6">
            <button
              onClick={toggleScreenShare}
              className={`px-4 py-2 rounded font-semibold transition-colors ${isScreenSharing ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isScreenSharing ? "Stop Sharing" : "Share Screen"}
            </button>

            {/* NEW: Data Channel Test Button */}
            <button
              onClick={sendTestMessage}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
            >
              Send P2P Ping
            </button>

            {/* NEW: File Upload Input */}
            <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold cursor-pointer transition-colors">
              Share File
              <input
                type="file"
                className="hidden"
                onChange={sendFile}
              />
            </label>
          </div>

          {/* THE VIDEO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">

            {/* Local Video Container */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                // NEW: Conditionally apply the mirror effect!
                className={`w-full h-full object-cover ${!isScreenSharing ? "transform scale-x-[-1]" : ""
                  }`}
              />
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-semibold">
                You (Local)
              </div>
            </div>

            {/* THE WHITEBOARD */}
            <div className="w-full mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h2 className="text-xl font-bold text-blue-400 mb-4 text-left">Collaborative Whiteboard</h2>
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing} // Stop drawing if they accidentally drag the mouse off the canvas!
                  width={800}
                  height={400}
                  className="bg-gray-900 border border-gray-600 rounded cursor-crosshair max-w-full"
                />
              </div>
            </div>
            {/* Remote Video Container (Empty for now)
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video border border-dashed border-gray-600 flex items-center justify-center">
              <span className="text-gray-500">Waiting for someone to join...</span>
            </div> */}
            {/* Remote Video Container */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-gray-600">
              {/* THIS IS THE MISSING BUCKET! */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-semibold">
                Remote Peer
              </div>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}

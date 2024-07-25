import WebSocket from "ws";
import prisma from "../utils/prisma.js";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws, req) => {
  // Extract userId from query parameters or authentication token
  const userId = parseInt(req.url.split("?userId=")[1], 10);

  // Update user status to online
  prisma.users
    .update({
      where: { id: userId },
      data: { online: true, lastSeen: new Date() },
    })
    .catch(console.error);

  ws.on("close", () => {
    // Update user status to offline when the connection is closed
    prisma.users
      .update({
        where: { id: userId },
        data: { online: false, lastSeen: new Date() },
      })
      .catch(console.error);
  });

  ws.on("message", (message) => {
    console.log(`Received message ${message} from user ${userId}`);
    // Optionally handle incoming messages
  });
});

console.log("WebSocket server started on ws://localhost:8080");

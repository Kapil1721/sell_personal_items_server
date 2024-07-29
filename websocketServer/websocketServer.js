import { WebSocketServer } from "ws";
import prisma from "../utils/prisma.js";

class BroadcastService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketEvents();
  }

  setupWebSocketEvents() {
    this.wss.on("connection", (ws, req) => {
      console.log("Client connected", req.url);
      const userId = parseInt(req.url.split("?userId=")[1], 10);

      // Update user status to online
      if (userId) {
        prisma.users
          .update({
            where: { id: userId },
            data: { online: true, lastSeen: new Date() },
          })
          .catch(console.error);
      }
      ws.on("close", () => {
        console.log("Client disconnected");
        if (userId) {
          prisma.users
            .update({
              where: { id: userId },
              data: { online: false, lastSeen: new Date() },
            })
            .catch(console.error);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      ws.on("message", (message) => {
        console.log(`Received message ${message} from user ${userId}`);
        // Optionally handle incoming messages
      });
    });
  }

  broadcast(data) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        // Ensure the client is open
        client.send(JSON.stringify(data));
      }
    });
  }
}

export default BroadcastService;

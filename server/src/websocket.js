import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { setNotificationBroadcaster } from "./services/notificationService.js";

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, request) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const payload = jwt.verify(url.searchParams.get("token"), env.jwtSecret);
      socket.user = { id: Number(payload.sub), role: payload.role };
      socket.send(JSON.stringify({ type: "connected", message: "Real-time notifications connected." }));
    } catch {
      socket.close(1008, "Unauthorized");
    }
  });

  setNotificationBroadcaster((event) => {
    const message = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && (!event.targetRole || client.user?.role === event.targetRole)) {
        client.send(message);
      }
    }
  });

  return wss;
}

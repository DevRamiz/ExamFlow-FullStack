import { useEffect } from "react";

export function useRealtimeNotifications(onNotification) {
  useEffect(() => {
    const token = localStorage.getItem("examflow_token");
    if (!token) return undefined;

    const explicitUrl = import.meta.env.VITE_WS_URL;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const baseUrl = explicitUrl || `${protocol}//${window.location.host}/ws`;
    const separator = baseUrl.includes("?") ? "&" : "?";
    const socket = new WebSocket(`${baseUrl}${separator}token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!["connected"].includes(message.type)) onNotification(message);
    };
    return () => socket.close();
  }, [onNotification]);
}

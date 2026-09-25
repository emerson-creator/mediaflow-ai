import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../context/useAuth";
import type { ProgressEvent } from "../types";

export function useSocket(onProgress: (event: ProgressEvent) => void) {
  const { accessToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token: accessToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("media.progress.updated", onProgress);
    socket.on("error", (err) => console.error("Socket error:", err));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return { isConnected };
}

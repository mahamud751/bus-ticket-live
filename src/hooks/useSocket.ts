"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
type Socket = ReturnType<typeof io>;

export interface SocketEvents {
  "seats-being-locked": (data: {
    seatIds: string[];
    sessionId: string;
    userName: string;
    timestamp: string;
  }) => void;

  "seats-locked": (data: {
    seatIds: string[];
    sessionId: string;
    expiresAt: string;
    timestamp: string;
  }) => void;

  "seats-unlocked": (data: {
    seatId?: string;
    seatIds?: string[];
    sessionId: string;
    timestamp: string;
  }) => void;

  "seats-booked": (data: {
    seatIds: string[];
    bookingId: string;
    timestamp: string;
  }) => void;

  "seat-lock-attempt": (data: {
    scheduleId: string;
    seatIds: string[];
    sessionId: string;
    userName: string;
  }) => void;

  "seat-lock-success": (data: {
    scheduleId: string;
    seatIds: string[];
    sessionId: string;
    expiresAt: string;
  }) => void;

  "seat-deselected": (data: {
    scheduleId: string;
    seatId: string;
    sessionId: string;
  }) => void;
}

export const useSocket = (scheduleId?: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!scheduleId) return;

    // Initialize socket connection with better configuration
    // Fixed: Allow both polling and WebSocket transports (Nginx config corrected)
    const socket = io("", {
      path: "/api/socketio",
      transports: ["polling", "websocket"], // Allow both polling and WebSocket transports
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Connected to socket server");
      socket.emit("join-schedule", scheduleId);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("🔌 Socket connection error:", error);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("🔌 Disconnected from socket server:", reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-schedule", scheduleId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [scheduleId]);

  const emit = (event: string, data: unknown) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("Socket not connected, cannot emit event:", event);
    }
  };

  const on = (event: string, callback: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false,
  };
};
import { Server as NetServer } from "http";
import { NextApiResponse, NextApiRequest } from "next";
import { Server as SocketIOServer } from "socket.io";

// Define the Chat interface to avoid using 'any'
interface Chat {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

// Export the IO instance
let io: SocketIOServer | null = null;
// Presence tracking: userId -> connection count; socketId -> userId
const userConnections = new Map<string, number>();
const socketToUser = new Map<string, string>();

export function getIO(): SocketIOServer | null {
  return io;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

interface TicketMessage {
  ticketId: string;
  message: Chat; // Now using proper Chat type
}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  // Check if socket is already initialized
  if (res.socket.server.io) {
    console.log("Socket is already running");
    io = res.socket.server.io;
    res.end();
    return;
  }

  console.log("Socket is initializing");
  
  // Get the origin from headers for CORS configuration
  const origin = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
  
  const socketIO = new SocketIOServer(res.socket.server, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: [origin, "https://tickets.crazysolve.com"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Add transports configuration to handle polling and WebSocket properly
    transports: ["polling", "websocket"],
    // Add ping/pong settings to handle connection stability
    pingInterval: 25000,
    pingTimeout: 20000,
    // Add upgrade settings
    allowUpgrades: true,
    // Add HTTP compression settings
    httpCompression: {
      threshold: 1024,
    },
  });
  
  res.socket.server.io = socketIO;
  io = socketIO;

  socketIO.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Provide current presence state on demand
    socket.on("request-presence", () => {
      const onlineUserIds = Array.from(userConnections.entries())
        .filter(([, count]) => (count || 0) > 0)
        .map(([userId]) => userId);
      console.log("Sending presence state to", socket.id, ":", onlineUserIds);
      socket.emit("presence-state", { onlineUserIds });
    });

    // Join user room for notifications and presence
    socket.on("join-user", (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`User ${socket.id} joined user room ${userId}`);
      socketToUser.set(socket.id, userId);
      const prev = userConnections.get(userId) || 0;
      const next = prev + 1;
      userConnections.set(userId, next);
      if (prev === 0 && next === 1) {
        // Transitioned online
        console.log("User went online, broadcasting:", userId);
        socket.broadcast.emit("user-online", { userId });
      }
    });

    // Leave user room and update presence
    socket.on("leave-user", (userId: string) => {
      socket.leave(`user-${userId}`);
      console.log(`User ${socket.id} left user room ${userId}`);
      const prev = userConnections.get(userId) || 0;
      const next = Math.max(0, prev - 1);
      userConnections.set(userId, next);
      if (prev > 0 && next === 0) {
        console.log("User went offline, broadcasting:", userId);
        socket.broadcast.emit("user-offline", { userId });
      }
      // Clear mapping if it matches
      if (socketToUser.get(socket.id) === userId) {
        socketToUser.delete(socket.id);
      }
    });

    // Join schedule room for real-time updates
    socket.on("join-schedule", (scheduleId: string) => {
      socket.join(`schedule-${scheduleId}`);
      console.log(`User ${socket.id} joined schedule ${scheduleId}`);
    });

    // Leave schedule room
    socket.on("leave-schedule", (scheduleId: string) => {
      socket.leave(`schedule-${scheduleId}`);
      console.log(`User ${socket.id} left schedule ${scheduleId}`);
    });

    // Handle seat selection
    socket.on(
      "seat-selected",
      (data: { scheduleId: string; seatId: string; sessionId: string }) => {
        console.log("Seat selected:", data);
        socket.to(`schedule-${data.scheduleId}`).emit("seat-locked", {
          seatId: data.seatId,
          sessionId: data.sessionId,
          lockedAt: new Date().toISOString(),
        });
      }
    );

    // Handle seat deselection
    socket.on(
      "seat-deselected",
      (data: { scheduleId: string; seatId: string; sessionId: string }) => {
        console.log("Seat deselected:", data);
        // Broadcast to ALL users in the schedule room that a seat is now available
        socket.to(`schedule-${data.scheduleId}`).emit("seat-unlocked", {
          seatId: data.seatId,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });

        // Also notify the user who deselected the seat for immediate UI update
        socket.emit("seat-unlocked", {
          seatId: data.seatId,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });

        // Emit seats-unlocked event for consistency with other unlock events
        socket.to(`schedule-${data.scheduleId}`).emit("seats-unlocked", {
          seatId: data.seatId,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });

        // Also notify the user who deselected the seat with seats-unlocked event
        socket.emit("seats-unlocked", {
          seatId: data.seatId,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });

        console.log(
          `Broadcasting seat-unlocked for seat ${data.seatId} to schedule ${data.scheduleId}`
        );
      }
    );

    // Handle seat lock attempt (for real-time feedback)
    socket.on(
      "seat-lock-attempt",
      (data: {
        scheduleId: string;
        seatIds: string[];
        sessionId: string;
        userName: string;
      }) => {
        console.log("Seat lock attempt:", data);
        // Broadcast to all other users that seats are being locked
        socket.to(`schedule-${data.scheduleId}`).emit("seats-being-locked", {
          seatIds: data.seatIds,
          sessionId: data.sessionId,
          userName: data.userName,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Handle seat lock success
    socket.on(
      "seat-lock-success",
      (data: {
        scheduleId: string;
        seatIds: string[];
        sessionId: string;
        expiresAt: string;
      }) => {
        console.log("Seat lock success:", data);
        // Broadcast to all other users that seats are now locked
        socket.to(`schedule-${data.scheduleId}`).emit("seats-locked", {
          seatIds: data.seatIds,
          sessionId: data.sessionId,
          expiresAt: data.expiresAt,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Handle booking completion
    socket.on(
      "booking-completed",
      (data: { scheduleId: string; seatIds: string[] }) => {
        console.log("Booking completed:", data);
        socket.to(`schedule-${data.scheduleId}`).emit("seats-booked", {
          seatIds: data.seatIds,
          bookedAt: new Date().toISOString(),
        });
      }
    );

    // Ticket chat functionality
    // Join ticket chat room
    socket.on("join-ticket-chat", (ticketId: string) => {
      socket.join(`ticket-${ticketId}`);
      console.log(`User ${socket.id} joined ticket chat ${ticketId}`);
    });

    // Leave ticket chat room
    socket.on("leave-ticket-chat", (ticketId: string) => {
      socket.leave(`ticket-${ticketId}`);
      console.log(`User ${socket.id} left ticket chat ${ticketId}`);
    });

    // Send chat message
    socket.on(
      "send-ticket-message",
      (data: { ticketId: string; message: Chat }) => {
        console.log("Received send-ticket-message event:", data);
        // Broadcast message to all OTHER users in the ticket chat room
        socket.to(`ticket-${data.ticketId}`).emit("receive-ticket-message", {
          ticketId: data.ticketId,
          message: data.message,
        });

        // Also send back to the sender so they see their own message
        socket.emit("receive-ticket-message", {
          ticketId: data.ticketId,
          message: data.message,
        });

        console.log(
          "Message sent successfully to ticket room:",
          data.ticketId
        );
      }
    );

    // Test message handler
    socket.on(
      "test-message",
      (data: { [key: string]: string | number | boolean }) => {
        console.log("Received test message:", data);
        // Echo back to sender
        socket.emit("test-message", {
          ...data,
          echo: true,
          timestamp: new Date().toISOString(),
        });
      }
    );

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const prev = userConnections.get(userId) || 0;
        const next = Math.max(0, prev - 1);
        userConnections.set(userId, next);
        if (prev > 0 && next === 0) {
          console.log(
            "User went offline on disconnect, broadcasting:",
            userId
          );
          socket.broadcast.emit("user-offline", { userId });
        }
        socketToUser.delete(socket.id);
      }
    });
  });
  
  res.end();
}
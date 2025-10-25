import { Server as SocketIOServer } from "socket.io";
import { NextApiResponseServerIO } from "./socket";

// Function to get the Socket.IO server instance
export function getIO(): SocketIOServer | null {
  // In API routes, we can access the IO instance through the response object
  // This function should be called from within an API route
  return null;
}

// Function to get IO instance from API response
export function getIOFromResponse(
  res: NextApiResponseServerIO
): SocketIOServer | null {
  if (res.socket.server.io) {
    return res.socket.server.io;
  }
  return null;
}

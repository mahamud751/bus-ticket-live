import { NextRequest, NextResponse } from "next/server";
import { getIO } from "@/lib/socket";

// POST /api/test-socket - Send a test message via socket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId } = body;

    const io = getIO();
    if (io) {
      // Emit to specific user room
      io.to(`user-${userId}`).emit("test-message", {
        text: message,
        from: "server",
        timestamp: new Date().toISOString(),
      });

      // Also emit to all clients for testing
      io.emit("test-message", {
        text: message,
        from: "server-broadcast",
        timestamp: new Date().toISOString(),
      });

      console.log("Test message sent via socket:", message);
      return NextResponse.json({ success: true, message: "Test message sent" });
    } else {
      console.log("Socket IO not available");
      return NextResponse.json(
        { success: false, error: "Socket IO not available" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending test message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send test message" },
      { status: 500 }
    );
  }
}

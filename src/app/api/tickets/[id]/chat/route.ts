import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTicketPermission } from "@/lib/access-control";
import { getIO } from "@/lib/socket";

// POST /api/tickets/[id]/chat - Send a chat message for a ticket
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("Unauthorized access to chat API");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params
    const params = await context.params;
    console.log("Chat API called with params:", params);

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!ticket) {
      console.log("Ticket not found:", params.id);
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to chat on this ticket
    const hasPermission = hasTicketPermission(
      session.user.role,
      "create",
      "chat",
      ticket.userId,
      session.user.id
    );

    console.log("Chat permission check:", {
      userRole: session.user.role,
      ticketOwnerId: ticket.userId,
      currentUserId: session.user.id,
      hasPermission,
    });

    if (!hasPermission) {
      console.log("Forbidden access to chat API");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;
    console.log("Received chat content:", content);

    if (!content) {
      console.log("Content is required");
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.create({
      data: {
        content,
        ticketId: params.id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            subject: true,
            userId: true,
          },
        },
      },
    });

    console.log("Chat message created:", chat);

    // Create notification for admins when user sends a message
    // Find all admins to notify
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        id: true,
      },
    });

    // Create notifications for all admins
    for (const admin of admins) {
      const notification = await prisma.notification.create({
        data: {
          title: `New chat message on ticket: ${chat.ticket.subject}`,
          message: `${session.user.name || session.user.email} sent a message.`,
          type: "info",
          userId: admin.id,
          ticketId: chat.ticketId,
        },
      });

      console.log("Notification created for admin:", admin.id, notification);

      // Emit socket event for real-time notification update
      const io = getIO();
      if (io) {
        io.to(`user-${admin.id}`).emit("new-notification", {
          notification,
        });
        console.log("Notification emitted to admin:", admin.id);
      }
    }

    // Emit socket event for real-time chat update
    const io = getIO();
    if (io) {
      console.log("Emitting message to ticket room:", params.id);
      // Broadcast to all users in the ticket room
      io.to(`ticket-${params.id}`).emit("receive-ticket-message", {
        ticketId: params.id,
        message: chat,
      });
      console.log(
        "Message emitted successfully to room:",
        `ticket-${params.id}`
      );

      // Update message count for the recipient
      // Get updated unread count for the ticket owner (if not the sender)
      if (chat.ticket.userId !== session.user.id) {
        const unreadCount = await prisma.chat.count({
          where: {
            ticket: {
              userId: chat.ticket.userId,
            },
            userId: {
              not: chat.ticket.userId, // Not their own messages
            },
          },
        });

        // Emit socket event to update message badge for ticket owner
        io.to(`user-${chat.ticket.userId}`).emit("messages-read", {
          totalUnread: unreadCount,
        });
      }

      // Get updated unread count for admins
      const adminUnreadCount = await prisma.chat.count({
        where: {
          userId: {
            not: session.user.id, // Not the sender
          },
        },
      });

      // Emit socket event to update message badge for admins
      // We'll broadcast this to all admins - in a production app, you'd want to be more specific
      io.emit("messages-read", {
        totalUnread: adminUnreadCount,
      });
    } else {
      console.log("IO instance not available, cannot emit message");
    }

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json(
      { error: "Failed to send chat message" },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[id]/chat - Get all chat messages for a ticket
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params
    const params = await context.params;

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to view chat messages on this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "read",
        "chat",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        ticketId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTicketPermission } from "@/lib/access-control";
import { getIO } from "@/lib/socket";

// POST /api/tickets/[id]/comments - Add a comment to a ticket
export async function POST(
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

    // Check if user has permission to comment on this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "create",
        "comment",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
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

    // Create notification for the ticket owner if it's not their own comment
    if (comment.ticket.userId !== session.user.id) {
      const notification = await prisma.notification.create({
        data: {
          title: `New comment on ticket: ${comment.ticket.subject}`,
          message: `${
            session.user.name || session.user.email
          } added a comment to your ticket.`,
          type: "info",
          userId: comment.ticket.userId,
          ticketId: comment.ticketId,
        },
      });

      // Emit socket event for real-time notification update
      const io = getIO();
      if (io) {
        io.to(`user-${comment.ticket.userId}`).emit("new-notification", {
          notification,
        });
      }
    }

    // If the commenter is not an admin, also notify all admins
    if (session.user.role !== "ADMIN") {
      // Get all admins
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
        },
      });

      // Create notifications for all admins
      for (const admin of admins) {
        // Skip if the admin is the commenter (shouldn't happen, but just in case)
        if (admin.id === session.user.id) continue;

        const notification = await prisma.notification.create({
          data: {
            title: `New comment on ticket: ${comment.ticket.subject}`,
            message: `${
              session.user.name || session.user.email
            } added a comment to ticket ${comment.ticket.subject}.`,
            type: "info",
            userId: admin.id,
            ticketId: comment.ticketId,
          },
        });

        // Emit socket event for real-time notification update
        const io = getIO();
        if (io) {
          io.to(`user-${admin.id}`).emit("new-notification", {
            notification,
          });
        }
      }
    }

    // Emit socket event for real-time comment update
    const io = getIO();
    if (io) {
      io.to(`ticket-${params.id}`).emit("new-comment", {
        comment,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

// GET /api/tickets/[id]/comments - Get all comments for a ticket
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

    // Check if user has permission to view comments on this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "read",
        "comment",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
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

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

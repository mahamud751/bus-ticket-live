import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { hasTicketPermission } from "@/lib/access-control";

// GET /api/tickets/[id] - Get a specific ticket
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

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
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
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to view this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "read",
        "ticket",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update a ticket
export async function PUT(
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

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to update this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "update",
        "ticket",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { subject, description, category, priority, status, attachment } =
      body;

    // Only admins can change ticket status
    const updateData: {
      subject: string;
      description: string;
      category: import("@prisma/client").TicketCategory;
      priority: import("@prisma/client").TicketPriority;
      attachment?: string | null;
      status?: import("@prisma/client").TicketStatus;
    } = {
      subject,
      description,
      category,
      priority,
      attachment,
    };

    if (session.user.role === UserRole.ADMIN) {
      updateData.status = status;
    }

    const updatedTicket = await prisma.ticket.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete a ticket
export async function DELETE(
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

    const ticket = await prisma.ticket.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user has permission to delete this ticket
    if (
      !hasTicketPermission(
        session.user.role,
        "delete",
        "ticket",
        ticket.userId,
        session.user.id
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.ticket.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Failed to delete ticket" },
      { status: 500 }
    );
  }
}

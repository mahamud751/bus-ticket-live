import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { hasTicketPermission } from "@/lib/access-control";

// GET /api/tickets - Get all tickets
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const hasChats = searchParams.get("hasChats") === "true"; // New parameter for filtering

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: {
      userId?: string;
      chats?: { some: Record<string, never> };
      OR?: Array<{
        subject?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
        id?: { contains: string; mode: "insensitive" };
      }>;
      status?: import("@prisma/client").TicketStatus;
      priority?: import("@prisma/client").TicketPriority;
      category?: import("@prisma/client").TicketCategory;
    } = {};

    // Customers can only see their own tickets
    if (session.user.role === UserRole.USER) {
      where.userId = session.user.id;
    }

    // For both users and admins, if hasChats is true, only show tickets with chat messages
    // This ensures we only show conversations that have actual chat messages
    if (hasChats) {
      where.chats = {
        some: {}, // This ensures only tickets with at least one chat message are returned
      };
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } }, // Allow search by ticket ID (booking ID)
      ];
    }

    // Admins can see all tickets, but can filter
    if (status) where.status = status as import("@prisma/client").TicketStatus;
    if (priority)
      where.priority = priority as import("@prisma/client").TicketPriority;
    if (category)
      where.category = category as import("@prisma/client").TicketCategory;

    // Check if user has permission to read tickets
    if (!hasTicketPermission(session.user.role, "read", "ticket")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tickets = await prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
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
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
        chats: {
          take: 5, // Include recent chat messages for the messages page
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const total = await prisma.ticket.count({ where });

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets", tickets: [] },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create tickets
    if (!hasTicketPermission(session.user.role, "create", "ticket")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { subject, description, category, priority, attachment } = body;

    // Validate required fields
    if (!subject || !description || !category || !priority) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        category,
        priority,
        attachment,
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
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIO } from "@/lib/socket";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let unreadCount = 0;

    if (session.user.role === "ADMIN") {
      unreadCount = await prisma.chat.count({
        where: {
          userId: {
            not: session.user.id,
          },
        },
      });
    } else {
      unreadCount = await prisma.chat.count({
        where: {
          ticket: {
            userId: session.user.id,
          },
          userId: {
            not: session.user.id,
          },
        },
      });
    }

    return NextResponse.json({ totalUnread: unreadCount });
  } catch (error) {
    console.error("Error fetching message count:", error);
    return NextResponse.json(
      { error: "Failed to fetch message count" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let unreadCount = 0;

    if (session.user.role === "ADMIN") {
      unreadCount = await prisma.chat.count({
        where: {
          userId: {
            not: session.user.id,
          },
        },
      });
    } else {
      unreadCount = await prisma.chat.count({
        where: {
          ticket: {
            userId: session.user.id,
          },
          userId: {
            not: session.user.id,
          },
        },
      });
    }

    const io = getIO();
    if (io) {
      io.to(`user-${session.user.id}`).emit("messages-read", {
        totalUnread: unreadCount,
      });
    }

    return NextResponse.json({
      success: true,
      totalUnread: unreadCount,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeRead = searchParams.get("includeRead") === "true";

    const whereClause = {
      userId: session.user.id,
      ...(includeRead ? {} : { read: false }),
    };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
      include: {
        ticket: {
          select: {
            id: true,
            subject: true,
            status: true,
          },
        },
      },
    });

    const totalUnread = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });

    return NextResponse.json({
      notifications,
      totalUnread,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
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

    const body = await req.json();
    const { notificationIds } = body;

    if (!notificationIds || notificationIds.length === 0) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });
    } else {
      await prisma.notification.updateMany({
        where: {
          id: {
            in: notificationIds,
          },
          userId: session.user.id,
        },
        data: {
          read: true,
        },
      });
    }

    const totalUnread = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    });

    const io = getIO();
    if (io) {
      io.to(`user-${session.user.id}`).emit("notifications-read", {
        totalUnread,
      });
    }

    return NextResponse.json({
      success: true,
      totalUnread,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

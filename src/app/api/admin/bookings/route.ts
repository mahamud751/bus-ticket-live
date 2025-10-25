import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const bookings = await prisma.booking.findMany({
      include: {
        schedule: {
          include: {
            route: {
              include: {
                origin: true,
                destination: true,
              },
            },
            bus: true,
          },
        },
        seats: {
          include: {
            seat: true,
          },
        },
        passengers: true,
      },
      orderBy: {
        bookingDate: "desc",
      },
      take: limit,
      skip: offset,
    });

    const totalCount = await prisma.booking.count();

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin bookings API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

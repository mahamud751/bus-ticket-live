import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get("operatorId");

    const where = operatorId ? { operatorId } : {};

    const buses = await prisma.bus.findMany({
      where,
      include: {
        operator: true,
      },
      orderBy: {
        busNumber: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: buses,
    });
  } catch (error) {
    console.error("Admin buses GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

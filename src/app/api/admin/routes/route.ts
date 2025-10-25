import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const routes = await prisma.route.findMany({
      include: {
        origin: true,
        destination: true,
        operator: true,
      },
      orderBy: {
        origin: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error("Admin routes GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

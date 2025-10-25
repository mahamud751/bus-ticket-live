import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        state: true,
        country: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error("Cities API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cities",
      },
      { status: 500 }
    );
  }
}

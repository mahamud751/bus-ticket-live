import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const scheduleCreateSchema = z.object({
  routeId: z.string().min(1),
  busId: z.string().min(1),
  departureTime: z.string().min(1),
  arrivalTime: z.string().min(1),
  basePrice: z.number().min(0),
  isActive: z.boolean().default(true),
});

const scheduleUpdateSchema = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1).optional(),
  busId: z.string().min(1).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const scheduleDeleteSchema = z.object({
  id: z.string().min(1),
});

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const routeId = searchParams.get("routeId");
    const operatorId = searchParams.get("operatorId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (routeId) where.routeId = routeId;
    if (operatorId) where.operatorId = operatorId;
    if (status) where.isActive = status === "active";

    const [totalCount, totalActive, totalBookings, averagePriceResult] =
      await Promise.all([
        prisma.schedule.count(),
        prisma.schedule.count({ where: { isActive: true } }),
        prisma.booking.count(),
        prisma.schedule.aggregate({
          _avg: { basePrice: true },
        }),
      ]);

    const totalPages = Math.ceil(totalCount / limit);
    const averagePrice = averagePriceResult._avg.basePrice || 0;

    const [schedules] = await Promise.all([
      prisma.schedule.findMany({
        where,
        include: {
          route: {
            include: {
              origin: true,
              destination: true,
            },
          },
          bus: true,
          operator: true,
          pricingTiers: true,
          bookings: {
            select: {
              id: true,
              status: true,
              seats: true,
            },
          },
        },
        orderBy: {
          departureTime: "asc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.schedule.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        schedules,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: totalPages,
        },
        statistics: {
          totalActive,
          totalBookings,
          averagePrice,
        },
      },
    });
  } catch (error) {
    console.error("Admin schedules GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = scheduleCreateSchema.parse(body);

    const route = await prisma.route.findUnique({
      where: { id: validatedData.routeId },
    });

    const bus = await prisma.bus.findUnique({
      where: { id: validatedData.busId },
    });

    if (!route || !bus) {
      return NextResponse.json(
        { success: false, error: "Route or bus not found" },
        { status: 404 }
      );
    }

    // Create schedule
    const schedule = await prisma.schedule.create({
      data: {
        ...validatedData,
        operatorId: route.operatorId,
        departureTime: new Date(validatedData.departureTime),
        arrivalTime: new Date(validatedData.arrivalTime),
      },
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        bus: true,
        operator: true,
      },
    });

    await prisma.pricingTier.createMany({
      data: [
        {
          scheduleId: schedule.id,
          seatType: "REGULAR",
          price: validatedData.basePrice,
        },
        {
          scheduleId: schedule.id,
          seatType: "PREMIUM",
          price: validatedData.basePrice * 1.5,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Admin schedules POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = scheduleUpdateSchema.parse(body);

    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    if (validatedData.isActive === false) {
      const activeBookings = await prisma.booking.count({
        where: {
          scheduleId: validatedData.id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (activeBookings > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot deactivate schedule with active bookings",
          },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.routeId) {
      const route = await prisma.route.findUnique({
        where: { id: validatedData.routeId },
      });
      if (!route) {
        return NextResponse.json(
          { success: false, error: "Route not found" },
          { status: 404 }
        );
      }
      updateData.routeId = validatedData.routeId;
      updateData.operatorId = route.operatorId;
    }
    if (validatedData.busId) {
      const bus = await prisma.bus.findUnique({
        where: { id: validatedData.busId },
      });
      if (!bus) {
        return NextResponse.json(
          { success: false, error: "Bus not found" },
          { status: 404 }
        );
      }
      updateData.busId = validatedData.busId;
    }
    if (validatedData.departureTime) {
      updateData.departureTime = new Date(validatedData.departureTime);
    }
    if (validatedData.arrivalTime) {
      updateData.arrivalTime = new Date(validatedData.arrivalTime);
    }
    if (validatedData.basePrice !== undefined) {
      updateData.basePrice = validatedData.basePrice;
    }
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: validatedData.id },
      data: updateData,
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        bus: true,
        operator: true,
        pricingTiers: true,
      },
    });

    if (validatedData.basePrice !== undefined) {
      await prisma.pricingTier.updateMany({
        where: {
          scheduleId: validatedData.id,
          seatType: "REGULAR",
        },
        data: {
          price: validatedData.basePrice,
        },
      });

      await prisma.pricingTier.updateMany({
        where: {
          scheduleId: validatedData.id,
          seatType: "PREMIUM",
        },
        data: {
          price: validatedData.basePrice * 1.5,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Admin schedules PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = scheduleDeleteSchema.parse(body);

    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: validatedData.id },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    const activeBookings = existingSchedule.bookings.filter(
      (booking) =>
        booking.status === "PENDING" || booking.status === "CONFIRMED"
    );

    if (activeBookings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete schedule with active bookings",
        },
        { status: 400 }
      );
    }

    await prisma.pricingTier.deleteMany({
      where: { scheduleId: validatedData.id },
    });

    await prisma.schedule.delete({
      where: { id: validatedData.id },
    });

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error) {
    console.error("Admin schedules DELETE error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

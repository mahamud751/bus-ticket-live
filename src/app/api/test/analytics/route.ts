import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/test/analytics - Test analytics data without auth
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week";

    const now = new Date();
    let startDate: Date;
    const endDate = new Date(now);

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    console.log('Date range:', { startDate, endDate });

    // Build where clause for bookings
    const bookingWhere: Prisma.BookingWhereInput = {
      bookingDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    console.log('Where clause:', JSON.stringify(bookingWhere, null, 2));

    // Get booking statistics
    const [
      totalBookings,
      confirmedBookings,
      totalRevenue,
      pendingBookings,
      cancelledBookings,
    ] = await Promise.all([
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({
        where: { ...bookingWhere, status: "CONFIRMED" },
      }),
      prisma.booking.aggregate({
        where: { ...bookingWhere, status: "CONFIRMED" },
        _sum: { totalAmount: true },
      }),
      prisma.booking.count({
        where: { ...bookingWhere, status: "PENDING" },
      }),
      prisma.booking.count({
        where: { ...bookingWhere, status: "CANCELLED" },
      }),
    ]);

    console.log('Booking stats:', {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenue: totalRevenue._sum.totalAmount
    });

    // Get top routes
    const topRoutes = await prisma.booking.groupBy({
      by: ["scheduleId"],
      where: { ...bookingWhere, status: "CONFIRMED" },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    console.log('Top routes found:', topRoutes.length);

    // Get route details for top routes
    const routeDetails = await prisma.schedule.findMany({
      where: {
        id: {
          in: topRoutes.map((route) => route.scheduleId),
        },
      },
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        operator: true,
      },
    });

    const topRoutesWithDetails = topRoutes.map((route) => {
      const details = routeDetails.find((d) => d.id === route.scheduleId);
      return {
        scheduleId: route.scheduleId,
        bookings: route._count.id,
        revenue: route._sum.totalAmount || 0,
        route: details
          ? {
              origin: details.route.origin.name,
              destination: details.route.destination.name,
              operator: details.operator.name,
              departureTime: details.departureTime,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      debug: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data: {
        overview: {
          totalBookings,
          confirmedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          conversionRate:
            totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
        },
        topRoutes: topRoutesWithDetails,
      },
    });
  } catch (error) {
    console.error("Test analytics error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
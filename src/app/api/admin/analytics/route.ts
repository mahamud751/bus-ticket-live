import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

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
    const period = searchParams.get("period") || "today";
    const operatorId = searchParams.get("operatorId");

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

    const bookingWhere: Prisma.BookingWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (operatorId) {
      bookingWhere.schedule = {
        operatorId,
      };
    }

    const allBookingsCount = await prisma.booking.count();

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

    const topRoutes = await prisma.booking.groupBy({
      by: ["scheduleId"],
      where: { ...bookingWhere, status: "CONFIRMED" },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

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

    const operatorStats = await prisma.booking.groupBy({
      by: ["scheduleId"],
      where: { ...bookingWhere, status: "CONFIRMED" },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const operatorSchedules = await prisma.schedule.findMany({
      where: {
        id: {
          in: operatorStats.map((stat) => stat.scheduleId),
        },
      },
      include: {
        operator: true,
      },
    });

    const operatorStatsWithDetails = operatorStats
      .map((stat) => {
        const schedule = operatorSchedules.find(
          (s) => s.id === stat.scheduleId
        );
        return schedule
          ? {
              operatorId: schedule.operatorId,
              operatorName: schedule.operator.name,
              bookings: stat._count.id,
              revenue: stat._sum.totalAmount || 0,
            }
          : null;
      })
      .reduce(
        (
          acc: Array<{
            operatorId: string;
            operatorName: string;
            bookings: number;
            revenue: number;
          }>,
          curr
        ) => {
          if (!curr) return acc;
          const existing = acc.find(
            (item) => item.operatorId === curr.operatorId
          );
          if (existing) {
            existing.bookings += curr.bookings;
            existing.revenue += curr.revenue;
          } else {
            acc.push(curr);
          }
          return acc;
        },
        []
      )
      .sort((a, b) => b.revenue - a.revenue);

    const dailyBookingsData = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        createdAt: true,
        status: true,
        totalAmount: true,
      },
    });

    const dailyTrends = dailyBookingsData.reduce(
      (acc: Record<string, { bookings: number; revenue: number }>, booking) => {
        const date = booking.createdAt.toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { bookings: 0, revenue: 0 };
        }
        acc[date].bookings += 1;
        if (booking.status === "CONFIRMED") {
          acc[date].revenue += booking.totalAmount;
        }
        return acc;
      },
      {}
    );

    const formattedDailyBookings = Object.entries(dailyTrends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
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
        operatorStats: operatorStatsWithDetails,
        dailyTrends: formattedDailyBookings,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          period,
        },
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

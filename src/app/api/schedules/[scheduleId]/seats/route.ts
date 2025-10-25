import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, error: "Schedule ID is required" },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
        isActive: true,
      },
      include: {
        bus: {
          include: {
            seatLayout: {
              include: {
                bookings: {
                  where: {
                    booking: {
                      status: {
                        in: ["CONFIRMED", "PENDING"],
                      },
                    },
                  },
                },
                locks: {
                  where: {
                    expiresAt: {
                      gt: new Date(),
                    },
                  },
                },
              },
              orderBy: [{ seatNumber: "asc" }],
            },
          },
        },
        route: {
          include: {
            origin: true,
            destination: true,
            operator: true,
          },
        },
        pricingTiers: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      );
    }

    const seats = schedule.bus.seatLayout.map((seat) => {
      const isBooked = seat.bookings.length > 0;
      const isLocked = seat.locks.length > 0;
      const isAvailable = seat.isAvailable && !isBooked && !isLocked;

      const pricing = schedule.pricingTiers.find(
        (tier) => tier.seatType === seat.seatType
      );
      const price = pricing?.price || schedule.basePrice;

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        price,
        status: isBooked
          ? "booked"
          : isLocked
          ? "locked"
          : isAvailable
          ? "available"
          : "unavailable",
        isSelectable: isAvailable,
        lockInfo: isLocked
          ? {
              expiresAt: seat.locks[0]?.expiresAt.toISOString(),
              sessionId: seat.locks[0]?.sessionId,
            }
          : null,
      };
    });

    const seatMap = seats.reduce((acc: Record<string, typeof seats>, seat) => {
      const rowMatch = seat.seatNumber.match(/^(\d+)/);
      const row = rowMatch ? rowMatch[1] : "1";

      if (!acc[row]) {
        acc[row] = [];
      }
      acc[row].push(seat);
      return acc;
    }, {});

    const sortedSeatMap = Object.keys(seatMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .reduce((acc: Record<string, typeof seats>, row) => {
        acc[row] = seatMap[row].sort(
          (a: (typeof seats)[0], b: (typeof seats)[0]) =>
            a.seatNumber.localeCompare(b.seatNumber)
        );
        return acc;
      }, {});

    const totalSeats = seats.length;
    const availableSeats = seats.filter(
      (seat) => seat.status === "available"
    ).length;
    const bookedSeats = seats.filter((seat) => seat.status === "booked").length;
    const lockedSeats = seats.filter((seat) => seat.status === "locked").length;

    const pricingSummary = schedule.pricingTiers.map((tier) => ({
      seatType: tier.seatType,
      price: tier.price,
      availableCount: seats.filter(
        (seat) => seat.seatType === tier.seatType && seat.status === "available"
      ).length,
    }));

    return NextResponse.json({
      success: true,
      data: {
        schedule: {
          id: schedule.id,
          departureTime: schedule.departureTime.toISOString(),
          arrivalTime: schedule.arrivalTime.toISOString(),
          basePrice: schedule.basePrice,
          route: {
            origin: {
              name: schedule.route.origin.name,
              code: schedule.route.origin.code,
            },
            destination: {
              name: schedule.route.destination.name,
              code: schedule.route.destination.code,
            },
            duration: schedule.route.duration,
            distance: schedule.route.distance,
          },
          operator: {
            name: schedule.route.operator.name,
          },
          bus: {
            busNumber: schedule.bus.busNumber,
            busType: schedule.bus.busType,
            totalSeats: schedule.bus.totalSeats,
            amenities: schedule.bus.amenities,
          },
        },
        seatMap: sortedSeatMap,
        seats,
        availability: {
          totalSeats,
          availableSeats,
          bookedSeats,
          lockedSeats,
          occupancyRate:
            totalSeats > 0
              ? ((bookedSeats + lockedSeats) / totalSeats) * 100
              : 0,
        },
        pricing: pricingSummary,
      },
    });
  } catch (error) {
    console.error("Seat map API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

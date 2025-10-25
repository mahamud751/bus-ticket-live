import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const searchSchema = z.object({
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  passengers: z.number().min(1).max(6).default(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      origin: searchParams.get("origin"),
      destination: searchParams.get("destination"),
      departureDate: searchParams.get("departureDate"),
      passengers: parseInt(searchParams.get("passengers") || "1"),
    };

    const validatedParams = searchSchema.parse(rawParams);

    const departureDate = new Date(validatedParams.departureDate);
    const startOfDay = new Date(departureDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setHours(23, 59, 59, 999);

    const routes = await prisma.route.findMany({
      where: {
        isActive: true,
        origin: {
          code: validatedParams.origin,
        },
        destination: {
          code: validatedParams.destination,
        },
        schedules: {
          some: {
            isActive: true,
            departureTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
      include: {
        origin: true,
        destination: true,
        operator: true,
        schedules: {
          where: {
            isActive: true,
            departureTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
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
                },
              },
            },
            pricingTiers: true,
          },
          orderBy: {
            departureTime: "asc",
          },
        },
      },
    });

    const searchResults = routes.flatMap((route) =>
      route.schedules.map((schedule) => {
        const totalSeats = schedule.bus.seatLayout.length;
        const bookedSeats = schedule.bus.seatLayout.filter(
          (seat) => seat.bookings.length > 0 || seat.locks.length > 0
        ).length;
        const availableSeats = totalSeats - bookedSeats;

        const regularPrice =
          schedule.pricingTiers.find((tier) => tier.seatType === "REGULAR")
            ?.price || schedule.basePrice;

        const premiumPrice =
          schedule.pricingTiers.find((tier) => tier.seatType === "PREMIUM")
            ?.price || schedule.basePrice * 1.5;

        return {
          id: schedule.id,
          route: {
            id: route.id,
            origin: {
              code: route.origin.code,
              name: route.origin.name,
            },
            destination: {
              code: route.destination.code,
              name: route.destination.name,
            },
            distance: route.distance,
            duration: route.duration,
          },
          operator: {
            id: route.operator.id,
            name: route.operator.name,
          },
          bus: {
            id: schedule.bus.id,
            busNumber: schedule.bus.busNumber,
            busType: schedule.bus.busType,
            totalSeats: schedule.bus.totalSeats,
            amenities: schedule.bus.amenities,
          },
          schedule: {
            departureTime: schedule.departureTime.toISOString(),
            arrivalTime: schedule.arrivalTime.toISOString(),
            duration: Math.ceil(
              (schedule.arrivalTime.getTime() -
                schedule.departureTime.getTime()) /
                (1000 * 60)
            ),
          },
          availability: {
            totalSeats,
            availableSeats,
            bookedSeats,
          },
          pricing: {
            regular: regularPrice,
            premium: premiumPrice,
            currency: "USD",
          },
        };
      })
    );

    searchResults.sort(
      (a, b) =>
        new Date(a.schedule.departureTime).getTime() -
        new Date(b.schedule.departureTime).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        searchParams: validatedParams,
        results: searchResults,
        totalResults: searchResults.length,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid search parameters",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

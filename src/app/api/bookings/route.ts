import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, toStripeAmount } from "@/lib/stripe";
import {
  createMockPaymentIntent,
  isStripeConfigured,
} from "@/lib/mock-payment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { sendBookingConfirmationEmail } from "@/lib/email";

const bookingSchema = z.object({
  scheduleId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(6),
  passengerInfo: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  passengersData: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email(),
        seatId: z.string(),
      })
    )
    .optional(),
  discountCode: z.string().optional(),
  sessionId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    const {
      scheduleId,
      seatIds,
      passengerInfo,
      passengersData,
      discountCode,
      sessionId,
    } = validatedData;

    const validLocks = await prisma.seatLock.findMany({
      where: {
        seatLayoutId: {
          in: seatIds,
        },
        sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (validLocks.length !== seatIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Seat locks have expired or are invalid",
        },
        { status: 409 }
      );
    }

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        isActive: true,
      },
      include: {
        route: {
          include: {
            origin: true,
            destination: true,
            operator: true,
          },
        },
        bus: true,
        pricingTiers: true,
      },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule not found",
        },
        { status: 404 }
      );
    }

    const seats = await prisma.seatLayout.findMany({
      where: {
        id: {
          in: seatIds,
        },
      },
    });

    let totalAmount = 0;
    const seatPrices: { [key: string]: number } = {};

    for (const seat of seats) {
      const tier = schedule.pricingTiers.find(
        (t) => t.seatType === seat.seatType
      );
      const price = tier?.price || schedule.basePrice;
      seatPrices[seat.id] = price;
      totalAmount += price;
    }

    const discountAmount = 0;

    const finalAmount = totalAmount - discountAmount;

    const pnr = `BT${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    let paymentIntent: { id: string; client_secret: string | null };
    let isUsingMockPayment = false;

    try {
      if (isStripeConfigured()) {
        paymentIntent = await stripe.paymentIntents.create({
          amount: toStripeAmount(finalAmount),
          currency: "usd",
          metadata: {
            scheduleId,
            seatIds: seatIds.join(","),
            pnr,
            passengerName: passengerInfo.name,
            passengerEmail: passengerInfo.email,
          },
        });
      } else {
        console.log("⚠️  Using mock payment system - Stripe not configured");
        paymentIntent = await createMockPaymentIntent(finalAmount);
        isUsingMockPayment = true;
      }
    } catch (error) {
      console.error("Payment creation error:", error);

      console.log("🔄 Falling back to mock payment system");
      paymentIntent = await createMockPaymentIntent(finalAmount);
      isUsingMockPayment = true;
    }

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          pnr,
          userId: session?.user?.id || null,
          scheduleId,
          passengerName: passengerInfo.name,
          passengerPhone: passengerInfo.phone,
          passengerEmail: passengerInfo.email,
          totalAmount: finalAmount,
          discountCode,
          discountAmount,
          paymentIntentId: paymentIntent.id,
          status: "PENDING",
          paymentStatus: "PENDING",
        },
      });

      await tx.bookingSeat.createMany({
        data: seatIds.map((seatId) => ({
          bookingId: newBooking.id,
          seatLayoutId: seatId,
          price: seatPrices[seatId],
        })),
      });

      if (passengersData && passengersData.length > 0) {
        await tx.bookingPassenger.createMany({
          data: passengersData.map((passenger) => ({
            bookingId: newBooking.id,
            seatLayoutId: passenger.seatId,
            passengerName: passenger.name,
          })),
        });
      }

      await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          amount: finalAmount,
          currency: "usd",
          paymentMethod: isUsingMockPayment ? "mock" : "stripe",
          transactionId: paymentIntent.id,
          status: "PENDING",
        },
      });

      return newBooking;
    });

    const emailData = {
      pnr: booking.pnr,
      passengerName: passengerInfo.name,
      passengerEmail: passengerInfo.email,
      route: {
        origin: schedule.route.origin.name,
        destination: schedule.route.destination.name,
      },
      schedule: {
        departureTime: schedule.departureTime.toISOString(),
        arrivalTime: schedule.arrivalTime.toISOString(),
      },
      seats: seats.map((seat) => ({
        seatNumber: seat.seatNumber,
        seatType: seat.seatType,
        price: seatPrices[seat.id],
      })),
      totalAmount: finalAmount,
      operator: schedule.route.operator.name,
      busNumber: schedule.bus.busNumber,
      allPassengers: passengersData?.map((p) => ({
        name: p.name,
        seatId: p.seatId,
      })),
    };

    sendBookingConfirmationEmail(emailData).catch((error) => {
      console.error("Failed to send confirmation email:", error);
    });

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          pnr: booking.pnr,
          status: booking.status,
          totalAmount: booking.totalAmount,
          passengerInfo,
        },
        payment: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          isMockPayment: isUsingMockPayment,
        },
        schedule: {
          departureTime: schedule.departureTime.toISOString(),
          arrivalTime: schedule.arrivalTime.toISOString(),
          route: {
            origin: schedule.route.origin.name,
            destination: schedule.route.destination.name,
            distance: schedule.route.distance,
            duration: schedule.route.duration,
          },
          operator: schedule.route.operator.name,
          bus: {
            busNumber: schedule.bus.busNumber,
            busType: schedule.bus.busType,
          },
        },
        seats: seats.map((seat) => ({
          id: seat.id,
          seatNumber: seat.seatNumber,
          seatType: seat.seatType,
          price: seatPrices[seat.id],
        })),
        passengers: passengersData?.map((p) => ({
          name: p.name,
          seatId: p.seatId,
        })),
      },
    });
  } catch (error) {
    console.error("Booking API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking data",
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const { searchParams } = new URL(request.url);
    const pnr = searchParams.get("pnr");
    const email = searchParams.get("email");

    if (pnr && email) {
      const booking = await prisma.booking.findFirst({
        where: {
          pnr,
          passengerEmail: email,
        },
        include: {
          schedule: {
            include: {
              route: {
                include: {
                  origin: true,
                  destination: true,
                  operator: true,
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
          passengers: {
            include: {
              seat: true,
            },
          },
          payments: true,
        },
      });

      if (!booking) {
        return NextResponse.json(
          {
            success: false,
            error: "Booking not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          booking: {
            ...booking,
            seats: booking.seats || [],
            passengers: booking.passengers || [],
            payments: booking.payments || [],
            schedule: {
              ...booking.schedule,
              route: {
                ...booking.schedule.route,
                distance: booking.schedule.route.distance || 0,
                duration: booking.schedule.route.duration || 0,
              },
              bus: {
                ...booking.schedule.bus,
                amenities: booking.schedule.bus.amenities || [],
              },
            },
          },
        },
      });
    }

    if (session?.user?.id) {
      const bookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          schedule: {
            include: {
              route: {
                include: {
                  origin: true,
                  destination: true,
                  operator: true,
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
          passengers: {
            include: {
              seat: true,
            },
          },
        },
        orderBy: {
          bookingDate: "desc",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          bookings: bookings.map((booking) => ({
            ...booking,
            seats: booking.seats || [],
            passengers: booking.passengers || [],
            schedule: {
              ...booking.schedule,
              route: {
                ...booking.schedule.route,
                distance: booking.schedule.route.distance || 0,
                duration: booking.schedule.route.duration || 0,
              },
              bus: {
                ...booking.schedule.bus,
                amenities: booking.schedule.bus.amenities || [],
              },
            },
          })),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized - please sign in to view your bookings",
      },
      { status: 401 }
    );
  } catch (error) {
    console.error("Booking fetch API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

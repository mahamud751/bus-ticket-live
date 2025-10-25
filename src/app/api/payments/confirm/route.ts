import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmMockPayment } from "@/lib/mock-payment";
import { z } from "zod";

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentIntentId } = confirmPaymentSchema.parse(body);

    const booking = await prisma.booking.findFirst({
      where: {
        paymentIntentId,
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
            operator: true,
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

    if (paymentIntentId.includes("pi_mock_")) {
      try {
        const confirmedPayment = await confirmMockPayment(paymentIntentId);

        await prisma.$transaction(async (tx) => {
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              paymentStatus: "COMPLETED",
            },
          });

          await tx.payment.updateMany({
            where: { bookingId: booking.id },
            data: {
              status: "COMPLETED",
            },
          });

          await tx.seatLock.deleteMany({
            where: {
              seatLayoutId: {
                in: booking.seats.map((seat) => seat.seatLayoutId),
              },
            },
          });

          await tx.seatLayout.updateMany({
            where: {
              id: {
                in: booking.seats.map((seat) => seat.seatLayoutId),
              },
            },
            data: {
              isAvailable: false,
            },
          });
        });

        return NextResponse.json({
          success: true,
          data: {
            booking: {
              id: booking.id,
              pnr: booking.pnr,
              status: "CONFIRMED",
              paymentStatus: "COMPLETED",
              totalAmount: booking.totalAmount,
              passengerName: booking.passengerName,
              passengerPhone: booking.passengerPhone,
              passengerEmail: booking.passengerEmail,
              bookingDate: booking.bookingDate.toISOString(),
              schedule: {
                departureTime: booking.schedule.departureTime.toISOString(),
                arrivalTime: booking.schedule.arrivalTime.toISOString(),
                route: {
                  origin: {
                    name: booking.schedule.route.origin.name,
                    code: booking.schedule.route.origin.code,
                  },
                  destination: {
                    name: booking.schedule.route.destination.name,
                    code: booking.schedule.route.destination.code,
                  },
                  distance: booking.schedule.route.distance || 0,
                  duration: booking.schedule.route.duration || 0,
                },
                bus: {
                  busNumber: booking.schedule.bus.busNumber,
                  busType: booking.schedule.bus.busType,
                  amenities: booking.schedule.bus.amenities || [],
                },
                operator: {
                  name: booking.schedule.operator.name,
                },
              },
              seats: (booking.seats || []).map((seatBooking) => ({
                id: seatBooking.id,
                price: seatBooking.price,
                seat: {
                  seatNumber: seatBooking.seat?.seatNumber || "N/A",
                  seatType: seatBooking.seat?.seatType || "REGULAR",
                },
              })),
              passengers: (booking.passengers || []).map((passenger) => ({
                id: passenger.id,
                passengerName: passenger.passengerName,
                seat: {
                  seatNumber: passenger.seat?.seatNumber || "N/A",
                  seatType: passenger.seat?.seatType || "REGULAR",
                },
              })),
              payments: (booking.payments || []).map((payment) => ({
                id: payment.id,
                amount: payment.amount,
                status: payment.status,
                transactionId: payment.transactionId,
                processedAt: payment.processedAt?.toISOString(),
              })),
            },
            payment: confirmedPayment,
          },
        });
      } catch (error: unknown) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Payment failed",
          },
          { status: 402 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Real Stripe payments are handled by webhooks",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
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

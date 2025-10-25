import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = verifyWebhookSignature(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.canceled":
        await handlePaymentCancellation(
          event.data.object as Stripe.PaymentIntent
        );
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          paymentIntentId: paymentIntent.id,
        },
        include: {
          seats: true,
        },
      });

      if (!booking) {
        throw new Error(
          `Booking not found for payment intent: ${paymentIntent.id}`
        );
      }

      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CONFIRMED",
          paymentStatus: "COMPLETED",
        },
      });

      await tx.payment.updateMany({
        where: {
          transactionId: paymentIntent.id,
        },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      const seatIds = booking.seats.map((seat) => seat.seatLayoutId);
      await tx.seatLock.deleteMany({
        where: {
          seatLayoutId: {
            in: seatIds,
          },
        },
      });

      console.log(`Payment succeeded for booking: ${booking.pnr}`);
    });
  } catch (error) {
    console.error("Error handling payment success:", error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          paymentIntentId: paymentIntent.id,
        },
        include: {
          seats: true,
        },
      });

      if (!booking) {
        throw new Error(
          `Booking not found for payment intent: ${paymentIntent.id}`
        );
      }

      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
        },
      });

      await tx.payment.updateMany({
        where: {
          transactionId: paymentIntent.id,
        },
        data: {
          status: "FAILED",
          processedAt: new Date(),
        },
      });

      const seatIds = booking.seats.map(
        (seat: { seatLayoutId: string }) => seat.seatLayoutId
      );
      await tx.seatLock.deleteMany({
        where: {
          seatLayoutId: {
            in: seatIds,
          },
        },
      });

      console.log(`Payment failed for booking: ${booking.pnr}`);
    });
  } catch (error) {
    console.error("Error handling payment failure:", error);
    throw error;
  }
}

async function handlePaymentCancellation(paymentIntent: Stripe.PaymentIntent) {
  try {
    await prisma.$transaction(async (tx) => {
      // Find and update booking status
      const booking = await tx.booking.findFirst({
        where: {
          paymentIntentId: paymentIntent.id,
        },
        include: {
          seats: true,
        },
      });

      if (!booking) {
        throw new Error(
          `Booking not found for payment intent: ${paymentIntent.id}`
        );
      }

      await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CANCELLED",
          paymentStatus: "FAILED",
        },
      });

      // Update payment status
      await tx.payment.updateMany({
        where: {
          transactionId: paymentIntent.id,
        },
        data: {
          status: "FAILED",
          processedAt: new Date(),
        },
      });

      // Remove seat locks for this booking
      const seatIds = booking.seats.map(
        (seat: { seatLayoutId: string }) => seat.seatLayoutId
      );
      await tx.seatLock.deleteMany({
        where: {
          seatLayoutId: {
            in: seatIds,
          },
        },
      });

      console.log(`Payment cancelled for booking: ${booking.pnr}`);
    });
  } catch (error) {
    console.error("Error handling payment cancellation:", error);
    throw error;
  }
}

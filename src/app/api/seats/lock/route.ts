import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { getIO } from "@/lib/socket";

const seatLockSchema = z.object({
  scheduleId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(4),
  sessionId: z.string().min(1),
});

export const POST = withRateLimit(async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const validatedData = seatLockSchema.parse(body);

    const { scheduleId, seatIds, sessionId } = validatedData;

    const schedule = await prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        isActive: true,
        departureTime: {
          gt: new Date(),
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "Schedule not found or already departed",
        },
        { status: 404 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const result = await prisma.$transaction(async (tx) => {
      await tx.seatLock.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      const conflictingLocks = await tx.seatLock.findMany({
        where: {
          seatLayoutId: {
            in: seatIds,
          },
          sessionId: {
            not: sessionId,
          },
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (conflictingLocks.length > 0) {
        const conflictingSeatIds = conflictingLocks.map(
          (lock) => lock.seatLayoutId
        );
        throw new Error(
          `Seats ${conflictingSeatIds.join(
            ", "
          )} are currently locked by another user`
        );
      }

      await tx.seatLock.deleteMany({
        where: {
          sessionId,
        },
      });

      const availableSeats = await tx.seatLayout.findMany({
        where: {
          id: {
            in: seatIds,
          },
          isAvailable: true,
          bookings: {
            none: {
              booking: {
                status: {
                  in: ["CONFIRMED", "PENDING"],
                },
              },
            },
          },
          locks: {
            none: {
              expiresAt: {
                gt: new Date(),
              },
              sessionId: {
                not: sessionId,
              },
            },
          },
        },
      });

      if (availableSeats.length !== seatIds.length) {
        const unavailableSeats = seatIds.filter(
          (seatId) => !availableSeats.some((seat) => seat.id === seatId)
        );
        throw new Error(
          `Seats ${unavailableSeats.join(", ")} are no longer available`
        );
      }

      const lockData = seatIds.map((seatId) => ({
        seatLayoutId: seatId,
        userId: session?.user?.id,
        sessionId,
        expiresAt,
      }));

      await tx.seatLock.createMany({
        data: lockData,
      });

      return {
        lockedSeats: seatIds,
        expiresAt: expiresAt.toISOString(),
        lockDurationMs: 5 * 60 * 1000,
      };
    });

    const io = getIO();
    if (io) {
      io.to(`schedule-${scheduleId}`).emit("seats-locked", {
        seatIds,
        sessionId,
        expiresAt: result.expiresAt,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Seat lock API error:", error);

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

    if (
      error instanceof Error &&
      (error.message.includes("are no longer available") ||
        error.message.includes("are currently locked"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
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
}, "/api/seats/lock");

export const DELETE = withRateLimit(async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const seatId = searchParams.get("seatId");
    const scheduleId = searchParams.get("scheduleId");

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Session ID is required",
        },
        { status: 400 }
      );
    }

    const whereClause: { sessionId: string; seatLayoutId?: string } = {
      sessionId,
    };

    if (seatId) {
      whereClause.seatLayoutId = seatId;
    }

    const result = await prisma.seatLock.deleteMany({
      where: whereClause,
    });

    const io = getIO();
    if (io) {
      const eventData: {
        sessionId: string;
        timestamp: string;
        seatId?: string;
        seatIds?: string[];
      } = {
        sessionId,
        timestamp: new Date().toISOString(),
      };

      if (seatId) {
        eventData.seatId = seatId;
      }

      if (seatId && scheduleId) {
        io.to(`schedule-${scheduleId}`).emit("seats-unlocked", eventData);
      } else {
        io.emit("seats-unlocked", eventData);
      }

      console.log("Emitted seats-unlocked event:", eventData);
    }

    return NextResponse.json({
      success: true,
      message: seatId
        ? "Seat lock released successfully"
        : "Seat locks released successfully",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error releasing seat locks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
},
"/api/seats/lock");

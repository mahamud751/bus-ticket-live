import { prisma } from "@/lib/prisma";

export class SeatLockManager {
  /**
   * Clean up expired seat locks
   */
  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await prisma.seatLock.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`Cleaned up ${result.count} expired seat locks`);
      return result.count;
    } catch (error) {
      console.error("Error cleaning up expired locks:", error);
      throw error;
    }
  }

  /**
   * Get seat locks for a specific session
   */
  static async getSessionLocks(sessionId: string) {
    return prisma.seatLock.findMany({
      where: {
        sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        seat: true,
      },
    });
  }

  /**
   * Extend lock expiration time
   */
  static async extendLocks(
    sessionId: string,
    additionalMinutes: number = 5
  ): Promise<number> {
    const newExpirationTime = new Date();
    newExpirationTime.setMinutes(
      newExpirationTime.getMinutes() + additionalMinutes
    );

    const result = await prisma.seatLock.updateMany({
      where: {
        sessionId,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        expiresAt: newExpirationTime,
      },
    });

    return result.count;
  }

  /**
   * Check if seats are still available for booking
   */
  static async areSeatAvailable(seatIds: string[]): Promise<boolean> {
    // First cleanup expired locks
    await this.cleanupExpiredLocks();

    const availableSeats = await prisma.seatLayout.findMany({
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
          },
        },
      },
    });

    return availableSeats.length === seatIds.length;
  }

  /**
   * Get conflicting locks for seat selection
   */
  static async getConflictingLocks(
    seatIds: string[],
    excludeSessionId?: string
  ) {
    const where: Record<string, unknown> = {
      seatLayoutId: {
        in: seatIds,
      },
      expiresAt: {
        gt: new Date(),
      },
    };

    if (excludeSessionId) {
      where.sessionId = {
        not: excludeSessionId,
      };
    }

    return prisma.seatLock.findMany({
      where,
      include: {
        seat: true,
      },
    });
  }
}

// Automated cleanup function to be called periodically
export async function runPeriodicCleanup() {
  try {
    const cleaned = await SeatLockManager.cleanupExpiredLocks();
    console.log(`Periodic cleanup completed: ${cleaned} locks removed`);
    return cleaned;
  } catch (error) {
    console.error("Periodic cleanup failed:", error);
    return 0;
  }
}

// Rate limiting helper
export class RateLimiter {
  private static requests = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static isRateLimited(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < windowStart) {
        this.requests.delete(key);
      }
    }

    const current = this.requests.get(identifier);

    if (!current) {
      this.requests.set(identifier, { count: 1, resetTime: now });
      return false;
    }

    if (current.resetTime < windowStart) {
      this.requests.set(identifier, { count: 1, resetTime: now });
      return false;
    }

    if (current.count >= maxRequests) {
      return true;
    }

    current.count++;
    return false;
  }

  static getRemainingRequests(
    identifier: string,
    maxRequests: number = 100
  ): number {
    const current = this.requests.get(identifier);
    if (!current) return maxRequests;
    return Math.max(0, maxRequests - current.count);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Rate limiting store (in production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // API endpoints rate limits
  "/api/seats/lock": { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute
  "/api/bookings": { windowMs: 60 * 1000, max: 5 }, // 5 requests per minute
  "/api/routes/search": { windowMs: 60 * 1000, max: 30 }, // 30 requests per minute
  "/api/auth/signup": { windowMs: 60 * 1000, max: 3 }, // 3 requests per minute
  "/api/auth/signin": { windowMs: 60 * 1000, max: 5 }, // 5 requests per minute
  "/api/payments/confirm": { windowMs: 60 * 1000, max: 3 }, // 3 requests per minute
  
  // Admin endpoints - stricter limits
  "/api/admin/": { windowMs: 60 * 1000, max: 20 }, // 20 requests per minute
  
  // Default for other API endpoints
  default: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
};

export function createRateLimit(endpoint: string) {
  return async (request: NextRequest) => {
    try {
      // Get client IP
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0] : 
                 request.headers.get("x-real-ip") || 
                 "127.0.0.1";

      // Get user session for authenticated rate limiting
      const session = await getServerSession(authOptions);
      const identifier = session?.user?.id || ip;

      // Get rate limit config for this endpoint
      const config = Object.entries(rateLimitConfigs).find(([path]) => 
        endpoint.startsWith(path)
      )?.[1] || rateLimitConfigs.default;

      const key = `${endpoint}:${identifier}`;
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Clean up old entries
      for (const [k, v] of rateLimit.entries()) {
        if (v.resetTime < windowStart) {
          rateLimit.delete(k);
        }
      }

      // Get current count for this key
      const current = rateLimit.get(key);
      
      if (!current) {
        // First request in window
        rateLimit.set(key, { count: 1, resetTime: now + config.windowMs });
        return null; // No rate limit hit
      }

      if (current.resetTime < now) {
        // Window has expired, reset
        rateLimit.set(key, { count: 1, resetTime: now + config.windowMs });
        return null;
      }

      if (current.count >= config.max) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: `Too many requests. Try again in ${retryAfter} seconds.`,
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": config.max.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": current.resetTime.toString(),
            },
          }
        );
      }

      // Increment count
      current.count++;
      rateLimit.set(key, current);

      return null; // No rate limit hit
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Don't block requests if rate limiting fails
      return null;
    }
  };
}

// Middleware wrapper for rate limiting
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpoint: string
) {
  const rateLimiter = createRateLimit(endpoint);
  
  return async (request: NextRequest) => {
    const rateLimitResult = await rateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    
    return handler(request);
  };
}

// Per-IP rate limiting (stricter for anonymous users)
export function createIPRateLimit(max: number = 50, windowMs: number = 60 * 1000) {
  return async (request: NextRequest) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : 
               request.headers.get("x-real-ip") || 
               "127.0.0.1";

    const key = `ip:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimit.entries()) {
      if (k.startsWith("ip:") && v.resetTime < windowStart) {
        rateLimit.delete(k);
      }
    }

    const current = rateLimit.get(key);
    
    if (!current) {
      rateLimit.set(key, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (current.resetTime < now) {
      rateLimit.set(key, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (current.count >= max) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: "IP rate limit exceeded",
          message: `Too many requests from this IP. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": current.resetTime.toString(),
          },
        }
      );
    }

    current.count++;
    rateLimit.set(key, current);
    return null;
  };
}

// Clean up function (call periodically)
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (value.resetTime < now) {
      rateLimit.delete(key);
    }
  }
}

// Start cleanup interval
if (typeof window === "undefined") {
  setInterval(cleanupRateLimit, 5 * 60 * 1000); // Clean up every 5 minutes
}
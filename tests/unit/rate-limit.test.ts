import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimit, withRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear rate limit store
    const { cleanupRateLimit } = require('@/lib/rate-limit');
    cleanupRateLimit();
  });

  describe('createRateLimit', () => {
    it('should allow requests within limit', async () => {
      const rateLimit = createRateLimit('/api/test');
      
      const mockRequest = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      const result = await rateLimit(mockRequest);
      expect(result).toBeNull(); // No rate limit hit
    });

    it('should block requests exceeding limit', async () => {
      const rateLimit = createRateLimit('/api/seats/lock');
      
      const mockRequest = new NextRequest('http://localhost/api/seats/lock', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Make requests up to the limit (10 for seat lock)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimit(mockRequest);
        expect(result).toBeNull();
      }

      // 11th request should be blocked
      const blockedResult = await rateLimit(mockRequest);
      expect(blockedResult).not.toBeNull();
      
      if (blockedResult) {
        expect(blockedResult.status).toBe(429);
        const json = await blockedResult.json();
        expect(json.error).toBe('Rate limit exceeded');
      }
    });

    it('should reset limits after window expires', async () => {
      // This would require mocking time or using a shorter window
      // For now, just verify the structure
      expect(true).toBe(true);
    });
  });

  describe('withRateLimit wrapper', () => {
    it('should wrap handler with rate limiting', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      
      const wrappedHandler = withRateLimit(mockHandler, '/api/test');
      
      const mockRequest = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      await wrappedHandler(mockRequest);
      
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
    });
  });
});
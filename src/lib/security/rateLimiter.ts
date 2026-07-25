interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private windowMs: number = 15 * 60 * 1000,
    private maxRequests: number = 100
  ) {
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  isRateLimited(identifier: string): { 
    limited: boolean; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || record.resetTime < now) {
      this.store.set(identifier, { 
        count: 1, 
        resetTime: now + this.windowMs 
      });
      return { 
        limited: false, 
        remaining: this.maxRequests - 1, 
        resetTime: now + this.windowMs 
      };
    }

    if (record.count >= this.maxRequests) {
      return { 
        limited: true, 
        remaining: 0, 
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      };
    }

    record.count++;
    return { 
      limited: false, 
      remaining: this.maxRequests - record.count, 
      resetTime: record.resetTime 
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  getStoreSize(): number {
    return this.store.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const rateLimiter = new RateLimiter();

if (process.env.NODE_ENV === 'development') {
  console.log('🔒 Rate Limiter initialized');
}
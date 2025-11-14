// Rate limiting utility - supports multiple backends
// Priority: Vercel KV > Upstash Redis > In-memory (dev only)

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>
}

// In-memory rate limiter (development only - doesn't work in serverless)
class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const record = this.store.get(identifier)

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key)
        }
      }
    }

    if (!record || now > record.resetAt) {
      const resetAt = now + this.windowMs
      this.store.set(identifier, { count: 1, resetAt })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: resetAt,
      }
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.resetAt,
      }
    }

    record.count++
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: record.resetAt,
    }
  }
}

// Vercel KV rate limiter
class VercelKVRateLimiter implements RateLimiter {
  private kv: any
  private maxRequests: number
  private windowMs: number

  constructor(kv: any, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.kv = kv
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()

    try {
      const existing = await this.kv.get(key)
      
      if (!existing) {
        const resetAt = now + this.windowMs
        await this.kv.set(key, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: Math.ceil(this.windowMs / 1000),
        })
        return {
          success: true,
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          reset: resetAt,
        }
      }

      const data = JSON.parse(existing)
      
      if (now > data.resetAt) {
        const resetAt = now + this.windowMs
        await this.kv.set(key, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: Math.ceil(this.windowMs / 1000),
        })
        return {
          success: true,
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          reset: resetAt,
        }
      }

      if (data.count >= this.maxRequests) {
        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: data.resetAt,
        }
      }

      data.count++
      await this.kv.set(key, JSON.stringify(data), {
        expirationTtl: Math.ceil((data.resetAt - now) / 1000),
      })

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - data.count,
        reset: data.resetAt,
      }
    } catch (error) {
      console.error('Rate limit error (Vercel KV):', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
      }
    }
  }
}

// Upstash Redis rate limiter
class UpstashRedisRateLimiter implements RateLimiter {
  private redis: any
  private maxRequests: number
  private windowMs: number

  constructor(redis: any, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.redis = redis
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowSeconds = Math.ceil(this.windowMs / 1000)

    try {
      // Use sliding window algorithm
      const pipeline = this.redis.pipeline()
      pipeline.zremrangebyscore(key, 0, now - this.windowMs)
      pipeline.zcard(key)
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
      pipeline.expire(key, windowSeconds)
      const results = await pipeline.exec()

      const count = results[1] as number

      if (count >= this.maxRequests) {
        // Get oldest entry to calculate reset time
        const oldest = await this.redis.zrange(key, 0, 0, { withScores: true })
        const resetAt = oldest.length > 0 ? oldest[0].score + this.windowMs : now + this.windowMs

        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: resetAt,
        }
      }

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - count - 1,
        reset: now + this.windowMs,
      }
    } catch (error) {
      console.error('Rate limit error (Upstash Redis):', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
      }
    }
  }
}

// Factory function to create appropriate rate limiter
let rateLimiterInstance: RateLimiter | null = null

export function getRateLimiter(
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RateLimiter {
  if (rateLimiterInstance) {
    return rateLimiterInstance
  }

  // Try Vercel KV first
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      // Dynamic import to avoid errors if @vercel/kv not installed
      const { kv } = require('@vercel/kv')
      rateLimiterInstance = new VercelKVRateLimiter(kv, maxRequests, windowMs)
      console.log('✅ Using Vercel KV for rate limiting')
      return rateLimiterInstance
    } catch (error) {
      console.warn('Vercel KV not available, trying Upstash Redis...')
    }
  }

  // Try Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = require('@upstash/redis')
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      rateLimiterInstance = new UpstashRedisRateLimiter(redis, maxRequests, windowMs)
      console.log('✅ Using Upstash Redis for rate limiting')
      return rateLimiterInstance
    } catch (error) {
      console.warn('Upstash Redis not available, using in-memory (dev only)...')
    }
  }

  // Fallback to in-memory (development only - warns in production)
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using in-memory rate limiting in production. This will not work effectively in serverless. Please configure Vercel KV or Upstash Redis.')
  } else {
    console.warn('⚠️  Using in-memory rate limiting (dev only - not suitable for production)')
  }
  
  rateLimiterInstance = new InMemoryRateLimiter(maxRequests, windowMs)
  return rateLimiterInstance
}

/**
 * Rate limit a request by IP address
 */
export async function rateLimitByIP(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(maxRequests, windowMs)
  return await limiter.limit(`ip:${ip}`)
}

/**
 * Rate limit a request by identifier (email, user ID, etc.)
 */
export async function rateLimitByIdentifier(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(maxRequests, windowMs)
  return await limiter.limit(`id:${identifier}`)
}


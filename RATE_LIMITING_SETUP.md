# Rate Limiting Setup Guide

## ✅ Implementation Complete

Rate limiting has been implemented on all authentication endpoints:
- `/api/auth/send-link` - 5 requests per 15 minutes per IP, 3 per hour per email
- `/api/auth/validate` - 10 requests per 15 minutes per IP
- `/api/dashboard/auth` - 5 requests per 15 minutes per IP

## How It Works

The rate limiting system automatically detects and uses the best available backend:

1. **Vercel KV** (if configured) - Vercel-native, recommended
2. **Upstash Redis** (if configured) - External Redis service
3. **In-memory** (fallback) - Development only, not suitable for production

## Setup Options

### Option 1: Vercel KV (Recommended) ⭐

**Why**: Vercel-native, works perfectly in serverless, easy setup

**Steps**:

1. **Create Vercel KV Database**
   ```bash
   # Via Vercel Dashboard:
   # Project → Storage → Create Database → KV
   # Or via CLI:
   vercel kv create
   ```

2. **Link to Your Project**
   ```bash
   vercel kv link
   ```

3. **Install Package** (if not already installed)
   ```bash
   npm install @vercel/kv
   ```

4. **Environment Variables** (automatically added by Vercel)
   ```
   KV_REST_API_URL=...
   KV_REST_API_TOKEN=...
   ```

5. **Done!** ✅ The rate limiter will automatically detect and use Vercel KV

**Cost**: $0.20 per 100K reads (~$0.10-0.50/month for your usage)

---

### Option 2: Upstash Redis

**Why**: Generous free tier, works well, more flexible

**Steps**:

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Sign up (free)
   - Create Redis database

2. **Get Credentials**
   - Copy REST URL
   - Copy REST Token

3. **Add Environment Variables**
   ```bash
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

4. **Install Package**
   ```bash
   npm install @upstash/redis
   ```

5. **Done!** ✅ The rate limiter will automatically detect and use Upstash Redis

**Cost**: Free tier: 10K commands/day (sufficient for your usage)

---

### Option 3: Vercel WAF (No Code Changes)

**Why**: Zero code changes, network-level protection, free tier

**Steps**:

1. **Go to Vercel Dashboard**
   - Project → Settings → Security → WAF

2. **Create Rate Limit Rule**
   ```
   Rule Name: Auth Endpoint Rate Limit
   Path: /api/auth/*
   Rate Limit: 5 requests per 15 minutes per IP
   Action: Block
   ```

3. **Save and Deploy**
   - Rule applies immediately
   - No code changes needed

**Cost**: Free (1M requests/month included)

**Note**: This works alongside the code-based rate limiting for extra protection.

---

## Current Status

**Without Configuration**: 
- ⚠️ Uses in-memory rate limiting (development only)
- ⚠️ Will warn in production
- ⚠️ Not effective in serverless (each function instance has separate memory)

**With Vercel KV or Upstash Redis**:
- ✅ Production-ready
- ✅ Works in serverless
- ✅ Distributed rate limiting
- ✅ Persistent across deployments

---

## Rate Limits Configured

| Endpoint | Limit | Window | By |
|----------|-------|--------|-----|
| `/api/auth/send-link` | 5 requests | 15 minutes | IP |
| `/api/auth/send-link` | 3 requests | 1 hour | Email |
| `/api/auth/validate` | 10 requests | 15 minutes | IP |
| `/api/dashboard/auth` | 5 requests | 15 minutes | IP |

---

## Testing Rate Limiting

### Test IP-Based Limiting

```bash
# Make 6 requests quickly (should fail on 6th)
for i in {1..6}; do
  curl -X POST https://your-app.vercel.app/api/auth/send-link \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","role":"team_member"}'
  echo ""
done
```

Expected: First 5 succeed, 6th returns `429 Too Many Requests`

### Test Email-Based Limiting

```bash
# Make 4 requests with same email (should fail on 4th)
for i in {1..4}; do
  curl -X POST https://your-app.vercel.app/api/auth/send-link \
    -H "Content-Type: application/json" \
    -d '{"email":"same@example.com","role":"team_member"}'
  echo ""
done
```

Expected: First 3 succeed, 4th returns `429 Too Many Requests`

---

## Response Headers

Rate-limited responses include helpful headers:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 900
```

---

## Monitoring

### Check Rate Limiter Status

The rate limiter logs which backend it's using:
- `✅ Using Vercel KV for rate limiting`
- `✅ Using Upstash Redis for rate limiting`
- `⚠️  Using in-memory rate limiting (dev only)`

### Production Warning

If in-memory is used in production, you'll see:
```
⚠️  WARNING: Using in-memory rate limiting in production. 
This will not work effectively in serverless. 
Please configure Vercel KV or Upstash Redis.
```

---

## Troubleshooting

### Rate Limiting Not Working

1. **Check Environment Variables**
   - Vercel KV: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
   - Upstash: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. **Check Logs**
   - Look for rate limiter initialization messages
   - Check for errors in rate limit operations

3. **Verify Package Installation**
   - Vercel KV: `npm install @vercel/kv`
   - Upstash: `npm install @upstash/redis`

### Rate Limits Too Strict/Loose

Edit limits in the route files:
- `app/api/auth/send-link/route.ts`
- `app/api/auth/validate/route.ts`
- `app/api/dashboard/auth/route.ts`

Change the parameters:
```typescript
rateLimitByIP(ip, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
//                      ↑      ↑
//                   limit   window (ms)
```

---

## Next Steps

1. **Choose a backend** (Vercel KV recommended)
2. **Set up credentials** (follow steps above)
3. **Deploy** - rate limiting will automatically use configured backend
4. **Test** - verify rate limiting works as expected
5. **Monitor** - check logs to confirm backend is being used

---

## Recommendation

**For Production**: Use **Vercel KV** or **Upstash Redis**

**For Quick Setup**: Use **Vercel WAF** (dashboard configuration, no code)

**Best Practice**: Use both WAF (network-level) + Code-based (application-level) for defense in depth.


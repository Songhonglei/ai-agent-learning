import { createHash } from 'node:crypto'

const guestWindows = new Map()

export function guestClientKey(request) {
  const forwarded = request.headers?.['x-forwarded-for']
  const realIp = request.headers?.['x-real-ip']
  const address = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : typeof realIp === 'string'
      ? realIp.trim()
      : 'unknown'
  return createHash('sha256').update(address || 'unknown').digest('hex')
}

export function takeGuestAiQuota(key, now = Date.now(), options = {}) {
  const limit = options.limit ?? 12
  const windowMs = options.windowMs ?? 60_000
  const current = guestWindows.get(key)
  if (!current || now >= current.resetAt) {
    guestWindows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    }
  }

  current.count += 1
  return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 }
}

export function resetGuestAiQuotaForTests() {
  guestWindows.clear()
}

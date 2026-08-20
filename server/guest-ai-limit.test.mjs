import assert from 'node:assert/strict'
import test from 'node:test'
import {
  guestClientKey,
  resetGuestAiQuotaForTests,
  takeGuestAiQuota,
} from './guest-ai-limit.mjs'

test('visitor AI uses a hashed network key without requiring an account token', () => {
  const key = guestClientKey({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } })
  assert.match(key, /^[a-f0-9]{64}$/)
  assert.ok(!key.includes('203.0.113.9'))
})

test('visitor AI quota limits a burst and resets in the next window', () => {
  resetGuestAiQuotaForTests()
  const options = { limit: 2, windowMs: 1_000 }
  assert.equal(takeGuestAiQuota('visitor', 0, options).allowed, true)
  assert.equal(takeGuestAiQuota('visitor', 10, options).allowed, true)
  const blocked = takeGuestAiQuota('visitor', 20, options)
  assert.equal(blocked.allowed, false)
  assert.equal(blocked.retryAfterSeconds, 1)
  assert.equal(takeGuestAiQuota('visitor', 1_000, options).allowed, true)
})

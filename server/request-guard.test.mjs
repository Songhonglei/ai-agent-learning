import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequestGuard } from './request-guard.mjs'

test('rate-limits each client and recovers when the window expires', () => {
  let time = 0
  const guard = createRequestGuard({ limit: 2, now: () => time })
  guard.acquire('a')()
  guard.acquire('a')()
  assert.throws(() => guard.acquire('a'), (error) => error.status === 429 && error.retryAfter === 60)
  guard.acquire('b')()
  time = 60_000
  guard.acquire('a')()
})

test('rejects overlapping client requests and limits total concurrent requests', () => {
  const guard = createRequestGuard({ maxConcurrent: 2 })
  const first = guard.acquire('a')
  assert.throws(() => guard.acquire('a'), (error) => error.code === 'REQUEST_IN_PROGRESS')
  const second = guard.acquire('b')
  assert.throws(() => guard.acquire('c'), (error) => error.status === 503)
  first()
  first()
  const third = guard.acquire('c')
  second()
  third()
})

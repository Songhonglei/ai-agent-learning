import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { createProfileHandler } from '../api/profile.mjs'
import { createProfileService } from '../tests/fixtures/profile-service.mjs'

const profile = { schemaVersion: 2, theme: 'light', currentLessonId: '0-1', courses: {}, wrongAnswers: [], favoriteContentIds: [], assessments: {}, courseAssessments: {}, updatedAt: '2026-11-01T00:00:00.000Z' }
const emptyRevision = '"profile-empty"'
let service, handler
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
  service = createProfileService()
  handler = createProfileHandler({ request: service.request })
})
afterEach(() => { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_PUBLISHABLE_KEY })
async function call(method = 'GET', body, revision, token = 'learner-token', target = handler) {
  const result = { status: null, headers: {}, payload: null }
  const response = {
    setHeader(k, v) { result.headers[k] = v; return this },
    status(n) { result.status = n; return this },
    json(v) { result.payload = v; return this },
  }
  await target({ method, body, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(revision ? { 'if-match': revision } : {}) } }, response)
  return result
}

test('unconfigured service, unsupported methods and unauthenticated access are safe', async () => {
  assert.equal((await call('DELETE')).status, 405)
  assert.equal((await call('GET', undefined, undefined, null)).status, 401)
  assert.equal(service.calls.length, 0)
  assert.equal((await call('GET', undefined, undefined, 'invalid')).status, 401)
  delete process.env.SUPABASE_URL
  assert.equal((await call()).status, 503)
})

test('GET returns an internal ETag without creating an account or changing metadata', async () => {
  const result = await call()
  assert.equal(result.status, 200)
  assert.equal(result.payload, null)
  assert.equal(result.headers.ETag, emptyRevision)
  assert.equal(service.records.size, 0)
  assert.equal(service.calls.length, 2)
  assert.ok(service.calls.every(({ init }) => !init.method))
})

test('PUT requires a precondition and rejects legacy payloads and malformed JSON before any write', async () => {
  assert.equal((await call('PUT', profile)).status, 428)
  assert.equal((await call('PUT', profile, '*')).status, 400)
  assert.equal((await call('PUT', '{broken', emptyRevision)).status, 400)
  assert.equal((await call('PUT', {}, emptyRevision)).status, 400)
  assert.equal((await call('PUT', { ...profile, schemaVersion: 1 }, emptyRevision)).status, 409)
  assert.equal((await call('PUT', { ...profile, padding: '中'.repeat(40_000) }, emptyRevision)).status, 413)
  assert.equal(service.calls.length, 0)
})

test('new and existing learner-owned profiles round-trip v2 assessments through conditional writes', async () => {
  const candidate = { ...profile, courseAssessments: { pretest: { answers: { q1: 'b' } } } }
  const first = await call('PUT', candidate, emptyRevision)
  assert.equal(first.status, 200)
  assert.notEqual(first.headers.ETag, emptyRevision)
  assert.deepEqual((await call()).payload, candidate)
  const second = await call('PUT', { ...candidate, theme: 'dark' }, first.headers.ETag)
  assert.equal(second.status, 200)
  assert.notEqual(second.headers.ETag, first.headers.ETag)
  assert.equal(second.payload.theme, 'dark')
  const patch = service.calls.find(({ init }) => init.method === 'PATCH')
  assert.equal(patch.init.headers.Authorization, 'Bearer learner-token')
  assert.match(patch.url.searchParams.get('updated_at'), /^eq\./)
  assert.equal((await call('GET', undefined, undefined, 'other-token')).payload, null)
})

test('a stale ETag cannot overwrite a newer profile', async () => {
  const saved = await call('PUT', profile, emptyRevision)
  const winner = await call('PUT', { ...profile, theme: 'dark' }, saved.headers.ETag)
  const stale = await call('PUT', profile, saved.headers.ETag)
  assert.equal(stale.status, 409)
  assert.equal(stale.payload.code, 'PROFILE_CONFLICT')
  assert.deepEqual((await call()).payload, winner.payload)
})

test('simultaneous first saves have one winner and cannot overwrite it', async () => {
  const results = await Promise.all([call('PUT', profile, emptyRevision), call('PUT', { ...profile, theme: 'dark' }, emptyRevision)])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  assert.deepEqual((await call()).payload, results.find((r) => r.status === 200).payload)
})

test('the database filter catches an update between the read and PATCH', async () => {
  const first = await call('PUT', profile, emptyRevision)
  service.control.beforeWrite = () => {
    const row = service.records.get('learner')
    service.records.set('learner', { ...row, profile: { ...profile, theme: 'dark' }, updated_at: '2099-01-01T00:00:00.000Z' })
  }
  assert.equal((await call('PUT', profile, first.headers.ETag)).status, 409)
  assert.equal(service.records.get('learner').profile.theme, 'dark')
})

test('same-millisecond writes still advance the internal revision', async () => {
  const fixed = createProfileHandler({ request: service.request, now: () => Date.parse('2026-11-01T00:00:00.000Z') })
  const first = await call('PUT', profile, emptyRevision, 'learner-token', fixed)
  const second = await call('PUT', profile, first.headers.ETag, 'learner-token', fixed)
  assert.equal(second.status, 200)
  assert.notEqual(second.headers.ETag, first.headers.ETag)
})

test('authentication, REST, JSON and timeouts all return a safe bounded error', async () => {
  service.control.failAuth = true
  assert.equal((await call()).status, 503)
  service.control.failAuth = false
  service.control.failRest = true
  assert.equal((await call()).status, 503)
  const malformed = createProfileHandler({ request: async () => ({ ok: true, json: async () => { throw new Error('private-provider-error') } }) })
  const result = await call('GET', undefined, undefined, 'learner-token', malformed)
  assert.equal(result.status, 503)
  assert.doesNotMatch(JSON.stringify(result), /private-provider-error/)
  const timeout = createProfileHandler({ request: async () => new Promise(() => {}), timeoutMs: 10 })
  assert.equal((await call('GET', undefined, undefined, 'learner-token', timeout)).status, 503)
})

test('an auth response arriving after the deadline cannot continue into a write', async () => {
  const calls = []
  const slow = createProfileHandler({
    timeoutMs: 5,
    request: async (url) => {
      calls.push(url)
      await new Promise((resolve) => setTimeout(resolve, 20))
      return Response.json({ id: 'learner', email: 'learner@example.com' })
    },
  })
  const result = await call('PUT', profile, emptyRevision, 'learner-token', slow)
  assert.equal(result.status, 503)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(calls.length, 1)
  assert.equal(service.records.size, 0)
})

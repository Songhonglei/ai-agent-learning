import assert from 'node:assert/strict'
import test from 'node:test'
import profileHandler from '../api/profile.mjs'

const profile = {
  schemaVersion: 1,
  theme: 'light',
  currentLessonId: '0-1',
  courses: {},
  wrongAnswers: [],
  favoriteContentIds: [],
  assessments: {},
  updatedAt: '2026-08-19T00:00:00.000Z',
}

function responseRecorder() {
  const result = { statusCode: null, headers: {}, payload: null }
  return {
    result,
    status(statusCode) {
      result.statusCode = statusCode
      return this
    },
    setHeader(name, value) {
      result.headers[name] = value
      return this
    },
    json(payload) {
      result.payload = payload
      return this
    },
  }
}

function request(method, body, authorization = 'Bearer learner-token') {
  return { method, body, headers: { authorization } }
}

function setSupabaseConfig() {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
}

function clearSupabaseConfig() {
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_PUBLISHABLE_KEY
}

test('profile API makes unconfigured deployments explicitly local-only', async () => {
  clearSupabaseConfig()
  const response = responseRecorder()

  await profileHandler(request('GET'), response)

  assert.equal(response.result.statusCode, 503)
  assert.deepEqual(response.result.payload, { error: '学习档案服务尚未完成配置。' })
})

test('profile API rejects profile access without an authenticated learner', async () => {
  setSupabaseConfig()
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ ok: false, status: 401 })
  const response = responseRecorder()

  try {
    await profileHandler(request('GET', undefined, undefined), response)
    assert.equal(response.result.statusCode, 401)
    assert.deepEqual(response.result.payload, { error: '请先通过邮箱登录后再同步学习档案。' })
  } finally {
    globalThis.fetch = originalFetch
    clearSupabaseConfig()
  }
})

test('profile API verifies the learner token before reading an empty cloud profile', async () => {
  setSupabaseConfig()
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: '00000000-0000-4000-8000-000000000001', email: 'learner@example.com', user_metadata: { display_name: '学习者' } }) }
    }
    if (String(url).includes('select=profile')) return { ok: true, json: async () => [] }
    return { ok: true, json: async () => [] }
  }
  const response = responseRecorder()

  try {
    await profileHandler(request('GET'), response)
    assert.equal(response.result.statusCode, 200)
    assert.equal(response.result.payload, null)
    assert.equal(calls.length, 3)
    assert.match(calls[0].url, /\/auth\/v1\/user$/)
    assert.equal(calls[0].init.headers.Authorization, 'Bearer learner-token')
  } finally {
    globalThis.fetch = originalFetch
    clearSupabaseConfig()
  }
})

test('profile API validates and upserts a learner-owned profile server-side', async () => {
  setSupabaseConfig()
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: '00000000-0000-4000-8000-000000000001', email: 'learner@example.com', user_metadata: { display_name: '学习者' } }) }
    }
    return { ok: true, json: async () => [{ profile }] }
  }
  const response = responseRecorder()

  try {
    await profileHandler(request('PUT', profile), response)
    assert.equal(response.result.statusCode, 200)
    assert.deepEqual(response.result.payload, profile)
    assert.equal(calls.length, 3)
    assert.equal(calls[2].init.headers.Authorization, 'Bearer learner-token')
    assert.match(calls[2].init.body, /learner@example\.com/)
  } finally {
    globalThis.fetch = originalFetch
    clearSupabaseConfig()
  }
})

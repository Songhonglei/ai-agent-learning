import assert from 'node:assert/strict'
import test from 'node:test'
import courseAnswer from '../api/course-answer.mjs'
import { resetGuestAiQuotaForTests } from './guest-ai-limit.mjs'

function responseRecorder() {
  return {
    headers: {},
    statusCode: 0,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }
}

test('Internet visitors can ask AI questions without an Authorization header', async (t) => {
  resetGuestAiQuotaForTests()
  const previous = {
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    apiStyle: process.env.AI_API_STYLE,
    model: process.env.AI_MODEL,
  }
  process.env.AI_BASE_URL = 'https://example.test/v1'
  process.env.AI_API_KEY = 'server-only-key'
  process.env.AI_API_STYLE = 'openai-chat-completions'
  process.env.AI_MODEL = 'example-model'
  t.after(() => {
    for (const [name, value] of Object.entries({
      AI_BASE_URL: previous.baseUrl,
      AI_API_KEY: previous.apiKey,
      AI_API_STYLE: previous.apiStyle,
      AI_MODEL: previous.model,
    })) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body)
    assert.equal(body.messages[1].content.includes('什么是上下文窗口？'), true)
    return new Response(JSON.stringify({
      choices: [{ message: { content: '它是模型当前可见的信息范围。\n<sources>page-035</sources>' } }],
    }), { status: 200 })
  }
  t.after(() => { globalThis.fetch = originalFetch })

  const response = responseRecorder()
  await courseAnswer({
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.8' },
    body: { courseId: '1-1', question: '什么是上下文窗口？' },
  }, response)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.payload, {
    answer: '它是模型当前可见的信息范围。',
    citations: ['page-035'],
  })
  assert.equal(Number(response.headers['X-RateLimit-Remaining']) >= 0, true)
})

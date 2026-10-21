import assert from 'node:assert/strict'
import test from 'node:test'
import { answerCourseQuestion, readAiConfig } from './course-answer.mjs'

const primary = { baseUrl: 'https://primary.example/v1', apiKey: 'primary-test-key', model: 'primary', apiStyle: 'openai-chat-completions', timeoutMs: 100 }
const fallback = { baseUrl: 'https://fallback.example/v1', apiKey: 'fallback-test-key', model: 'kimi-k2.6', apiStyle: 'openai-chat-completions', timeoutMs: 100, thinking: 'disabled' }
const answer = (text = '先确认上下文。<sources>page-035</sources>') => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }))
const env = { AI_BASE_URL: primary.baseUrl, AI_API_KEY: primary.apiKey, AI_API_STYLE: primary.apiStyle, AI_MODEL: primary.model,
  AI_FALLBACK_BASE_URL: fallback.baseUrl, AI_FALLBACK_API_KEY: fallback.apiKey, AI_FALLBACK_MODEL: fallback.model, AI_FALLBACK_THINKING: 'disabled' }
const ask = (request, extra = {}) => answerCourseQuestion({ courseId: '1-1', question: '什么是上下文？', config: { ...primary, fallback }, request, ...extra })

test('prepared fallback settings stay inactive until the API key is supplied', async () => {
  const { AI_FALLBACK_API_KEY, ...withoutKey } = env
  assert.equal((await readAiConfig(withoutKey)).fallback, undefined)
  const configured = await readAiConfig(env)
  assert.equal(configured.fallback.model, 'kimi-k2.6')
  assert.equal(configured.fallback.timeoutMs, 30_000)
  assert.equal(configured.fallback.thinking, 'disabled')
  assert.equal(configured.apiKey, primary.apiKey)
})

test('supports fallback as the only configured model and rejects incomplete configuration', async () => {
  const onlyFallback = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('AI_FALLBACK_')))
  assert.equal((await readAiConfig(onlyFallback)).apiKey, fallback.apiKey)
  for (const invalid of [{ AI_FALLBACK_BASE_URL: '' }, { AI_FALLBACK_MODEL: '' }, { AI_FALLBACK_API_STYLE: 'unknown' }, { AI_FALLBACK_THINKING: 'unknown' }, { AI_FALLBACK_TIMEOUT_MS: 'invalid' }]) {
    await assert.rejects(() => readAiConfig({ ...env, ...invalid }))
  }
})

test('does not call or expose fallback when the primary succeeds or returns a valid refusal', async () => {
  for (const content of ['确认当前窗口。<sources>page-035</sources>', '资料未覆盖。<sources></sources>']) {
    let calls = 0
    await ask(async (url, options) => {
      calls++
      assert.equal(url, 'https://primary.example/v1/chat/completions')
      assert.equal(options.headers.Authorization, `Bearer ${primary.apiKey}`)
      assert.ok(!JSON.parse(options.body).thinking)
      return answer(content)
    })
    assert.equal(calls, 1)
  }
})

test('falls back once after upstream, network, JSON, empty and invalid citation failures', async (t) => {
  const failures = {
    unavailable: () => new Response('unavailable', { status: 503 }),
    authentication: () => new Response('private-error', { status: 401 }),
    busy: () => new Response('', { status: 429 }),
    network: () => { throw new Error('private-error') },
    json: () => new Response('invalid JSON'),
    empty: () => answer(''),
    citation: () => answer('伪造内容<sources>page-999</sources>'),
  }
  for (const [name, fail] of Object.entries(failures)) await t.test(name, async () => {
    let calls = 0
    const result = await ask(async (url, options) => {
      if (++calls === 1) return fail()
      assert.equal(url, 'https://fallback.example/v1/chat/completions')
      assert.equal(options.headers.Authorization, `Bearer ${fallback.apiKey}`)
      assert.ok(!options.body.includes(primary.apiKey))
      const body = JSON.parse(options.body)
      assert.equal(body.model, 'kimi-k2.6')
      assert.deepEqual(body.thinking, { type: 'disabled' })
      return answer()
    })
    assert.equal(calls, 2)
    assert.deepEqual(result, { answer: '先确认上下文。', citations: ['page-035'] })
  })
})

test('aborts the timed-out primary transport before starting fallback', async () => {
  let primarySignal
  let calls = 0
  const result = await ask(async (_url, options) => {
    if (++calls === 1) {
      primarySignal = options.signal
      return new Promise(() => {})
    }
    assert.equal(primarySignal.aborted, true)
    return answer()
  }, { config: { ...primary, timeoutMs: 15, fallback } })
  assert.equal(calls, 2)
  assert.deepEqual(result.citations, ['page-035'])
})

test('never falls back after cancellation, including already cancelled requests', async () => {
  for (const preCancelled of [true, false]) {
    const controller = new AbortController()
    let calls = 0
    if (preCancelled) controller.abort()
    const pending = ask(async () => { calls++; controller.abort(); return new Promise(() => {}) }, { signal: controller.signal })
    await assert.rejects(pending, (error) => error.code === 'REQUEST_CANCELLED')
    assert.equal(calls, preCancelled ? 0 : 1)
  }
})

test('fallback uses the same citation guard and returns safe failure without a third attempt', async () => {
  for (const failure of [() => answer('编造内容<sources>page-999</sources>'), () => { throw new Error('private-error-fallback-test-key') }, () => new Promise(() => {})]) {
    let calls = 0
    await assert.rejects(ask(async () => ++calls === 1 ? new Response('', { status: 500 }) : failure()), (error) => {
      assert.ok(['AI_SOURCE_INVALID', 'AI_CONNECTION_ERROR', 'AI_TIMEOUT'].includes(error.code))
      assert.ok(!error.message.includes('private-error'))
      assert.ok(!error.message.includes(fallback.apiKey))
      return true
    })
    assert.equal(calls, 2)
  }
})

test('provider diagnostics identify primary and fallback status without secrets or content', async (t) => {
  const warnings = []
  t.mock.method(console, 'warn', (...args) => warnings.push(args))
  let calls = 0
  await assert.rejects(ask(async () => new Response('private provider body', { status: ++calls === 1 ? 401 : 402 })), (error) => error.code === 'AI_UPSTREAM_ERROR')
  assert.deepEqual(warnings, [
    ['course-answer-provider:', 'primary', 'HTTP_401'],
    ['course-answer-provider:', 'fallback', 'HTTP_402'],
  ])
  const logged = JSON.stringify(warnings)
  for (const privateValue of [primary.apiKey, fallback.apiKey, 'private provider body', '什么是上下文']) assert.ok(!logged.includes(privateValue))
})

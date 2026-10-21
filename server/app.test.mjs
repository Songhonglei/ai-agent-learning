import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { createLearningServer, createCourseAnswerHandler } from './app.mjs'
import { answerCourseQuestion, CourseAnswerError } from './course-answer.mjs'
import { createRequestGuard } from './request-guard.mjs'

const config = { baseUrl: 'https://example.test/v1', apiKey: 'local-only-key', model: 'stub', apiStyle: 'openai-chat-completions', timeoutMs: 25 }
const question = { courseId: '1-1', question: '什么是上下文？' }

async function listen(t, server) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)) })
  const origin = `http://127.0.0.1:${server.address().port}`
  return { origin, post: (body = question, extra = {}) => fetch(`${origin}/api/course-answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...extra }) }
}

test('HTTP rejects malformed, unknown, oversized and non-JSON input before model invocation', async (t) => {
  let calls = 0
  const { origin, post } = await listen(t, createLearningServer({ getConfig: () => config, answer: async () => { calls++; return {} } }))
  for (const payload of [null, [], {}, { ...question, courseId: '__proto__' }, { ...question, question: ' ' }]) assert.equal((await post(payload)).status, 400)
  assert.equal((await post({ ...question, question: '长'.repeat(2001) })).status, 413)
  assert.equal((await post(question, { body: '{bad' })).status, 400)
  assert.equal((await post(question, { headers: { 'Content-Type': 'text/plain' } })).status, 415)
  assert.equal((await fetch(`${origin}/api/course-answer`)).status, 405)
  assert.equal(calls, 0)
})

test('HTTP returns safe timeout, busy, connection and citation failures, then allows retry', async (t) => {
  let scenario = 'timeout'
  const answer = (input) => answerCourseQuestion({ ...input, request: async () => {
    if (scenario === 'timeout') return new Promise(() => {})
    if (scenario === 'busy') return new Response('private detail', { status: 429 })
    if (scenario === 'offline') throw new Error('private key')
    return new Response(JSON.stringify({ choices: [{ message: { content: `回答。<sources>${scenario === 'invalid' ? 'page-999' : 'page-035'}</sources>` } }] }), { status: 200 })
  } })
  const { post } = await listen(t, createLearningServer({ getConfig: () => config, answer }))
  for (const [name, status, code] of [['timeout', 504, 'AI_TIMEOUT'], ['busy', 503, 'AI_BUSY'], ['offline', 502, 'AI_CONNECTION_ERROR'], ['invalid', 502, 'AI_SOURCE_INVALID']]) {
    scenario = name
    const response = await post()
    assert.equal(response.status, status)
    const payload = await response.json()
    assert.equal(payload.code, code)
    assert.doesNotMatch(payload.error, /private/)
    if (name === 'busy') assert.equal(response.headers.get('retry-after'), '5')
  }
  scenario = 'success'
  const response = await post()
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { answer: '回答。', citations: ['page-035'] })
})

test('HTTP reports unconfigured or invalid configuration without crashing the server', async (t) => {
  const { post } = await listen(t, createLearningServer({ getConfig: () => null }))
  assert.equal((await post()).status, 503)
  const { post: retry } = await listen(t, createLearningServer({ getConfig: () => { throw new Error('secret config') } }))
  const response = await retry()
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /secret config/)
})

test('HTTP exposes a retry window and releases request slots after success', async (t) => {
  const { post } = await listen(t, createLearningServer({ getConfig: () => config, guard: createRequestGuard({ limit: 2 }), answer: async () => ({ answer: '回答', citations: [] }) }))
  assert.equal((await post()).status, 200)
  assert.equal((await post()).status, 200)
  const response = await post()
  assert.equal(response.status, 429)
  assert.ok(Number(response.headers.get('retry-after')) > 0)
})

test('supports Vercel parsed request bodies using the same HTTP handler', async (t) => {
  const handler = createCourseAnswerHandler({ getConfig: () => config, answer: async ({ question: text }) => ({ answer: text, citations: ['page-035'] }) })
  const server = createServer((request, response) => { request.body = question; handler(request, response) })
  const { post } = await listen(t, server)
  assert.equal((await post()).status, 200)
})

test('production routes return the app shell, real PDF, and 404 for missing assets', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'course-static-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'index.html'), '<html>course shell</html>')
  await writeFile(join(directory, 'book.pdf'), '%PDF-test')
  const { origin } = await listen(t, createLearningServer({ distDirectory: directory, documentPath: join(directory, 'book.pdf') }))
  for (const path of ['/', '/lesson/0-1', '/profile']) {
    const response = await fetch(origin + path)
    assert.match(response.headers.get('content-type'), /text\/html/)
    assert.match(await response.text(), /course shell/)
  }
  const pdf = await fetch(`${origin}/resources/original-document.pdf`)
  assert.equal(pdf.headers.get('content-type'), 'application/pdf')
  assert.match(await pdf.text(), /^%PDF-/)
  assert.equal((await fetch(`${origin}/missing.js`)).status, 404)
  assert.equal((await fetch(`${origin}/api/missing`)).status, 404)
})

test('real HTTP model transport handles success, rate limiting, invalid JSON and timeout', async (t) => {
  let mode = 'success'
  const provider = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    assert.equal(request.url, '/v1/chat/completions')
    const payload = JSON.parse(body)
    assert.match(payload.messages[0].content, /已复核来源/)
    assert.match(payload.messages[1].content, /什么是上下文/)
    if (mode === 'timeout') return
    if (mode === 'busy') { response.writeHead(429); return response.end('provider private details') }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(mode === 'bad-json' ? 'broken json' : JSON.stringify({ choices: [{ message: { content: '先检查当前可见信息。<sources>page-035</sources>' } }] }))
  })
  const { origin } = await listen(t, provider)
  const { post } = await listen(t, createLearningServer({ getConfig: () => ({ ...config, baseUrl: `${origin}/v1`, timeoutMs: 100 }) }))
  for (const [name, status] of [['success', 200], ['busy', 503], ['bad-json', 502], ['timeout', 504]]) {
    mode = name
    const response = await post()
    assert.equal(response.status, status)
    assert.doesNotMatch(await response.text(), /provider private details/)
  }
})

test('disconnecting a learner cancels upstream work and releases the request slot', async (t) => {
  let start
  const started = new Promise((resolve) => { start = resolve })
  let cancel
  const cancelled = new Promise((resolve) => { cancel = resolve })
  let calls = 0
  const answer = async ({ signal }) => {
    calls++
    if (calls > 1) return { answer: '重试成功', citations: ['page-035'] }
    start()
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => { cancel(); reject(new CourseAnswerError(499, 'REQUEST_CANCELLED', '已取消')) }, { once: true }))
  }
  const { post } = await listen(t, createLearningServer({ getConfig: () => config, answer }))
  const controller = new AbortController()
  const pending = post(question, { signal: controller.signal })
  await started
  controller.abort()
  await assert.rejects(pending)
  await cancelled
  assert.equal((await post()).status, 200)
})

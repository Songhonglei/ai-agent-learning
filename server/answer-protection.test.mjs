import assert from 'node:assert/strict'
import test from 'node:test'
import { answerCourseQuestion, approvedSourceIds, CourseAnswerError, courseContext } from './course-answer.mjs'

const config = { baseUrl: 'https://example.test/v1', apiKey: 'server-only-key', model: 'stub', apiStyle: 'openai-chat-completions', timeoutMs: 100 }
const modelResponse = (content) => async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })

test('only the first source-table column grants approved citation membership', () => {
  assert.deepEqual([...approvedSourceIds('| `page-035` / `experiment-2-4` | mentions `page-999` |\nNarrative `page-888`')], ['page-035', 'experiment-2-4'])
})

test('validates outline and experiment IDs, deduplicates citations and strips inline IDs', async () => {
  const result = await answerCourseQuestion({
    courseId: '1-2', config,
    request: modelResponse('清晰流程帮助执行。[page-054]\n<sources>outline-054-040,experiment-2-4,page-054,page-054</sources>'),
  })
  assert.deepEqual(result, { answer: '清晰流程帮助执行。', citations: ['outline-054-040', 'experiment-2-4', 'page-054'] })
})

test('rejects fabricated, cross-course and malformed citation IDs without displaying the answer', async () => {
  for (const raw of [
    '回答。<sources>page-999</sources>',
    '回答。<sources>page-035,page-312</sources>',
    '回答。<sources>not-a-source</sources>',
    '回答。[page-999]<sources>page-035</sources>',
    '回答。<sources>page-999</sources><sources></sources>',
  ]) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '1-1', config, request: modelResponse(raw) }), (error) => error instanceof CourseAnswerError && error.code === 'AI_SOURCE_INVALID')
  }
})

test('uncited responses become a fixed out-of-scope message instead of unverified prose', async () => {
  for (const raw of ['不受资料支持的回答。', '本课审核资料未覆盖这个问题。<sources></sources>']) {
    const result = await answerCourseQuestion({ courseId: '1-1', config, request: modelResponse(raw) })
    assert.match(result.answer, /^本课审核资料未覆盖这个问题/)
    assert.deepEqual(result.citations, [])
    assert.doesNotMatch(result.answer, /不受资料支持的回答/)
  }
})

test('supports valid legacy inline citations and rejects prototype property course IDs', async () => {
  assert.deepEqual(await answerCourseQuestion({ courseId: '1-1', config, request: modelResponse('先检查信息。[page-035]') }), { answer: '先检查信息。', citations: ['page-035'] })
  for (const course of ['constructor', '__proto__', 'toString']) await assert.rejects(() => courseContext(course), /未知课程/)
})

test('times out both a stalled provider and a stalled response body', async () => {
  for (const request of [
    async () => new Promise(() => {}),
    async () => ({ ok: true, json: () => new Promise(() => {}) }),
  ]) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '1-1', config: { ...config, timeoutMs: 15 }, request }), (error) => error.code === 'AI_TIMEOUT' && error.status === 504)
  }
})

test('cancels a pending model request when the caller aborts', async () => {
  const controller = new AbortController()
  let notifyStarted
  const started = new Promise((resolve) => { notifyStarted = resolve })
  let providerSignal
  const promise = answerCourseQuestion({ courseId: '1-1', config, signal: controller.signal, request: async (_url, options) => { providerSignal = options.signal; notifyStarted(); return new Promise(() => {}) } })
  await started
  controller.abort()
  await assert.rejects(promise, (error) => error.code === 'REQUEST_CANCELLED')
  assert.equal(providerSignal.aborted, true)
})

test('maps upstream failures to safe messages without leaking provider details', async () => {
  for (const [request, code] of [
    [async () => new Response('secret-provider-body', { status: 429 }), 'AI_BUSY'],
    [async () => new Response('secret-provider-body', { status: 500 }), 'AI_UPSTREAM_ERROR'],
    [async () => { throw new Error('secret-provider-key') }, 'AI_CONNECTION_ERROR'],
    [async () => new Response('not-json', { status: 200 }), 'AI_CONNECTION_ERROR'],
    [modelResponse(''), 'AI_EMPTY_ANSWER'],
  ]) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '1-1', config, request }), (error) => error.code === code && !error.message.includes('secret-provider'))
  }
})


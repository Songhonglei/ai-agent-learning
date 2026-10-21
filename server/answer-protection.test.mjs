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

test('only an explicit fixed refusal is treated as out of scope', async () => {
  for (const raw of ['本课审核资料未覆盖这个问题。<sources></sources>', ' 本课审核资料未覆盖这个问题 \n<sources> </sources>']) {
    const result = await answerCourseQuestion({ courseId: '1-1', config, request: modelResponse(raw) })
    assert.match(result.answer, /^本课审核资料未覆盖这个问题/)
    assert.deepEqual(result.citations, [])
  }
})

test('missing citations are a retryable source error, not a claim that the course has no coverage', async () => {
  for (const raw of ['多个 Agent 在引入新信息时有价值。', '多个 Agent 在任务可拆分时有价值。<sources></sources>', '本课审核资料未覆盖这个问题。但是仍然可以编造回答。<sources></sources>']) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(raw) }), (error) => {
      assert.equal(error.code, 'AI_SOURCE_MISSING')
      assert.equal(error.status, 502)
      assert.match(error.message, /课程来源/)
      assert.doesNotMatch(error.message, /资料未覆盖|多个 Agent|编造回答/)
      return true
    })
  }
})

test('recovers only model-supplied inline citations when the sources tag is empty', async () => {
  const result = await answerCourseQuestion({ courseId: '4-2', config, request: modelResponse('协作应引入新信息。[page-312]<sources></sources>') })
  assert.deepEqual(result, { answer: '协作应引入新信息。', citations: ['page-312'] })
  await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse('跨课内容。[page-035]<sources></sources>') }), (error) => error.code === 'AI_SOURCE_INVALID')
})

test('does not accept empty answers or a refusal accompanied by invented supporting claims', async () => {
  await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse('<sources></sources>') }), (error) => error.code === 'AI_EMPTY_ANSWER')
  await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse('本课审核资料未覆盖这个问题。<sources>page-312</sources>') }), (error) => error.code === 'AI_SOURCE_INVALID')
})

test('4-2 prompt uses its own approved source IDs and keeps the reported collaboration question answerable', async () => {
  const question = '什么时候多个 Agent 的协作更有价值？'
  const result = await answerCourseQuestion({ courseId: '4-2', question, config, request: async (_url, options) => {
    const { messages } = JSON.parse(options.body)
    assert.match(messages[0].content, /当前课允许的来源 ID：figure-10-1,outline-280-258,page-280,page-312/)
    assert.match(messages[0].content, /漏写引用属于输出格式错误/)
    assert.doesNotMatch(messages[0].content, /page-035|figure-2-1/)
    assert.ok(messages[1].content.includes(question))
    return (modelResponse(JSON.stringify({ status: 'answered', answer: '在引入新信息、任务可拆分、需要并行或隔离时更有价值。', citations: ['outline-280-258', 'page-312'] })))()
  } })
  assert.deepEqual(result.citations, ['outline-280-258', 'page-312'])
})

test('validates structured answers, including fenced JSON, without inventing citations', async () => {
  const raw = JSON.stringify({ status: 'answered', answer: '协作应引入新信息。', citations: ['page-312', 'page-312'] })
  for (const content of [raw, `\x60\x60\x60json\n${raw}\n\x60\x60\x60`]) {
    const result = await answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(content) })
    assert.deepEqual(result, { answer: '协作应引入新信息。', citations: ['page-312'] })
  }
  for (const id of ['page-035', 'page-999', 'not-a-source']) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(JSON.stringify({ status: 'answered', answer: '未经核验正文。', citations: [id] })) }), (error) => error.code === 'AI_SOURCE_INVALID')
  }
})

test('structured refusal, missing citations and malformed output remain distinct', async () => {
  const refusal = await answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(JSON.stringify({ status: 'out_of_scope', answer: '', citations: [] })) })
  assert.match(refusal.answer, /^本课审核资料未覆盖/)
  assert.deepEqual(refusal.citations, [])
  await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(JSON.stringify({ status: 'answered', answer: '正文漏写来源。', citations: [] })) }), (error) => error.code === 'AI_SOURCE_MISSING')
  for (const content of ['{bad JSON}', JSON.stringify({ status: 'answered', answer: '正文。', citations: 'page-312' }), JSON.stringify({ status: 'unknown', answer: '', citations: [] }), JSON.stringify({ status: 'out_of_scope', answer: '资料支持的实际回答，但状态错误。', citations: [] })]) {
    await assert.rejects(() => answerCourseQuestion({ courseId: '4-2', config, request: modelResponse(content) }), (error) => error.code === 'AI_RESPONSE_INVALID')
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


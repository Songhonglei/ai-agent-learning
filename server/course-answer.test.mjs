import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answerCourseQuestion,
  courseContext,
  loadAiProperties,
  openAiChatEndpoint,
  readAiConfig,
  runwayEndpoint,
} from './course-answer.mjs'

function assertRunwayBusinessError(data) {
  if (data.Code || data.Error) {
    throw new Error(`upstream business error: ${data.Error || data.Code}`)
  }
}

test('loads the audited source pack for an authored course', async () => {
  const context = await courseContext('1-1')
  assert.match(context, /上下文窗口/)
  assert.match(context, /page-035/)
})

test('rejects unknown courses and invalid runway endpoints', async () => {
  await assert.rejects(() => courseContext('unknown'), /未知课程/)
  assert.throws(() => runwayEndpoint('not-a-url'), /ai.base_url/)
})

test('reads only complete server-side AI configuration', async () => {
  assert.equal(await readAiConfig({ AI_BASE_URL: 'https://example.test/v1' }), null)
  assert.deepEqual(await readAiConfig({
    AI_BASE_URL: 'https://example.test/v1',
    AI_API_KEY: 'server-only-key',
  }), {
    baseUrl: 'https://example.test/v1',
    apiKey: 'server-only-key',
    timeoutMs: 20_000,
    apiStyle: 'runway-bedrock',
    model: undefined,
  })
})

test('supports a server-only OpenAI-compatible gateway configuration', async () => {
  assert.equal(openAiChatEndpoint('https://example.test/v1'), 'https://example.test/v1/chat/completions')
  assert.equal(openAiChatEndpoint('https://example.test/v1/chat/completions'), 'https://example.test/v1/chat/completions')
  assert.deepEqual(await readAiConfig({
    AI_BASE_URL: 'https://example.test/v1',
    AI_API_KEY: 'server-only-key',
    AI_API_STYLE: 'openai-chat-completions',
    AI_MODEL: 'example-model',
  }), {
    baseUrl: 'https://example.test/v1',
    apiKey: 'server-only-key',
    timeoutMs: 20_000,
    apiStyle: 'openai-chat-completions',
    model: 'example-model',
  })
})

test('loads ai.properties from multiple candidate paths', async () => {
  assert.equal(await loadAiProperties([]), null)
})

test('moves model inline source IDs into the separate citation list', async () => {
  const result = await answerCourseQuestion({
    courseId: '1-1',
    config: {
      baseUrl: 'https://example.test/v1',
      apiKey: 'server-only-key',
      timeoutMs: 100,
    },
    request: async (url, options) => {
      assert.equal(url, runwayEndpoint('https://example.test/v1'))
      assert.equal(options.headers.token, 'server-only-key')
      assert.ok(!('api-key' in options.headers))
      assert.ok(!('Authorization' in options.headers))
      const body = JSON.parse(options.body)
      assert.equal(body.anthropic_version, 'bedrock-2023-05-31')
      assert.equal(body.max_tokens, 4096)
      assert.equal(typeof body.system, 'string')
      assert.equal(body.messages.length, 1)
      assert.equal(body.messages[0].role, 'user')
      assert.ok(!('model' in body))
      assert.ok(!('temperature' in body))
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: '先检查当前可见的信息。再确认工具结果。\n<sources>page-035,figure-2-1</sources>' }],
      }), { status: 200 })
    },
  })

  assert.equal(result.answer, '先检查当前可见的信息。再确认工具结果。')
  assert.deepEqual(result.citations, ['page-035', 'figure-2-1'])
})

test('uses the OpenAI-compatible chat completion shape when configured', async () => {
  const result = await answerCourseQuestion({
    courseId: '1-1',
    config: {
      baseUrl: 'https://example.test/v1',
      apiKey: 'server-only-key',
      timeoutMs: 100,
      apiStyle: 'openai-chat-completions',
      model: 'example-model',
    },
    request: async (url, options) => {
      assert.equal(url, openAiChatEndpoint('https://example.test/v1'))
      assert.equal(options.headers.Authorization, 'Bearer server-only-key')
      const body = JSON.parse(options.body)
      assert.equal(body.model, 'example-model')
      assert.equal(body.messages[0].role, 'system')
      assert.equal(body.messages[1].role, 'user')
      return new Response(JSON.stringify({
        choices: [{ message: { content: '先检查当前窗口。\n<sources>page-035</sources>' } }],
      }), { status: 200 })
    },
  })

  assert.equal(result.answer, '先检查当前窗口。')
  assert.deepEqual(result.citations, ['page-035'])
})

test('throws on upstream business error wrapped in 200 OK', async () => {
  await assert.rejects(async () => answerCourseQuestion({
    courseId: '1-1',
    config: {
      baseUrl: 'https://example.test/v1',
      apiKey: 'server-only-key',
      timeoutMs: 100,
    },
    request: async () => new Response(JSON.stringify({
      Code: 'ValidationException',
      Error: 'temperature is not supported',
    }), { status: 200 }),
  }), /upstream business error/)
})

test('includes the provider error code for a failed OpenAI-compatible request', async () => {
  await assert.rejects(async () => answerCourseQuestion({
    courseId: '1-1',
    config: {
      baseUrl: 'https://example.test/v1',
      apiKey: 'server-only-key',
      timeoutMs: 100,
      apiStyle: 'openai-chat-completions',
      model: 'example-model',
    },
    request: async () => new Response(JSON.stringify({
      error: { code: 'invalid_api_key', message: 'redacted provider detail' },
    }), { status: 401 }),
  }), /模型服务返回 401 \(invalid_api_key\)/)
})

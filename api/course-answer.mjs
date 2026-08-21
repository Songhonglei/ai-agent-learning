import { answerCourseQuestion, readAiConfig } from '../server/course-answer.mjs'
import { guestClientKey, takeGuestAiQuota } from '../server/guest-ai-limit.mjs'

function sendJson(response, status, payload) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(status).json(payload)
}

function requestBody(request) {
  if (typeof request.body === 'string') return JSON.parse(request.body)
  return request.body
}

function safeErrorDetails(error) {
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object'
    ? error.cause
    : null

  return {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : 'unknown error',
    causeCode: typeof cause?.code === 'string' ? cause.code : null,
    causeName: typeof cause?.name === 'string' ? cause.name : null,
  }
}

/**
 * Vercel Node.js Function for the AI tutor.
 *
 * The API key is read only from server-side Vercel environment variables:
 * AI_BASE_URL, AI_API_KEY and (optionally) AI_TIMEOUT_MS.
 */
export default async function courseAnswer(request, response) {
  if (request.method !== 'POST') {
    return sendJson(response, 405, { error: '只支持 POST 请求' })
  }

  const config = await readAiConfig()
  if (!config) {
    return sendJson(response, 503, { error: 'AI 服务尚未完成服务器配置。' })
  }

  const quota = takeGuestAiQuota(guestClientKey(request))
  response.setHeader('X-RateLimit-Remaining', String(quota.remaining))
  if (!quota.allowed) {
    response.setHeader('Retry-After', String(quota.retryAfterSeconds))
    return sendJson(response, 429, { error: 'AI 提问有点频繁，请稍后再试。' })
  }

  try {
    const payload = requestBody(request)
    if (typeof payload?.courseId !== 'string' || typeof payload?.question !== 'string' || !payload.question.trim()) {
      return sendJson(response, 400, { error: '课程或问题格式不正确。' })
    }

    const result = await answerCourseQuestion({
      courseId: payload.courseId,
      question: payload.question.trim().slice(0, 2_000),
      config,
    })
    return sendJson(response, 200, result)
  } catch (error) {
    console.error('课程问答请求失败：', safeErrorDetails(error))
    return sendJson(response, 502, { error: 'AI 助教暂时无法回答，请稍后重试。' })
  }
}

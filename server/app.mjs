import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { answerCourseQuestion, CourseAnswerError, isCourseId, readAiConfig } from './course-answer.mjs'
import { createRequestGuard } from './request-guard.mjs'

const root = resolve(import.meta.dirname, '..')
const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json; charset=utf-8',
}

export function sendJson(response, status, payload, headers = {}) {
  if (response.destroyed) return
  if (typeof response.writeHead === 'function') {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
    response.end(JSON.stringify(payload))
  } else {
    for (const [key, value] of Object.entries({ 'Cache-Control': 'no-store', ...headers })) response.setHeader(key, value)
    response.status(status).json(payload)
  }
}

async function jsonBody(request) {
  const tooLarge = () => new CourseAnswerError(413, 'QUESTION_TOO_LONG', '问题过长，请缩短后重试。')
  if (Number(request.headers['content-length']) > 12_000) throw tooLarge()
  if (request.body !== undefined) {
    const text = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
    if (Buffer.byteLength(text) > 12_000) throw tooLarge()
    try { return JSON.parse(text) } catch { throw new CourseAnswerError(400, 'INVALID_JSON', '问题格式不正确，请重新提交。') }
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 12_000) throw tooLarge()
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new CourseAnswerError(400, 'INVALID_JSON', '问题格式不正确，请重新提交。') }
}

export function createCourseAnswerHandler({ getConfig = readAiConfig, answer = answerCourseQuestion, guard = createRequestGuard(), clientKey = (request) => request.socket?.remoteAddress ?? 'unknown' } = {}) {
  return async (request, response) => {
    if (request.method !== 'POST') return sendJson(response, 405, { error: '只支持 POST 请求' }, { Allow: 'POST' })
    const controller = new AbortController()
    const cancel = () => { if (!response.writableEnded) controller.abort() }
    response.on?.('close', cancel)
    let release
    try {
      if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) throw new CourseAnswerError(415, 'INVALID_CONTENT_TYPE', '请使用 JSON 格式提交问题。')
      release = guard.acquire(clientKey(request))
      response.setHeader('X-RateLimit-Remaining', String(release.remaining))
      const payload = await jsonBody(request)
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !isCourseId(payload.courseId) || typeof payload.question !== 'string' || !payload.question.trim()) {
        throw new CourseAnswerError(400, 'INVALID_QUESTION', '课程或问题格式不正确。')
      }
      const question = payload.question.trim()
      if (question.length > 2_000) throw new CourseAnswerError(413, 'QUESTION_TOO_LONG', '问题请控制在 2000 字以内，再重新提交。')
      let config
      try { config = await getConfig() } catch { throw new CourseAnswerError(503, 'AI_CONFIG_INVALID', 'AI 服务配置无效，请联系站点维护者。') }
      if (!config) throw new CourseAnswerError(503, 'AI_NOT_CONFIGURED', 'AI 服务尚未完成服务器配置。')
      const result = await answer({ courseId: payload.courseId, question, config, signal: controller.signal })
      return sendJson(response, 200, result)
    } catch (error) {
      const known = error instanceof CourseAnswerError
      const status = known ? error.status : 500
      // Log only stable codes, never provider bodies, credentials or learner text.
      if (status >= 500) console.warn('course-answer:', known ? error.code : 'INTERNAL_ERROR')
      return sendJson(response, status, { error: known ? error.message : 'AI 助教暂时无法回答，请稍后重试。', code: known ? error.code : 'INTERNAL_ERROR' }, known && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {})
    } finally {
      release?.()
      response.off?.('close', cancel)
    }
  }
}

export function createLearningServer({ distDirectory = resolve(root, 'dist'), documentPath = resolve(root, 'reference', '原始文档.pdf'), profileHandler, ...answerOptions } = {}) {
  const handleAnswer = createCourseAnswerHandler(answerOptions)
  const server = createServer((request, response) => {
    const serve = async () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      if (url.pathname === '/api/course-answer') return handleAnswer(request, response)
      if (url.pathname === '/api/profile' && profileHandler) return profileHandler(request, response)
      if (!['GET', 'HEAD'].includes(request.method)) return sendJson(response, 405, { error: '只支持 GET 或 HEAD 请求' }, { Allow: 'GET, HEAD' })
      if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: '接口不存在。' })
      if (url.pathname === '/resources/original-document.pdf') {
        try {
          const document = await readFile(documentPath)
          response.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': document.length, 'Content-Disposition': 'inline; filename="original-document.pdf"' })
          return response.end(request.method === 'HEAD' ? undefined : document)
        } catch { return sendJson(response, 404, { error: '原始文档资源暂不可用。' }) }
      }
      const requested = decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1))
      const path = resolve(distDirectory, requested)
      if (relative(distDirectory, path).startsWith('..')) return sendJson(response, 404, { error: '资源不存在。' })
      let file
      let type = contentTypes[extname(path)] ?? 'application/octet-stream'
      try { file = await readFile(path) } catch {
        if (extname(path)) return sendJson(response, 404, { error: '资源不存在。' })
        file = await readFile(resolve(distDirectory, 'index.html'))
        type = contentTypes['.html']
      }
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': type === contentTypes['.html'] ? 'no-cache' : 'public, max-age=3600' })
      response.end(request.method === 'HEAD' ? undefined : file)
    }
    serve().catch(() => sendJson(response, 500, { error: '站点暂时不可用，请稍后重试。' }))
  })
  server.requestTimeout = 10_000
  return server
}

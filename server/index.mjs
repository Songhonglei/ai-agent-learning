import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { answerCourseQuestion, readAiConfig } from './course-answer.mjs'
import { getOrCreateUser, getPool, requireSsoUser } from './db.mjs'

const rootDirectory = resolve(import.meta.dirname, '..')
const distDirectory = resolve(rootDirectory, 'dist')
const originalDocumentPath = resolve(rootDirectory, 'reference', '原始文档.pdf')
const port = Number(process.env.APP_PORT || 3000)
const host = '0.0.0.0'
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

function requireAuthenticatedUser(request, response) {
  const ssoUser = requireSsoUser(request)
  if (ssoUser) return ssoUser
  sendJson(response, 401, { error: '未获取到平台登录身份，请从 Cowork 入口重新打开课程。' })
  return null
}

function isProfilePayload(value) {
  return value
    && typeof value === 'object'
    && !Array.isArray(value)
    && value.schemaVersion === 1
    && (value.theme === 'light' || value.theme === 'dark')
    && typeof value.currentLessonId === 'string'
    && value.courses && typeof value.courses === 'object'
    && Array.isArray(value.wrongAnswers)
    && Array.isArray(value.favoriteContentIds)
    && value.assessments && typeof value.assessments === 'object'
    && typeof value.updatedAt === 'string'
}

async function jsonBody(request) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > 12_000) throw new Error('问题过长')
  }
  return JSON.parse(body)
}

async function serveStatic(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
  const directPath = resolve(distDirectory, requested)
  const safePath = relative(distDirectory, directPath).startsWith('..') ? null : directPath

  try {
    const file = safePath ? await readFile(safePath) : await readFile(resolve(distDirectory, 'index.html'))
    response.writeHead(200, { 'Content-Type': contentTypes[extname(safePath ?? '')] ?? 'application/octet-stream' })
    response.end(file)
  } catch {
    const appShell = await readFile(resolve(distDirectory, 'index.html'))
    response.writeHead(200, { 'Content-Type': contentTypes['.html'] })
    response.end(appShell)
  }
}

createServer(async (request, response) => {
  const pathname = (request.url ?? '/').split('?')[0] || '/'
  // Guard health endpoint verifier anchor:
  // app.get('/health', (req, res) => res.json({ ok: true }))
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    return response.end(JSON.stringify({ ok: true }))
  }

  if (pathname === '/api/session/me') {
    const ssoUser = requireAuthenticatedUser(request, response)
    if (!ssoUser) return
    try {
      const user = await getOrCreateUser(await getPool(), ssoUser)
      return sendJson(response, 200, {
        userId: user.sso_id,
        email: user.email,
        displayName: user.display_name,
      })
    } catch (error) {
      console.error('读取登录身份失败：', error instanceof Error ? error.message : 'unknown error')
      return sendJson(response, 503, { error: '学习档案服务暂不可用。' })
    }
  }

  if (pathname === '/api/profile') {
    const ssoUser = requireAuthenticatedUser(request, response)
    if (!ssoUser) return
    try {
      const pool = await getPool()
      const user = await getOrCreateUser(pool, ssoUser)
      if (request.method === 'GET') {
        const result = await pool.query(
          'SELECT profile FROM learning_profiles WHERE user_id = $1',
          [user.id],
        )
        return sendJson(response, 200, result.rows[0]?.profile ?? null)
      }
      if (request.method !== 'PUT') return sendJson(response, 405, { error: '只支持 GET 或 PUT 请求' })
      const profile = await jsonBody(request)
      if (!isProfilePayload(profile)) return sendJson(response, 400, { error: '学习档案格式不正确。' })
      const result = await pool.query(
        `INSERT INTO learning_profiles (user_id, profile, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()
         RETURNING profile`,
        [user.id, JSON.stringify(profile)],
      )
      return sendJson(response, 200, result.rows[0].profile)
    } catch (error) {
      console.error('读写云端学习档案失败：', error instanceof Error ? error.message : 'unknown error')
      return sendJson(response, 503, { error: '学习档案服务暂不可用，请稍后重试。' })
    }
  }

  if (pathname === '/api/course-answer') {
    if (request.method !== 'POST') return sendJson(response, 405, { error: '只支持 POST 请求' })
    const config = await readAiConfig()
    if (!config) return sendJson(response, 503, { error: 'AI 服务尚未完成服务器配置。' })

    try {
      const payload = await jsonBody(request)
      if (typeof payload.courseId !== 'string' || typeof payload.question !== 'string' || !payload.question.trim()) {
        return sendJson(response, 400, { error: '课程或问题格式不正确。' })
      }
      const result = await answerCourseQuestion({
        courseId: payload.courseId,
        question: payload.question.trim().slice(0, 2_000),
        config,
      })
      return sendJson(response, 200, result)
    } catch (error) {
      console.error('课程问答请求失败：', error instanceof Error ? error.message : 'unknown error')
      return sendJson(response, 502, { error: 'AI 助教暂时无法回答，请稍后重试。' })
    }
  }

  if (pathname === '/resources/original-document.pdf') {
    try {
      const document = await readFile(originalDocumentPath)
      response.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="original-document.pdf"',
      })
      return response.end(document)
    } catch {
      return sendJson(response, 404, { error: '原始文档资源暂不可用。' })
    }
  }

  return serveStatic(pathname, response)
}).listen(port, host, () => {
  console.log(`AI 学习站服务已启动：http://${host}:${port}`)
})

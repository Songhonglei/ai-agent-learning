import { createHash } from 'node:crypto'
import { isProfilePayload } from '../server/profile.mjs'

const maxProfileBytes = 120_000
const revisionPattern = /^"profile-(?:empty|[a-f0-9]{64})"$/

function sendJson(response, status, payload, headers = {}) {
  if (response.destroyed) return
  response.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
  response.status(status).json(payload)
}

function revision(row) {
  return row ? `"profile-${createHash('sha256').update(row.updated_at).digest('hex')}"` : '"profile-empty"'
}

export function createProfileHandler({ request = (...args) => fetch(...args), timeoutMs = 15_000, now = Date.now } = {}) {
  return async function handler(req, res) {
    if (!['GET', 'PUT'].includes(req.method)) return sendJson(res, 405, { error: '只支持 GET 或 PUT 请求。' }, { Allow: 'GET, PUT' })
    const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
    const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
    if (!url || !key) return sendJson(res, 503, { error: '学习档案服务尚未完成配置。' })
    const authorization = req.headers.authorization
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      return sendJson(res, 401, { error: '请先通过邮箱登录后再同步学习档案。' })
    }

    let profile
    if (req.method === 'PUT') {
      try {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
        if (Buffer.byteLength(raw, 'utf8') > maxProfileBytes) return sendJson(res, 413, { error: '学习档案内容过大。' })
        profile = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      } catch { return sendJson(res, 400, { error: '学习档案格式不正确。' }) }
      if (!isProfilePayload(profile)) return sendJson(res, 400, { error: '学习档案格式不正确。' })
      if (profile.schemaVersion !== 2) return sendJson(res, 409, { error: '请刷新页面后再保存，避免覆盖课程测评记录。' })
      if (!req.headers['if-match']) return sendJson(res, 428, { error: '请刷新页面后再保存学习进度。' })
      if (typeof req.headers['if-match'] !== 'string' || !revisionPattern.test(req.headers['if-match'])) {
        return sendJson(res, 400, { error: '请刷新页面后再保存学习进度。' })
      }
    }

    const controller = new AbortController()
    const cancel = () => { if (!res.writableEnded) controller.abort() }
    res.on?.('close', cancel)
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let onAbort
    try {
      const aborted = new Promise((_, reject) => {
        onAbort = () => reject(new Error('PROFILE_SERVICE_UNAVAILABLE'))
        controller.signal.addEventListener('abort', onAbort, { once: true })
      })
      const operation = async () => {
        const auth = await request(`${url}/auth/v1/user`, {
          headers: { apikey: key, Authorization: authorization }, signal: controller.signal,
        })
        controller.signal.throwIfAborted()
        if ([401, 403].includes(auth.status)) return sendJson(res, 401, { error: '请先通过邮箱登录后再同步学习档案。' })
        if (!auth.ok) throw new Error('PROFILE_AUTH_UNAVAILABLE')
        controller.signal.throwIfAborted()
        const user = await auth.json()
        controller.signal.throwIfAborted()
        if (typeof user?.id !== 'string' || typeof user?.email !== 'string') throw new Error('PROFILE_AUTH_INVALID')

        async function rest(path, init = {}) {
          controller.signal.throwIfAborted()
          const result = await request(`${url}/rest/v1/${path}`, {
            ...init, signal: controller.signal,
            headers: { apikey: key, Authorization: authorization, 'Content-Type': 'application/json', ...init.headers },
          })
          if (!result.ok) throw new Error('PROFILE_REST_UNAVAILABLE')
          controller.signal.throwIfAborted()
          const rows = await result.json()
          controller.signal.throwIfAborted()
          if (!Array.isArray(rows)) throw new Error('PROFILE_REST_INVALID')
          return rows
        }
        const owner = `user_id=eq.${encodeURIComponent(user.id)}`
        // Reads do not write metadata or change the concurrency token.
        const rows = await rest(`learning_profiles?${owner}&select=profile,updated_at&limit=1`)
        const current = rows[0]
        if (current && (typeof current.updated_at !== 'string' || !Number.isFinite(Date.parse(current.updated_at)))) throw new Error('PROFILE_REVISION_INVALID')
        if (req.method === 'GET') return sendJson(res, 200, current?.profile ?? null, { ETag: revision(current) })
        const conflict = () => sendJson(res, 409, { code: 'PROFILE_CONFLICT', error: '其他窗口更新了学习进度，请重试以合并保存。' })
        if (req.headers['if-match'] !== revision(current)) return conflict()
        const displayName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim().slice(0, 60) : ''
        const data = {
          email: user.email.toLowerCase(), display_name: displayName || user.email.split('@')[0].slice(0, 60), profile,
          // Monotonic even for same-millisecond writes or a future database timestamp.
          updated_at: new Date(Math.max(now(), current ? Date.parse(current.updated_at) + 1 : 0)).toISOString(),
        }
        const saved = current
          ? await rest(`learning_profiles?${owner}&updated_at=eq.${encodeURIComponent(current.updated_at)}&select=profile,updated_at`, {
            method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(data),
          })
          : await rest('learning_profiles?on_conflict=user_id&select=profile,updated_at', {
            method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify([{ user_id: user.id, ...data }]),
          })
        // Conditional PATCH / insert-if-absent protects races between read and write.
        if (saved.length === 0) return conflict()
        if (typeof saved[0].updated_at !== 'string' || !saved[0].profile) throw new Error('PROFILE_REST_INVALID')
        if (controller.signal.aborted) return
        return sendJson(res, 200, saved[0].profile, { ETag: revision(saved[0]) })
      }
      await Promise.race([operation(), aborted])
    } catch {
      // Stable diagnostic only: provider exceptions can contain tokens or URLs.
      console.warn('profile-api: SERVICE_UNAVAILABLE')
      return sendJson(res, 503, { error: '学习档案服务暂时不可用，请稍后重试。' })
    } finally {
      clearTimeout(timer)
      controller.signal.removeEventListener('abort', onAbort)
      res.off?.('close', cancel)
    }
  }
}

export default createProfileHandler()

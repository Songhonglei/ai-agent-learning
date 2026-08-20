import { isProfilePayload } from '../server/profile.mjs'

const maxProfileBytes = 120_000

function sendJson(response, status, payload) {
  response.status(status).setHeader('Cache-Control', 'no-store').json(payload)
}

function configured() {
  const url = process.env.SUPABASE_URL?.trim()
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  return url && publishableKey ? { url: url.replace(/\/$/, ''), publishableKey } : null
}

async function requireUser(request, config) {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return null
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      Authorization: authorization,
    },
  })
  if (!response.ok) return null
  const user = await response.json()
  return typeof user?.id === 'string' && typeof user?.email === 'string' ? user : null
}

async function rest(config, accessToken, path, init = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      Authorization: accessToken,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`Supabase REST returned ${response.status}`)
  return response
}

async function upsertAccount(config, user, accessToken) {
  const displayName = typeof user.user_metadata?.display_name === 'string'
    ? user.user_metadata.display_name.trim().slice(0, 60)
    : ''
  await rest(config, accessToken, 'learning_profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{
      user_id: user.id,
      email: user.email.toLowerCase(),
      display_name: displayName || user.email.split('@')[0],
      updated_at: new Date().toISOString(),
    }]),
  })
}

export default async function handler(request, response) {
  const config = configured()
  if (!config) return sendJson(response, 503, { error: '学习档案服务尚未完成配置。' })
  const user = await requireUser(request, config)
  if (!user) return sendJson(response, 401, { error: '请先通过邮箱登录后再同步学习档案。' })
  const accessToken = request.headers.authorization

  try {
    await upsertAccount(config, user, accessToken)
    if (request.method === 'GET') {
      const result = await rest(
        config,
        accessToken,
        `learning_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=profile&limit=1`,
      )
      const rows = await result.json()
      return sendJson(response, 200, rows[0]?.profile ?? null)
    }

    if (request.method !== 'PUT') return sendJson(response, 405, { error: '只支持 GET 或 PUT 请求。' })
    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {})
    if (rawBody.length > maxProfileBytes) return sendJson(response, 413, { error: '学习档案内容过大。' })
    const profile = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    if (!isProfilePayload(profile)) return sendJson(response, 400, { error: '学习档案格式不正确。' })
    const result = await rest(config, accessToken, 'learning_profiles?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([{
        user_id: user.id,
        email: user.email.toLowerCase(),
        display_name: typeof user.user_metadata?.display_name === 'string'
          ? user.user_metadata.display_name.trim().slice(0, 60)
          : user.email.split('@')[0],
        profile,
        updated_at: new Date().toISOString(),
      }]),
    })
    const rows = await result.json()
    return sendJson(response, 200, rows[0]?.profile ?? profile)
  } catch (error) {
    console.error('学习档案读写失败：', error instanceof Error ? error.message : 'unknown error')
    return sendJson(response, 503, { error: '学习档案服务暂时不可用，请稍后重试。' })
  }
}

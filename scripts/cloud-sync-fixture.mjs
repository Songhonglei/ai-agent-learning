// Local-only acceptance harness: actual profile API + in-memory Supabase contract.
// Synthetic accounts and data only; never run this as a production server.
import { createServer } from 'node:http'
import { createProfileHandler } from '../api/profile.mjs'
import { createProfileService } from '../tests/fixtures/profile-service.mjs'

const port = Number(process.env.SYNC_FIXTURE_PORT ?? 3000)
const origin = process.env.SYNC_FIXTURE_ORIGIN ?? 'http://127.0.0.1:5176'
const service = createProfileService()
process.env.SUPABASE_URL = `http://127.0.0.1:${port}`
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture_only'
const handler = createProfileHandler({ request: service.request, timeoutMs: 1500 })
const sessions = new Map()
function sessionFor(email, name) {
  if (sessions.has(email)) return sessions.get(email)
  const id = email === 'other@example.com' ? 'other' : 'learner'
  const user = { id, aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), user_metadata: { display_name: name || '测试学员' }, app_metadata: { provider: 'email', providers: ['email'] }, created_at: '2026-11-01T00:00:00.000Z' }
  const expires = Math.floor(Date.now() / 1000) + 3600
  const access_token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: id, exp: expires, iat: expires - 3600, role: 'authenticated', email })).toString('base64url'), 'fixture-signature'].join('.')
  service.users.set(access_token, user)
  const session = { access_token, token_type: 'bearer', refresh_token: `fixture-${id}`, expires_in: 3600, expires_at: expires, user }
  sessions.set(email, session)
  return session
}
const names = new Map()
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('Content-Type', 'application/json')
  const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
  if (req.method === 'OPTIONS') return send(200, {})
  try {
    const chunks = []
    for await (const chunk of req) { chunks.push(chunk); if (Buffer.concat(chunks).length > 150_000) return send(413, {}) }
    const raw = Buffer.concat(chunks).toString()
    const body = raw ? JSON.parse(raw) : {}
    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    if (url.pathname === '/_test/control' && req.method === 'POST') {
      for (const key of ['failAuth', 'failRest', 'authDelayMs', 'writeDelayMs']) if (key in body) service.control[key] = body[key]
      return send(200, { ...service.control, beforeWrite: undefined })
    }
    if (url.pathname === '/_test/state') return send(200, Object.fromEntries(service.records))
    if (url.pathname === '/auth/v1/otp') { names.set(body.email, body.data?.display_name); return send(200, {}) }
    if (url.pathname === '/auth/v1/verify') {
      if (!['learner@example.com', 'other@example.com'].includes(body.email) || body.token !== '123456') return send(400, { msg: '仅限本地测试账号与验证码123456' })
      return send(200, sessionFor(body.email, names.get(body.email)))
    }
    if (url.pathname === '/auth/v1/logout') return send(200, {})
    if (url.pathname === '/auth/v1/token') {
      const session = [...sessions.values()].find((item) => item.refresh_token === body.refresh_token)
      return send(session ? 200 : 401, session ?? {})
    }
    if (url.pathname === '/auth/v1/user') {
      const user = service.users.get(req.headers.authorization?.replace(/^Bearer /, ''))
      return send(user ? 200 : 401, user ?? {})
    }
    if (url.pathname === '/api/profile') {
      req.body = raw
      res.status = (status) => { res.statusCode = status; return res }
      res.json = (value) => { res.end(JSON.stringify(value)); return res }
      return await handler(req, res)
    }
    return send(404, { error: 'fixture route not found' })
  } catch {
    if (!res.writableEnded && !res.destroyed) send(500, { error: 'fixture error' })
  }
})
server.listen(port, '127.0.0.1', () => console.log(`Synthetic cloud-sync fixture: http://127.0.0.1:${port}; frontend ${origin}`))

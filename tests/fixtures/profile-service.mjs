// In-memory PostgREST contract fixture. No real accounts, network or credentials.
export function createProfileService() {
  const records = new Map()
  const calls = []
  const control = { failAuth: false, failRest: false, authDelayMs: 0, writeDelayMs: 0, beforeWrite: null }
  const users = new Map([
    ['learner-token', { id: 'learner', email: 'learner@example.com', user_metadata: { display_name: '学习者' } }],
    ['other-token', { id: 'other', email: 'other@example.com', user_metadata: {} }],
  ])
  const clone = (value) => structuredClone(value)
  const pause = (ms, signal) => ms ? new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms)
    function done() { signal?.removeEventListener('abort', abort); resolve() }
    function abort() { clearTimeout(timer); reject(new Error('cancelled')) }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
  }) : Promise.resolve()
  async function request(rawUrl, init = {}) {
    const url = new URL(rawUrl)
    calls.push({ url, init })
    const token = init.headers?.Authorization?.replace(/^Bearer /, '')
    const user = users.get(token)
    if (url.pathname.endsWith('/auth/v1/user')) {
      await pause(control.authDelayMs, init.signal)
      if (control.failAuth) throw new Error('provider details must remain private')
      return Response.json(user ?? {}, { status: user ? 200 : 401 })
    }
    if (control.failRest) return Response.json({}, { status: 503 })
    if (!user) return Response.json({}, { status: 401 })
    const owner = url.searchParams.get('user_id')?.replace(/^eq\./, '')
    // Model the RLS ownership boundary for the forwarded learner token.
    if (owner && owner !== user.id) return Response.json([])
    if (!init.method || init.method === 'GET') return Response.json(records.has(user.id) ? [clone(records.get(user.id))] : [])
    await pause(control.writeDelayMs, init.signal)
    if (control.beforeWrite) await control.beforeWrite({ user, url, init })
    if (init.signal?.aborted) throw new Error('cancelled')
    const body = JSON.parse(init.body)
    if (init.method === 'POST') {
      if (body[0].user_id !== user.id || records.has(user.id)) return Response.json([])
      records.set(user.id, clone(body[0]))
    } else if (init.method === 'PATCH') {
      const expected = url.searchParams.get('updated_at')?.replace(/^eq\./, '')
      if (!records.has(user.id) || records.get(user.id).updated_at !== expected) return Response.json([])
      records.set(user.id, { ...records.get(user.id), ...clone(body) })
    } else return Response.json({}, { status: 405 })
    return Response.json([clone(records.get(user.id))])
  }
  return { records, calls, control, users, request }
}

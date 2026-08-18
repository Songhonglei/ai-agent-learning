import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Pool } = pg
const rootDirectory = resolve(import.meta.dirname, '..')

function parseProperties(text) {
  const props = Object.create(null)
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    props[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return props
}

let poolPromise

export async function getPool() {
  if (!poolPromise) {
    poolPromise = readFile(resolve(rootDirectory, 'db.properties'), 'utf8').then((text) => {
      const props = parseProperties(text)
      for (const key of ['db.host', 'db.port', 'db.username', 'db.password', 'db.database']) {
        if (!props[key]) throw new Error(`缺少 ${key}`)
      }
      return new Pool({
        host: props['db.host'],
        port: Number(props['db.port']),
        user: props['db.username'],
        password: props['db.password'],
        database: props['db.database'],
        max: 5,
      })
    })
  }
  return poolPromise
}

export function requireSsoUser(request) {
  const raw = request.headers['decrypted-userinfo']
  if (typeof raw !== 'string' || !raw) return null
  try {
    const user = JSON.parse(Buffer.from(raw, 'latin1').toString('utf8'))
    if (!user || typeof user.userId !== 'string' || !user.userId) return null
    return {
      ssoId: user.userId,
      email: typeof user.email === 'string' ? user.email : '',
      displayName: typeof user.nickname === 'string' ? user.nickname : (typeof user.name === 'string' ? user.name : ''),
    }
  } catch {
    return null
  }
}

export async function getOrCreateUser(pool, user) {
  const result = await pool.query(
    `INSERT INTO learning_users (sso_id, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (sso_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
     RETURNING id, sso_id, email, display_name`,
    [user.ssoId, user.email, user.displayName],
  )
  return result.rows[0]
}

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Pool } = pg
const rootDirectory = resolve(import.meta.dirname, '..')

function parseProperties(text) {
  const properties = Object.create(null)
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    properties[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return properties
}

let poolPromise

export async function getPool() {
  if (!poolPromise) {
    poolPromise = readFile(resolve(rootDirectory, 'db.properties'), 'utf8').then((text) => {
      const properties = parseProperties(text)
      for (const key of ['db.type', 'db.host', 'db.port', 'db.username', 'db.password', 'db.database']) {
        if (!properties[key]) throw new Error(`缺少 ${key}`)
      }
      if (properties['db.type'] !== 'postgresql') throw new Error('db.type 必须是 postgresql')

      return new Pool({
        host: properties['db.host'],
        port: Number(properties['db.port']),
        user: properties['db.username'],
        password: properties['db.password'],
        database: properties['db.database'],
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
    if (!user || typeof user.userId !== 'string' || !user.userId.trim()) return null
    const email = typeof user.email === 'string' ? user.email.trim() : ''
    const displayName = [user.nickname, user.name, user.username]
      .find((value) => typeof value === 'string' && value.trim())

    return {
      ssoId: user.userId.trim(),
      email,
      displayName: typeof displayName === 'string' ? displayName.trim() : '',
    }
  } catch {
    return null
  }
}

export async function getOrCreateUser(pool, user) {
  const result = await pool.query(
    `INSERT INTO learning_users (sso_id, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (sso_id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       updated_at = NOW()
     RETURNING id, sso_id, email, display_name`,
    [user.ssoId, user.email, user.displayName],
  )
  return result.rows[0]
}

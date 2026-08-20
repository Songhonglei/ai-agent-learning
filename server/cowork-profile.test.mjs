import assert from 'node:assert/strict'
import test from 'node:test'
import { getOrCreateUser, requireSsoUser } from './db.mjs'
import { isProfilePayload } from './profile.mjs'

const profile = {
  schemaVersion: 1,
  theme: 'light',
  currentLessonId: '0-1',
  courses: {},
  wrongAnswers: [],
  favoriteContentIds: [],
  assessments: {},
  updatedAt: '2026-08-19T00:00:00.000Z',
}

function ssoRequest(user) {
  const utf8 = Buffer.from(JSON.stringify(user), 'utf8')
  return { headers: { 'decrypted-userinfo': utf8.toString('latin1') } }
}

test('Cowork SSO decodes Chinese identity fields through latin1 to UTF-8', () => {
  const user = requireSsoUser(ssoRequest({
    userId: '123',
    username: 'hongshu',
    nickname: '红叔',
    email: 'hongshu@xiaohongshu.com',
  }))
  assert.deepEqual(user, {
    ssoId: '123',
    email: 'hongshu@xiaohongshu.com',
    displayName: '红叔',
  })
})

test('Cowork SSO fails closed without a platform identity', () => {
  assert.equal(requireSsoUser({ headers: {} }), null)
  assert.equal(requireSsoUser(ssoRequest({ email: 'missing-id@xiaohongshu.com' })), null)
})

test('Cowork SSO accepts username when no display nickname is present', () => {
  const user = requireSsoUser(ssoRequest({
    userId: '456',
    username: 'learner_name',
    email: 'learner@xiaohongshu.com',
  }))
  assert.equal(user.displayName, 'learner_name')
})

test('Cowork user auto-provision upserts current SSO fields', async () => {
  const calls = []
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values })
      return { rows: [{ id: 9, sso_id: values[0], email: values[1], display_name: values[2] }] }
    },
  }
  const result = await getOrCreateUser(pool, {
    ssoId: 'u-9',
    email: 'learner@xiaohongshu.com',
    displayName: '学习者',
  })
  assert.equal(result.sso_id, 'u-9')
  assert.match(calls[0].sql, /ON CONFLICT \(sso_id\) DO UPDATE/)
})

test('shared profile validation accepts the current schema and rejects malformed data', () => {
  assert.equal(isProfilePayload(profile), true)
  assert.equal(isProfilePayload({ ...profile, schemaVersion: 2 }), false)
  assert.equal(isProfilePayload({ ...profile, favoriteContentIds: 'not-an-array' }), false)
})

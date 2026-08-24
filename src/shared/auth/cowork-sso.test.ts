import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCoworkIdentity } from './cowork-sso'

describe('Cowork SSO identity client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the platform identity without a browser token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          internalUser: {
            userId: 'u-123',
            email: 'learner@xiaohongshu.com',
            displayName: '学习者(learner_name)',
            thumbAvatar: 'https://avatar.example.com/learner.png',
          },
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadCoworkIdentity()).resolves.toEqual({
      userId: 'u-123',
      email: 'learner@xiaohongshu.com',
      displayName: '学习者',
      avatarUrl: 'https://avatar.example.com/learner.png',
    })
    expect(fetchMock).toHaveBeenCalledWith('https://edith.xiaohongshu.com/sso/user_info', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('fails closed when Cowork does not provide a valid identity', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    await expect(loadCoworkIdentity()).rejects.toThrow('Cowork SSO 返回 401')
  })
})

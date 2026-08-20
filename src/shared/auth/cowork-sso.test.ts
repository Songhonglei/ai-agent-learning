import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCoworkIdentity } from './cowork-sso'

describe('Cowork SSO identity client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the platform identity without a browser token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        userId: 'u-123',
        email: 'learner@xiaohongshu.com',
        displayName: '学习者',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadCoworkIdentity()).resolves.toEqual({
      userId: 'u-123',
      email: 'learner@xiaohongshu.com',
      displayName: '学习者',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/session/me', {
      headers: { Accept: 'application/json' },
    })
  })

  it('fails closed when Cowork does not provide a valid identity', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    await expect(loadCoworkIdentity()).rejects.toThrow('Cowork SSO 返回 401')
  })
})

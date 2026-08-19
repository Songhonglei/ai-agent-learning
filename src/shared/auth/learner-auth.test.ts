import { afterEach, describe, expect, it, vi } from 'vitest'

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {} })),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient }))

describe('learner auth configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    createClient.mockClear()
  })

  it('disables cloud auth instead of crashing on a malformed project URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    const auth = await import('./learner-auth')

    expect(auth.isLearnerAuthConfigured()).toBe(false)
    expect(createClient).not.toHaveBeenCalled()
  })

  it('creates the client for an HTTPS Supabase project URL', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    const auth = await import('./learner-auth')

    expect(auth.isLearnerAuthConfigured()).toBe(true)
    expect(createClient).toHaveBeenCalledOnce()
  })
})

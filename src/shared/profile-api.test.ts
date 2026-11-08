import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyProfile } from './types/profile'
import { CloudProfileConflict, loadCloudProfile, saveCloudProfile, saveCloudProfileWithMerge } from './profile-api'

const revision = (char: string) => `"profile-${char.repeat(64)}"`
function response(profile: unknown, etag = revision('a'), status = 200) {
  return Response.json(profile, { status, headers: { ETag: etag } })
}
afterEach(() => vi.unstubAllGlobals())

describe('cloud profile API and automatic merge', () => {
  it('keeps revision metadata out of learning records and exported data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(null, '"profile-empty"')))
    const loaded = await loadCloudProfile('learner')
    expect(loaded.revision).toBe('"profile-empty"')
    expect(loaded.profile.schemaVersion).toBe(2)
    expect(loaded.profile).not.toHaveProperty('revision')
    expect(loaded.profile).not.toHaveProperty('etag')
  })

  it('sends a conditional write, never an unconditional overwrite', async () => {
    const profile = createEmptyProfile()
    const request = vi.fn().mockResolvedValue(response(profile, revision('b')))
    vi.stubGlobal('fetch', request)
    const saved = await saveCloudProfile(profile, 'learner', revision('a'))
    expect(saved.revision).toBe(revision('b'))
    expect(request.mock.calls[0][1].headers).toMatchObject({ 'If-Match': revision('a'), Authorization: 'Bearer learner' })
  })

  it('merges different lessons, same-lesson answers and favorite removals after a conflict', async () => {
    const base = createEmptyProfile()
    base.favoriteContentIds = ['remove-me']
    const requested = structuredClone(base)
    requested.courses['0-1'].answers.one = 'a'
    requested.favoriteContentIds = ['local']
    const remote = structuredClone(base)
    remote.courses['0-1'].answers.two = 'b'
    remote.courses['0-2'].completedStepIds = ['remote-step']
    remote.favoriteContentIds.push('remote')
    const request = vi.fn()
      .mockResolvedValueOnce(response({ code: 'PROFILE_CONFLICT' }, revision('a'), 409))
      .mockResolvedValueOnce(response(remote, revision('b')))
      .mockImplementationOnce(async (_url, init) => response(JSON.parse(init.body), revision('c')))
    vi.stubGlobal('fetch', request)
    const result = await saveCloudProfileWithMerge({ profile: base, revision: revision('a') }, base, requested, 'learner')
    expect(result.merged).toBe(true)
    expect(result.profile.courses['0-1'].answers).toEqual({ one: 'a', two: 'b' })
    expect(result.profile.courses['0-2'].completedStepIds).toEqual(['remote-step'])
    expect(result.profile.favoriteContentIds).toEqual(['remote', 'local'])
    expect(request.mock.calls[2][1].headers['If-Match']).toBe(revision('b'))
  })

  it('keeps the canonical choice for competing changes to the same answer', async () => {
    const base = createEmptyProfile(), requested = createEmptyProfile(), remote = createEmptyProfile()
    base.courses['0-1'].answers.q = 'a'
    requested.courses['0-1'].answers.q = 'b'
    remote.courses['0-1'].answers.q = 'c'
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, init) => response(JSON.parse(init.body), revision('b'))))
    const saved = await saveCloudProfileWithMerge({ profile: remote, revision: revision('a') }, base, requested, 'learner')
    expect(saved.profile.courses['0-1'].answers.q).toBe('c')
  })

  it('bounds repeated conflict retries, preserves cancellation and does not retry service outages', async () => {
    const base = createEmptyProfile()
    const request = vi.fn().mockImplementation(async (_url, init) => init.method === 'PUT'
      ? response({ code: 'PROFILE_CONFLICT' }, revision('a'), 409) : response(base))
    vi.stubGlobal('fetch', request)
    await expect(saveCloudProfileWithMerge({ profile: base, revision: revision('a') }, base, base, 'learner')).rejects.toBeInstanceOf(CloudProfileConflict)
    expect(request).toHaveBeenCalledTimes(5)
    request.mockClear().mockResolvedValue(response({ error: 'unavailable' }, revision('a'), 503))
    await expect(saveCloudProfileWithMerge({ profile: base, revision: revision('a') }, base, base, 'learner')).rejects.toThrow()
    expect(request).toHaveBeenCalledTimes(1)
    request.mockClear()
    const controller = new AbortController(); controller.abort()
    await expect(saveCloudProfileWithMerge({ profile: base, revision: revision('a') }, base, base, 'learner', controller.signal)).rejects.toThrow()
    expect(request).not.toHaveBeenCalled()
  })

  it('refuses responses without a usable concurrency token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(createEmptyProfile())))
    await expect(loadCloudProfile('learner')).rejects.toThrow('请刷新后重试')
  })
})

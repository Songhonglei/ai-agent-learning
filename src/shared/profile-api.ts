import { projectLearningProfile } from './storage/learningProfile'
import { createEmptyProfile, type LearningProfile } from './types/profile'
import { appPath } from './runtime/app-path'
import { mergeStaleProfileUpdate } from './profile-sync-merge'

export interface CloudProfileSnapshot {
  profile: LearningProfile
  revision: string
  merged?: boolean
}

export class CloudProfileConflict extends Error {}

async function requestProfile(accessToken?: string, init?: RequestInit): Promise<CloudProfileSnapshot> {
  const timeout = AbortSignal.timeout(20_000)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  const response = await fetch(appPath('/api/profile'), {
    ...init, signal,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (response.status === 409 && (await response.json()).code === 'PROFILE_CONFLICT') throw new CloudProfileConflict()
  if (!response.ok) throw new Error('学习进度暂时未能保存，请稍后重试。')
  const payload: unknown = await response.json()
  const profile = payload === null && !init?.method ? createEmptyProfile() : projectLearningProfile(payload)
  const revision = response.headers.get('ETag')
  if (!profile || !revision || !/^"profile-(?:empty|[a-f0-9]{64})"$/.test(revision)) throw new Error('学习档案暂时无法读取，请刷新后重试。')
  return { profile, revision }
}

export async function loadCloudProfile(accessToken?: string, signal?: AbortSignal): Promise<CloudProfileSnapshot> {
  return requestProfile(accessToken, { signal })
}

export async function saveCloudProfile(profile: LearningProfile, accessToken: string | undefined, revision: string, signal?: AbortSignal): Promise<CloudProfileSnapshot> {
  const candidate = projectLearningProfile(profile)
  if (!candidate) throw new Error('学习档案格式不正确')
  return requestProfile(accessToken, { method: 'PUT', body: JSON.stringify(candidate), headers: { 'If-Match': revision }, signal })
}

// Each account/storage session owns its snapshot. Never share revisions across accounts.
export async function saveCloudProfileWithMerge(
  snapshot: CloudProfileSnapshot, base: LearningProfile, requested: LearningProfile,
  accessToken: string | undefined, signal?: AbortSignal,
): Promise<CloudProfileSnapshot> {
  const deadline = AbortSignal.timeout(30_000)
  signal = signal ? AbortSignal.any([signal, deadline]) : deadline
  let latest = snapshot
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal?.throwIfAborted()
    const candidate = mergeStaleProfileUpdate(latest.profile, base, requested)
    try {
      const saved = await saveCloudProfile(candidate, accessToken, latest.revision, signal)
      return { ...saved, merged: attempt > 0 }
    } catch (error) {
      if (!(error instanceof CloudProfileConflict) || attempt === 2) throw error
      latest = await loadCloudProfile(accessToken, signal)
    }
  }
  throw new Error('其他窗口仍在保存，请稍后重试。')
}

export const emptyCloudProfile = createEmptyProfile

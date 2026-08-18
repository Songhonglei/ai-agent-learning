import { projectLearningProfile } from './storage/learningProfile'
import { createEmptyProfile, type LearningProfile } from './types/profile'
import { appPath } from './runtime/app-path'

async function requestProfile(init?: RequestInit): Promise<LearningProfile> {
  const response = await fetch(appPath('/api/profile'), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) throw new Error(`学习档案服务返回 ${response.status}`)
  const payload: unknown = await response.json()
  if (payload === null && !init) return createEmptyProfile()
  const profile = projectLearningProfile(payload)
  if (!profile) throw new Error('学习档案服务返回了无效数据')
  return profile
}

export async function loadCloudProfile(): Promise<LearningProfile> {
  return requestProfile()
}

export async function saveCloudProfile(profile: LearningProfile): Promise<LearningProfile> {
  const candidate = projectLearningProfile(profile)
  if (!candidate) throw new Error('学习档案格式不正确')
  return requestProfile({ method: 'PUT', body: JSON.stringify(candidate) })
}

export const emptyCloudProfile = createEmptyProfile

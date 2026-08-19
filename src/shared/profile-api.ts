import { projectLearningProfile } from './storage/learningProfile'
import { createEmptyProfile, type LearningProfile } from './types/profile'
import { appPath } from './runtime/app-path'

async function requestProfile(accessToken?: string, init?: RequestInit): Promise<LearningProfile> {
  const response = await fetch(appPath('/api/profile'), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`学习档案服务返回 ${response.status}`)
  const payload: unknown = await response.json()
  if (payload === null && !init) return createEmptyProfile()
  const profile = projectLearningProfile(payload)
  if (!profile) throw new Error('学习档案服务返回了无效数据')
  return profile
}

export async function loadCloudProfile(accessToken?: string): Promise<LearningProfile> {
  return requestProfile(accessToken)
}

export async function saveCloudProfile(profile: LearningProfile, accessToken?: string): Promise<LearningProfile> {
  const candidate = projectLearningProfile(profile)
  if (!candidate) throw new Error('学习档案格式不正确')
  return requestProfile(accessToken, { method: 'PUT', body: JSON.stringify(candidate) })
}

export const emptyCloudProfile = createEmptyProfile

export interface CoworkIdentity {
  userId: string
  email: string
  displayName: string
  avatarUrl: string
}

interface CoworkUserInfoResponse {
  data?: {
    internalUser?: {
      userId?: unknown
      email?: unknown
      displayName?: unknown
      thumbAvatar?: unknown
    }
  }
}

function cleanDisplayName(value: string): string {
  const parenthesisIndex = value.lastIndexOf('(')
  return (parenthesisIndex > 0 ? value.slice(0, parenthesisIndex) : value).trim()
}

export async function loadCoworkIdentity(): Promise<CoworkIdentity> {
  const response = await fetch('https://edith.xiaohongshu.com/sso/user_info', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error(`Cowork SSO 返回 ${response.status}`)

  const value = await response.json() as CoworkUserInfoResponse
  const user = value?.data?.internalUser
  if (!user || typeof user.userId !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string') {
    throw new Error('Cowork SSO 返回了无效身份')
  }

  return {
    userId: user.userId.trim(),
    email: user.email.trim(),
    displayName: cleanDisplayName(user.displayName),
    avatarUrl: typeof user.thumbAvatar === 'string' ? user.thumbAvatar.trim() : '',
  }
}

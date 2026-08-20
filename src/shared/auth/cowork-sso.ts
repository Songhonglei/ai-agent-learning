import { appPath } from '../runtime/app-path'

export interface CoworkIdentity {
  userId: string
  email: string
  displayName: string
}

export async function loadCoworkIdentity(): Promise<CoworkIdentity> {
  const response = await fetch(appPath('/api/session/me'), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Cowork SSO 返回 ${response.status}`)

  const value: unknown = await response.json()
  if (
    !value
    || typeof value !== 'object'
    || typeof (value as CoworkIdentity).userId !== 'string'
    || typeof (value as CoworkIdentity).email !== 'string'
    || typeof (value as CoworkIdentity).displayName !== 'string'
  ) {
    throw new Error('Cowork SSO 返回了无效身份')
  }
  return value as CoworkIdentity
}

import { createClient, type Session } from '@supabase/supabase-js'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

function createLearnerClient() {
  if (!projectUrl || !publishableKey) return null
  try {
    const url = new URL(projectUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return createClient(url.toString(), publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  } catch {
    return null
  }
}

const client = createLearnerClient()

export interface LearnerIdentity {
  accessToken: string
  email: string
  displayName: string
}

function identityFromSession(session: Session | null): LearnerIdentity | null {
  if (!session?.user.email) return null
  const displayName = typeof session.user.user_metadata.display_name === 'string'
    ? session.user.user_metadata.display_name.trim()
    : ''
  return {
    accessToken: session.access_token,
    email: session.user.email,
    displayName,
  }
}

export function isLearnerAuthConfigured(): boolean {
  return client !== null
}

export async function getLearnerIdentity(): Promise<LearnerIdentity | null> {
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return identityFromSession(data.session)
}

export function subscribeLearnerIdentity(callback: (identity: LearnerIdentity | null) => void): () => void {
  if (!client) return () => undefined
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(identityFromSession(session)))
  return () => data.subscription.unsubscribe()
}

export async function sendLearnerOtp(displayName: string, email: string): Promise<void> {
  if (!client) throw new Error('学习档案服务尚未配置')
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { display_name: displayName },
    },
  })
  if (error) throw error
}

export async function verifyLearnerOtp(email: string, token: string): Promise<LearnerIdentity> {
  if (!client) throw new Error('学习档案服务尚未配置')
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  const identity = identityFromSession(data.session)
  if (!identity) throw new Error('验证码已通过，但未能建立登录会话')
  return identity
}

export async function signOutLearner(): Promise<void> {
  if (!client) return
  const { error } = await client.auth.signOut()
  if (error) throw error
}

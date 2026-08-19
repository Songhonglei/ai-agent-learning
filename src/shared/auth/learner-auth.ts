import { createClient, type Session } from '@supabase/supabase-js'
import { appPath } from '../runtime/app-path'

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const client = projectUrl && publishableKey
  ? createClient(projectUrl, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null

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

export async function sendLearnerMagicLink(displayName: string, email: string): Promise<void> {
  if (!client) throw new Error('学习档案服务尚未配置')
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}${appPath('/')}`,
      data: { display_name: displayName },
    },
  })
  if (error) throw error
}

export async function signOutLearner(): Promise<void> {
  if (!client) return
  const { error } = await client.auth.signOut()
  if (error) throw error
}

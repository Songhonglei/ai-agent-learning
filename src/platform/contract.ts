export type DeploymentTarget = 'internet' | 'cowork'

export interface DeploymentCapabilities {
  target: DeploymentTarget
  authentication: 'email-otp-or-guest' | 'cowork-sso'
  profilePersistence: 'local-or-supabase' | 'cowork-postgres'
  guestLearning: boolean
  guestAiQuestions: boolean
  localProfileFallback: boolean
}

export const internetCapabilities: DeploymentCapabilities = {
  target: 'internet',
  authentication: 'email-otp-or-guest',
  profilePersistence: 'local-or-supabase',
  guestLearning: true,
  guestAiQuestions: true,
  localProfileFallback: true,
}

export const coworkCapabilities: DeploymentCapabilities = {
  target: 'cowork',
  authentication: 'cowork-sso',
  profilePersistence: 'cowork-postgres',
  guestLearning: false,
  guestAiQuestions: false,
  localProfileFallback: false,
}

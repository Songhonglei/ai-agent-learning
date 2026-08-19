import { afterEach, describe, expect, it } from 'vitest'
import { appPath, deploymentBasePath } from './app-path'

describe('mounted deployment paths', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('keeps routes and API requests under a mounted app alias', () => {
    window.history.replaceState({}, '', '/s/learning-app/lesson/1-1')

    expect(deploymentBasePath()).toBe('/s/learning-app')
    expect(appPath('/')).toBe('/s/learning-app/')
    expect(appPath('/lesson/1-1')).toBe('/s/learning-app/lesson/1-1')
    expect(appPath('/api/profile')).toBe('/s/learning-app/api/profile')
  })

  it('keeps local development paths unchanged', () => {
    window.history.replaceState({}, '', '/lesson/1-1')
    expect(deploymentBasePath()).toBe('')
    expect(appPath('/profile')).toBe('/profile')
  })
})
